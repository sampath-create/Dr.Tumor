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
    doctor_id: str
    date_time: datetime
    symptoms: str

class Appointment(AppointmentCreate):
    id: str
    patient_id: str
    status: AppointmentStatus = AppointmentStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.utcnow)
