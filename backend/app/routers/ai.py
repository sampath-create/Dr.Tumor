from fastapi import APIRouter, File, UploadFile
from pydantic import BaseModel
from typing import List, Optional
import random
import httpx
from app.core.config import settings

router = APIRouter()

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

@router.post("/chatbot")
async def chatbot(request: ChatRequest):
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
                "parts": [{"text": msg.content}]
            })
        
        # Add current message
        contents.append({
            "role": "user",
            "parts": [{"text": request.message}]
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
                return {"response": get_fallback_response(request.message)}
            
            data = response.json()
            
            # Extract the response text
            if "candidates" in data and len(data["candidates"]) > 0:
                candidate = data["candidates"][0]
                if "content" in candidate and "parts" in candidate["content"]:
                    ai_response = candidate["content"]["parts"][0].get("text", "")
                    return {"response": ai_response}
            
            # Fallback if response format is unexpected
            return {"response": get_fallback_response(request.message)}
            
    except httpx.TimeoutException:
        return {"response": get_fallback_response(request.message)}
    except Exception as e:
        print(f"Chatbot error: {str(e)}")
        return {"response": get_fallback_response(request.message)}

@router.post("/analyze-image")
async def analyze_medical_image(file: UploadFile = File(...)):
    """
    Placeholder for Vision-Language Model (VLM) integration.
    In a real system, this would call a model like Med-PaLM 2, Llava, or GPT-4V.
    """
    # Simulate processing time
    
    # Mock response based on filename or random
    conditions = ["Normal", "Pneumonia", "Fracture", "Tumor Detected"]
    result = random.choice(conditions)
    
    return {
        "filename": file.filename,
        "classification": result,
        "confidence": 0.95,
        "segmentation_mask_url": "http://placeholder-url/mask.png",
        "description": f"The scan shows indications of {result}. Use clinical correlation."
    }
