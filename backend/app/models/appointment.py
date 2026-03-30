from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum

class AppointmentStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class AppointmentCreate(BaseModel):
    doctor_id: Optional[str] = None
    date_time: datetime
    symptoms: str

class Appointment(AppointmentCreate):
    id: str
    patient_id: str
    doctor_id: Optional[str] = None
    doctor_name: Optional[str] = None
    status: AppointmentStatus = AppointmentStatus.PENDING
    rejected_doctor_ids: list[str] = Field(default_factory=list)
    mandatory_for_current_doctor: bool = False
    mandatory_message: Optional[str] = None
    accepted_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
