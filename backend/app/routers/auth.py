from fastapi import APIRouter, Depends, HTTPException, status, Form, UploadFile, File
from fastapi.security import OAuth2PasswordRequestForm
from app.core.database import get_database
from app.core.security import verify_password, create_access_token, get_password_hash
from app.schemas.user import Token, UserResponse, UserRole
from datetime import timedelta
from app.core.config import settings
from typing import Optional
import shutil
import os
import cloudinary
import cloudinary.uploader

router = APIRouter()

# Configure Cloudinary
cloudinary.config( 
  cloud_name = settings.CLOUDINARY_CLOUD_NAME, 
  api_key = settings.CLOUDINARY_API_KEY, 
  api_secret = settings.CLOUDINARY_API_SECRET 
)

@router.post("/register", response_model=UserResponse)
async def register(
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
    
    user_dict = {
        "email": email,
        "full_name": full_name,
        "role": role,
        "hashed_password": hashed_password,
        "gender": gender,
    }

    if role == UserRole.PATIENT:
        user_dict.update({
            "height": height,
            "weight": weight,
            "sleep_routine": sleep_routine,
            "is_verified": True
        })
    else:
        # Staff roles (Doctor, Lab Technician, Pharmacy)
        user_dict.update({
            "verification_document": file_path,
            "is_verified": False
        })
    
    new_user = await db["users"].insert_one(user_dict)
    created_user = await db["users"].find_one({"_id": new_user.inserted_id})
    created_user["id"] = str(created_user["_id"])
    return created_user

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db = Depends(get_database)):
    user = await db["users"].find_one({"email": form_data.username})
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"], "role": user["role"]}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}
