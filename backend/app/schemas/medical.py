from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class PrescriptionItem(BaseModel):
    medicine_name: str
    dosage: str
    duration: str
    frequency: str

class PrescriptionCreate(BaseModel):
    appointment_id: str
    patient_id: str
    medications: List[PrescriptionItem]
    notes: Optional[str] = None

class Prescription(PrescriptionCreate):
    id: str
    doctor_id: str
    is_dispensed: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class LabRequestStatus(str, Enum):
    PENDING = "pending"
    SAMPLE_COLLECTED = "sample_collected"
    COMPLETED = "completed"

class LabRequestCreate(BaseModel):
    appointment_id: str
    patient_id: str
    test_type: str # X-Ray, CT, MRI, Blood Test
    notes: Optional[str] = None

class LabReport(BaseModel):
    id: str
    lab_request_id: str
    report_url: Optional[str] = None # Or base64 data
    ai_analysis_result: Optional[Dict[str, Any]] = None 
    technician_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class LabRequest(LabRequestCreate):
    id: str
    doctor_id: str
    status: LabRequestStatus = LabRequestStatus.PENDING
    result_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
