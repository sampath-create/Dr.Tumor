from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.auth.dependencies import get_current_user, require_role
from app.core.database import get_database
from app.schemas.appointment import Appointment, AppointmentCreate, AppointmentStatus
from app.schemas.user import UserRole
from bson import ObjectId

router = APIRouter()

@router.post("/", response_model=Appointment)
async def create_appointment(
    appointment: AppointmentCreate, 
    db = Depends(get_database), 
    current_user = Depends(require_role(UserRole.PATIENT))
):
    appointment_dict = appointment.dict()
    appointment_dict["patient_id"] = str(current_user["_id"])
    appointment_dict["status"] = AppointmentStatus.PENDING
    
    new_appt = await db["appointments"].insert_one(appointment_dict)
    created_appt = await db["appointments"].find_one({"_id": new_appt.inserted_id})
    created_appt["id"] = str(created_appt["_id"])
    return created_appt

@router.get("/", response_model=List[Appointment])
async def get_appointments(
    db = Depends(get_database), 
    current_user = Depends(get_current_user)
):
    query = {}
    if current_user["role"] == UserRole.PATIENT.value:
        query["patient_id"] = str(current_user["_id"])
    elif current_user["role"] == UserRole.DOCTOR.value:
        query["doctor_id"] = str(current_user["_id"])
    
    appts = await db["appointments"].find(query).to_list(100)
    for appt in appts:
        appt["id"] = str(appt["_id"])
    return appts

@router.put("/{appointment_id}/status", response_model=Appointment)
async def update_appointment_status(
    appointment_id: str, 
    status: AppointmentStatus, 
    db = Depends(get_database), 
    current_user = Depends(require_role(UserRole.DOCTOR))
):
    try:
        obj_id = ObjectId(appointment_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID")

    update_result = await db["appointments"].update_one(
        {"_id": obj_id, "doctor_id": str(current_user["_id"])},
        {"$set": {"status": status.value}}
    )
    
    # We check modified_count or matched_count. 
    # matched_count is better because status might be same
    if update_result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found or not authorized")
        
    updated_appt = await db["appointments"].find_one({"_id": obj_id})
    updated_appt["id"] = str(updated_appt["_id"])
    return updated_appt
