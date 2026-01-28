from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.auth.dependencies import get_current_user, require_role
from app.core.database import get_database
from app.schemas.user import UserResponse, UserRole, UserInDB
from bson import ObjectId

router = APIRouter()

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: UserInDB = Depends(get_current_user)):
    return current_user

@router.get("/doctors", response_model=List[UserResponse])
async def read_doctors(db = Depends(get_database)):
    doctors = await db["users"].find({"role": UserRole.DOCTOR.value}).to_list(100)
    for doc in doctors:
        doc["id"] = str(doc["_id"])
    return doctors

@router.get("/{user_id}", response_model=UserResponse)
async def read_user_by_id(user_id: str, db = Depends(get_database), current_user=Depends(get_current_user)):
    try:
        obj_id = ObjectId(user_id)
    except:
         raise HTTPException(status_code=400, detail="Invalid ID format")

    user = await db["users"].find_one({"_id": obj_id})
    if user:
        user["id"] = str(user["_id"])
        return user
    raise HTTPException(status_code=404, detail="User not found")

@router.get("/", response_model=List[UserResponse])
async def get_all_users(
    skip: int = 0, 
    limit: int = 100, 
    db = Depends(get_database),
    current_user = Depends(require_role(UserRole.ADMIN))
):
    users = await db["users"].find({}).skip(skip).limit(limit).to_list(100)
    for u in users:
        u["id"] = str(u["_id"])
    return users

@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    db = Depends(get_database),
    current_user = Depends(require_role(UserRole.ADMIN))
):
    try:
        obj_id = ObjectId(user_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    # Optional: Prevent deleting self
    if str(obj_id) == str(current_user["_id"]):
         raise HTTPException(status_code=400, detail="Cannot delete self")

    result = await db["users"].delete_one({"_id": obj_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted successfully"}

