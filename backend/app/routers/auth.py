from fastapi import APIRouter, Depends, HTTPException, status, Form, UploadFile, File, Request
from fastapi.security import OAuth2PasswordRequestForm
from app.core.database import get_database
from app.core.security import verify_password, create_access_token, get_password_hash
from app.models.user import Token, UserResponse, UserRole
from datetime import timedelta, datetime
from app.core.config import settings
from jose import jwt, JWTError
from typing import Optional
import shutil
import os
import re
import cloudinary
import cloudinary.uploader

router = APIRouter()


def _extract_requester_role(request: Request) -> Optional[str]:
    auth_header = request.headers.get("authorization")
    if not auth_header:
        return None

    scheme, _, token = auth_header.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return None

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload.get("role")
    except JWTError:
        return None

def parse_sleep_hours(sleep_routine: Optional[str]) -> Optional[float]:
    if sleep_routine is None:
        return None

    value = sleep_routine.strip()
    if not value:
        return None

    # Accept values like "8" or "8 hours" and extract the numeric portion.
    match = re.search(r"\d+(\.\d+)?", value)
    if not match:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sleep routine must be a valid number of hours",
        )

    hours = float(match.group())
    if hours < 0 or hours > 24:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sleep routine cannot be greater than 24 hours",
        )

    return hours

# Configure Cloudinary
cloudinary.config( 
  cloud_name = settings.CLOUDINARY_CLOUD_NAME, 
  api_key = settings.CLOUDINARY_API_KEY, 
  api_secret = settings.CLOUDINARY_API_SECRET 
)

@router.post("/register", response_model=UserResponse)
async def register(
    request: Request,
    email: str = Form(...),
    password: str = Form(...),
    full_name: str = Form(...),
    role: UserRole = Form(...),
    # Patient fields
    gender: Optional[str] = Form(None),
    height: Optional[str] = Form(None),
    weight: Optional[str] = Form(None),
    sleep_routine: Optional[str] = Form(None),
    # Staff fields
    verification_document: Optional[UploadFile] = File(None),
    db = Depends(get_database)
):
    existing_user = await db["users"].find_one({"email": email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    requester_role = _extract_requester_role(request)
    if requester_role == UserRole.ADMIN.value and role not in {UserRole.DOCTOR, UserRole.PHARMACY}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin can only add doctor or pharmacy users from Manage Users.",
        )
    
    # Handle File Upload
    file_path = None
    if verification_document:
        try:
            # Upload to Cloudinary
            upload_result = cloudinary.uploader.upload(
                verification_document.file,
                folder="hospital_certificates",
                resource_type="auto"
            )
            file_path = upload_result.get("secure_url")
        except Exception as e:
            # In case of upload failure
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Certificate upload failed: {str(e)}"
            )

    hashed_password = get_password_hash(password)

    sleep_hours = None
    if role == UserRole.PATIENT:
        sleep_hours = parse_sleep_hours(sleep_routine)
    
    user_dict = {
        "email": email,
        "full_name": full_name,
        "role": role,
        "hashed_password": hashed_password,
        "gender": gender,
        "is_rejected": False,
        "last_login_at": None,
        "last_login_ip": None,
        "login_count": 0,
    }

    if role == UserRole.PATIENT:
        user_dict.update({
            "height": height,
            "weight": weight,
            "sleep_routine": sleep_hours,
            "is_verified": True
        })
    elif role == UserRole.STUDENT:
        # Students are auto-verified
        user_dict.update({
            "is_verified": True
        })
    elif role in {UserRole.DOCTOR, UserRole.PHARMACY, UserRole.LAB_TECHNICIAN}:
        # Staff roles that require admin verification.
        user_dict.update({
            "verification_document": file_path,
            "is_verified": False
        })
    else:
        # Admin and other internal roles created by admin can be active immediately.
        user_dict.update({
            "is_verified": True
        })
    
    new_user = await db["users"].insert_one(user_dict)
    created_user = await db["users"].find_one({"_id": new_user.inserted_id})
    created_user["id"] = str(created_user["_id"])
    return created_user

@router.post("/login", response_model=Token)
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db = Depends(get_database)
):
    user = await db["users"].find_one({"email": form_data.username})
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    approval_required_roles = {UserRole.DOCTOR.value, UserRole.PHARMACY.value}
    if user.get("role") in approval_required_roles and user.get("is_rejected", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your registration was rejected by admin. Please contact support.",
        )

    if user.get("role") in approval_required_roles and not user.get("is_verified", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is pending admin approval.",
        )

    client_ip = request.headers.get("x-forwarded-for") or (request.client.host if request.client else None)
    await db["users"].update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "last_login_at": datetime.utcnow(),
                "last_login_ip": client_ip,
            },
            "$inc": {"login_count": 1},
        },
    )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"], "role": user["role"]}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}
