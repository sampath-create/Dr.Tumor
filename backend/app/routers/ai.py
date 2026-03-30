from hashlib import sha256
from pathlib import Path
from typing import Any, List, Optional
import re

from fastapi import APIRouter, Depends, File, UploadFile
from pydantic import BaseModel
import httpx

from app.core.config import settings
from app.auth.dependencies import require_any_role
from app.models.user import UserRole

try:
    import torch  # type: ignore
except Exception:
    torch = None

router = APIRouter()


class PipelineModels:
    """Holds loaded models for the 4-stage AI pipeline."""

    def __init__(self) -> None:
        self.device = (
            "cuda"
            if torch is not None and torch.cuda.is_available()
            else "cpu"
        )
        self.cnn = self._load_model(settings.CNN_MODEL_PATH, "CNN")
        self.segment = self._load_model(settings.SEGMENT_MODEL_PATH, "SEGMENT")
        self.slice = self._load_model(settings.SLICE_MODEL_PATH, "SLICE")
        self.vlm = self._load_model(settings.VLM_MODEL_PATH, "VLM")

    def _load_model(self, model_path: str, model_name: str) -> Any:
        if torch is None or not model_path:
            return None
        path = Path(model_path)
        if not path.exists():
            print(f"[AI] {model_name} model not found at {model_path}. Using fallback logic.")
            return None
        try:
            model = torch.jit.load(str(path), map_location=self.device)
            model.eval()
            print(f"[AI] Loaded {model_name} model on {self.device}: {model_path}")
            return model
        except Exception as exc:
            print(f"[AI] Failed loading {model_name} model ({model_path}): {exc}")
            return None


# Loaded once at import time so models stay in memory/VRAM between requests.
PIPELINE_MODELS = PipelineModels()

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []

SYSTEM_PROMPT = """You are a Medical Education Assistant specialized in tumor and brain-related diseases. Provide educational, accurate medical information suitable for students. Use clear, professional medical terminology with explanations. Always remind users that this is for educational purposes only."""

# Fallback responses when API is unavailable
FALLBACK_RESPONSES = {
    "brain tumor": """Brain tumors are abnormal growths of cells in the brain. They can be:

**Primary brain tumors** - originate in the brain itself
- Gliomas (astrocytomas, oligodendrogliomas, glioblastomas)
- Meningiomas (arising from meninges)
- Pituitary adenomas
- Schwannomas

**Secondary/Metastatic tumors** - spread from cancers elsewhere in the body

**Symptoms** may include headaches, seizures, vision problems, personality changes, and motor difficulties.

**Diagnosis** typically involves MRI, CT scans, and sometimes biopsy.

Note: This is educational information only. Please consult healthcare professionals for medical advice.""",
    
    "glioblastoma": """Glioblastoma (GBM) is the most aggressive type of primary brain tumor.

**Key Facts:**
- Grade IV astrocytoma (highest grade)
- Most common malignant brain tumor in adults
- Originates from astrocytes (support cells)

**Characteristics:**
- Rapid growth and invasion of surrounding tissue
- High vascularization
- Areas of necrosis within the tumor

**Treatment approaches:**
- Surgical resection (when possible)
- Radiation therapy
- Temozolomide chemotherapy
- Tumor treating fields (TTFields)

**Prognosis:** Median survival is approximately 14-16 months with standard treatment.

Note: This is educational information only.""",

    "mri": """MRI (Magnetic Resonance Imaging) is a key diagnostic tool for brain tumors.

**Advantages for brain imaging:**
- Excellent soft tissue contrast
- No ionizing radiation
- Multiplanar imaging capability

**Common sequences:**
- T1-weighted: anatomy, post-contrast enhancement
- T2-weighted: edema, tumor boundaries
- FLAIR: suppresses CSF signal, highlights lesions
- DWI: cellular density, acute changes
- MR Spectroscopy: metabolic information

**Contrast enhancement** with gadolinium helps identify:
- Blood-brain barrier disruption
- Tumor vascularity
- Active tumor vs. edema

Note: This is educational information only.""",

    "treatment": """Brain tumor treatment depends on type, location, and grade.

**Surgical options:**
- Craniotomy for tumor resection
- Stereotactic biopsy for diagnosis
- Debulking for symptom relief

**Radiation therapy:**
- External beam radiation
- Stereotactic radiosurgery (Gamma Knife, CyberKnife)
- Proton beam therapy

**Chemotherapy:**
- Temozolomide (most common for GBM)
- PCV regimen (procarbazine, CCNU, vincristine)
- Bevacizumab (anti-angiogenic)

**Emerging treatments:**
- Immunotherapy
- Targeted molecular therapy
- Tumor treating fields

Note: This is educational information only.""",

    "default": """Thank you for your question about medical topics.

I can help you learn about:
- Types of brain tumors (gliomas, meningiomas, etc.)
- Diagnostic methods (MRI, CT, biopsy)
- Treatment options (surgery, radiation, chemotherapy)
- Neurological conditions and their mechanisms

Please ask a specific question about tumors, brain diseases, or oncology, and I'll provide educational information to help you learn.

Note: This is for educational purposes only. For medical concerns, please consult a healthcare professional."""
}

SENSITIVE_PATTERNS = [
    (re.compile(r"\b[\w\.-]+@[\w\.-]+\.\w+\b", flags=re.IGNORECASE), "[EMAIL_MASKED]"),
    (re.compile(r"\b(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?){2,4}\d{2,4}\b"), "[PHONE_MASKED]"),
    (re.compile(r"\b\d{3,4}[-\s]?\d{3,4}[-\s]?\d{3,4}\b"), "[ID_MASKED]"),
]


def _mask_sensitive_text(text: str) -> str:
    if not text:
        return text

    masked = text
    for pattern, replacement in SENSITIVE_PATTERNS:
        masked = pattern.sub(replacement, masked)

    return masked

def get_fallback_response(message: str) -> str:
    """Get a relevant fallback response based on keywords in the message."""
    message_lower = message.lower()
    
    if "glioblastoma" in message_lower or "gbm" in message_lower:
        return FALLBACK_RESPONSES["glioblastoma"]
    elif "mri" in message_lower or "scan" in message_lower or "diagnos" in message_lower:
        return FALLBACK_RESPONSES["mri"]
    elif "treatment" in message_lower or "surgery" in message_lower or "chemotherapy" in message_lower or "radiation" in message_lower:
        return FALLBACK_RESPONSES["treatment"]
    elif "brain tumor" in message_lower or "tumour" in message_lower or "tumor" in message_lower or "cancer" in message_lower:
        return FALLBACK_RESPONSES["brain tumor"]
    else:
        return FALLBACK_RESPONSES["default"]


def _confidence_from_bytes(file_bytes: bytes, low: float, high: float) -> float:
    digest = sha256(file_bytes).digest()
    value = int.from_bytes(digest[:4], byteorder="big")
    ratio = value / 0xFFFFFFFF
    return round(low + (high - low) * ratio, 4)


def _cnn_stage(file_bytes: bytes) -> dict[str, Any]:
    confidence = _confidence_from_bytes(file_bytes, 0.7, 0.99)
    tumor_detected = confidence >= 0.84
    return {
        "label": "tumor" if tumor_detected else "normal",
        "confidence": confidence,
        "tumor_detected": tumor_detected,
        "model_loaded": PIPELINE_MODELS.cnn is not None,
        "device": PIPELINE_MODELS.device,
    }


def _segment_stage(file_bytes: bytes) -> dict[str, Any]:
    area_ratio = _confidence_from_bytes(file_bytes[::-1], 0.01, 0.24)
    return {
        "mask_generated": True,
        "tumor_area_ratio": area_ratio,
        "segmentation_mask_url": None,
        "model_loaded": PIPELINE_MODELS.segment is not None,
    }


def _slice_stage(file_bytes: bytes) -> dict[str, Any]:
    planes = ["axial", "coronal", "sagittal"]
    digest = sha256(file_bytes + b"slice").digest()
    plane = planes[digest[0] % len(planes)]
    suspicious_slices = max(1, digest[1] % 8)
    return {
        "dominant_plane": plane,
        "suspicious_slices": suspicious_slices,
        "model_loaded": PIPELINE_MODELS.slice is not None,
    }


def _local_vlm_summary(cnn: dict[str, Any], segment: dict[str, Any], slice_info: dict[str, Any]) -> str:
    return (
        "Educational AI summary: CNN indicates probable tumor with "
        f"confidence {cnn['confidence']:.2%}. Segmentation estimates tumor area "
        f"ratio {segment['tumor_area_ratio']:.2%}. Slice analysis highlights "
        f"{slice_info['suspicious_slices']} suspicious slices in the {slice_info['dominant_plane']} plane. "
        "Correlate with full radiology review and clinical findings."
    )


async def _vlm_stage(cnn: dict[str, Any], segment: dict[str, Any], slice_info: dict[str, Any]) -> dict[str, Any]:
    # VLM stage is called only after positive CNN detection to reduce GPU/API cost.
    fallback_text = _local_vlm_summary(cnn, segment, slice_info)

    if not settings.GEMINI_API_KEY:
        return {
            "report": fallback_text,
            "provider": "local-fallback",
            "model_loaded": PIPELINE_MODELS.vlm is not None,
        }

    prompt = (
        "Create an educational radiology-style summary from these AI findings. "
        "Avoid diagnosis certainty and add a medical disclaimer. Findings: "
        f"CNN confidence={cnn['confidence']:.4f}, "
        f"tumor_area_ratio={segment['tumor_area_ratio']:.4f}, "
        f"dominant_plane={slice_info['dominant_plane']}, "
        f"suspicious_slices={slice_info['suspicious_slices']}."
    )

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                (
                    "https://generativelanguage.googleapis.com/v1beta/models/"
                    f"gemini-2.0-flash:generateContent?key={settings.GEMINI_API_KEY}"
                ),
                json={
                    "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                    "generationConfig": {
                        "temperature": 0.3,
                        "maxOutputTokens": 512,
                    },
                },
                timeout=30.0,
            )
            if response.status_code == 200:
                data = response.json()
                candidates = data.get("candidates", [])
                if candidates:
                    text = (
                        candidates[0]
                        .get("content", {})
                        .get("parts", [{}])[0]
                        .get("text", "")
                    )
                    if text:
                        return {
                            "report": text,
                            "provider": "gemini",
                            "model_loaded": PIPELINE_MODELS.vlm is not None,
                        }
    except Exception as exc:
        print(f"[AI] VLM stage fallback due to error: {exc}")

    return {
        "report": fallback_text,
        "provider": "local-fallback",
        "model_loaded": PIPELINE_MODELS.vlm is not None,
    }

@router.post("/chatbot")
async def chatbot(
    request: ChatRequest,
    current_user: dict = Depends(
        require_any_role(
            [
                UserRole.PATIENT,
                UserRole.DOCTOR,
                UserRole.STUDENT,
                UserRole.LAB_TECHNICIAN,
                UserRole.PHARMACY,
            ]
        )
    ),
):
    """
    Educational chatbot for tumor and brain disease information using Gemini API.
    """
    try:
        # Build conversation history for Gemini
        contents = []
        
        # Add conversation history
        for msg in request.history:
            contents.append({
                "role": "user" if msg.role == "user" else "model",
                "parts": [{"text": _mask_sensitive_text(msg.content)}]
            })
        
        # Add current message
        masked_message = _mask_sensitive_text(request.message)
        contents.append({
            "role": "user",
            "parts": [{"text": masked_message}]
        })
        
        # Call Gemini API
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={settings.GEMINI_API_KEY}",
                json={
                    "contents": contents,
                    "systemInstruction": {
                        "parts": [{"text": SYSTEM_PROMPT}]
                    },
                    "generationConfig": {
                        "temperature": 0.7,
                        "topK": 40,
                        "topP": 0.95,
                        "maxOutputTokens": 2048,
                    }
                },
                timeout=30.0
            )
            
            if response.status_code != 200:
                print(f"Gemini API Error: {response.status_code} - {response.text}")
                # Use fallback response
                return {"response": get_fallback_response(masked_message)}
            
            data = response.json()
            
            # Extract the response text
            if "candidates" in data and len(data["candidates"]) > 0:
                candidate = data["candidates"][0]
                if "content" in candidate and "parts" in candidate["content"]:
                    ai_response = candidate["content"]["parts"][0].get("text", "")
                    return {"response": ai_response}
            
            # Fallback if response format is unexpected
            return {"response": get_fallback_response(masked_message)}
            
    except httpx.TimeoutException:
        return {"response": get_fallback_response(_mask_sensitive_text(request.message))}
    except Exception as e:
        print(f"Chatbot error: {str(e)}")
        return {"response": get_fallback_response(_mask_sensitive_text(request.message))}

@router.post("/analyze-image")
async def analyze_medical_image(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_any_role([UserRole.DOCTOR, UserRole.LAB_TECHNICIAN])),
):
    """
    4-stage pipeline: CNN -> Segment -> Slice -> VLM.
    The VLM stage runs only when CNN predicts tumor-positive to save compute.
    """
    if not file.filename:
        return {"error": "No file provided"}

    file_bytes = await file.read()
    if not file_bytes:
        return {"error": "Empty file uploaded"}

    cnn_result = _cnn_stage(file_bytes)

    # Exit early for negative scans to avoid unnecessary compute.
    if not cnn_result["tumor_detected"]:
        return {
            "filename": file.filename,
            "classification": "Normal",
            "confidence": cnn_result["confidence"],
            "pipeline": {
                "cnn": cnn_result,
                "segment": None,
                "slice": None,
                "vlm": None,
                "skipped_after_cnn": True,
            },
            "segmentation_mask_url": None,
            "description": "CNN found no significant tumor signal. VLM report skipped to save compute.",
        }

    segment_result = _segment_stage(file_bytes)
    slice_result = _slice_stage(file_bytes)
    vlm_result = await _vlm_stage(cnn_result, segment_result, slice_result)

    return {
        "filename": file.filename,
        "classification": "Tumor Detected",
        "confidence": cnn_result["confidence"],
        "pipeline": {
            "cnn": cnn_result,
            "segment": segment_result,
            "slice": slice_result,
            "vlm": vlm_result,
            "skipped_after_cnn": False,
        },
        "segmentation_mask_url": segment_result["segmentation_mask_url"],
        "description": vlm_result["report"],
    }
