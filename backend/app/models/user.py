import re

from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator
from typing import Optional
from enum import Enum
from datetime import datetime

class UserRole(str, Enum):
	PATIENT = "patient"
	DOCTOR = "doctor"
	LAB_TECHNICIAN = "lab_technician"
	PHARMACY = "pharmacy"
	ADMIN = "admin"
	STUDENT = "student"

class UserBase(BaseModel):
	email: EmailStr
	full_name: str
	role: UserRole
	# Patient specific fields
	gender: Optional[str] = None
	height: Optional[str] = None
	weight: Optional[str] = None
	sleep_routine: Optional[float] = None
	# Staff verification
	verification_document: Optional[str] = None
	is_verified: bool = False
	is_rejected: bool = False
	# Login activity fields for admin monitoring
	last_login_at: Optional[datetime] = None
	last_login_ip: Optional[str] = None
	login_count: int = 0

	@field_validator("sleep_routine", mode="before")
	@classmethod
	def normalize_sleep_routine(cls, value):
		# Backward compatibility for legacy records that stored free-text values.
		if value is None:
			return None

		if isinstance(value, (int, float)):
			hours = float(value)
			return hours if 0 <= hours <= 24 else None

		if isinstance(value, str):
			cleaned = value.strip()
			if not cleaned:
				return None
			match = re.search(r"\d+(\.\d+)?", cleaned)
			if not match:
				return None
			hours = float(match.group())
			return hours if 0 <= hours <= 24 else None

		return None

class UserCreate(UserBase):
	password: str

class UserInDB(UserBase):
	id: Optional[str] = Field(alias="_id", default=None)
	hashed_password: str
	created_at: datetime = Field(default_factory=datetime.utcnow)

	model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

class UserResponse(UserBase):
	id: str
	created_at: Optional[datetime] = None

class Token(BaseModel):
	access_token: str
	token_type: str

class TokenData(BaseModel):
	email: Optional[str] = None
	role: Optional[str] = None
