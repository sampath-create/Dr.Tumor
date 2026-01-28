from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List
from enum import Enum
from datetime import datetime

class UserRole(str, Enum):
    PATIENT = "patient"
    DOCTOR = "doctor"
    LAB_TECHNICIAN = "lab_technician"
    PHARMACY = "pharmacy"
    ADMIN = "admin"

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole
    # Patient specific fields
    gender: Optional[str] = None
    height: Optional[str] = None
    weight: Optional[str] = None
    sleep_routine: Optional[str] = None
    # Staff verification
    verification_document: Optional[str] = None
    is_verified: bool = False

class UserCreate(UserBase):
    password: str

class UserInDB(UserBase):
    id: Optional[str] = Field(alias="_id", default=None)
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

class UserResponse(UserBase):
    id: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None
