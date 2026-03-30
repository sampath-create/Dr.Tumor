from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.auth.dependencies import get_current_user, require_role
from app.core.database import get_database
from app.core.crypto import encrypt_text, decrypt_text
from app.models.appointment import Appointment, AppointmentCreate, AppointmentStatus
from app.models.user import UserRole
from bson import ObjectId
from datetime import datetime

router = APIRouter()

@router.post("/", response_model=Appointment)
async def create_appointment(
    appointment: AppointmentCreate, 
    db = Depends(get_database), 
    current_user = Depends(require_role(UserRole.PATIENT))
):
    appointment_dict = appointment.dict()
    appointment_dict["patient_id"] = str(current_user["_id"])
    appointment_dict["doctor_id"] = None
    appointment_dict["status"] = AppointmentStatus.PENDING.value
    appointment_dict["symptoms"] = encrypt_text(appointment_dict.get("symptoms"))
    appointment_dict["rejected_doctor_ids"] = []
    appointment_dict["accepted_at"] = None
    appointment_dict["created_at"] = datetime.utcnow()
    
    new_appt = await db["appointments"].insert_one(appointment_dict)
    created_appt = await db["appointments"].find_one({"_id": new_appt.inserted_id})
    created_appt["id"] = str(created_appt["_id"])
    created_appt["symptoms"] = decrypt_text(created_appt.get("symptoms"))
    return created_appt

@router.get("/", response_model=List[Appointment])
async def get_appointments(
    db = Depends(get_database), 
    current_user = Depends(get_current_user)
):
    query = {}
    current_doctor_id = None
    if current_user["role"] == UserRole.PATIENT.value:
        query["patient_id"] = str(current_user["_id"])
    elif current_user["role"] == UserRole.DOCTOR.value:
        current_doctor_id = str(current_user["_id"])
        query = {
            "$or": [
                {"doctor_id": current_doctor_id},
                {
                    "status": AppointmentStatus.PENDING.value,
                    "doctor_id": None,
                    "rejected_doctor_ids": {"$ne": current_doctor_id},
                },
            ]
        }
    
    appts = await db["appointments"].find(query).sort("date_time", 1).to_list(100)

    doctor_name_map: dict[str, str] = {}
    if appts:
        doctor_ids = list({appt.get("doctor_id") for appt in appts if appt.get("doctor_id")})
        if doctor_ids:
            doctor_cursor = db["users"].find({"_id": {"$in": [ObjectId(doc_id) for doc_id in doctor_ids if ObjectId.is_valid(doc_id)]}})
            doctors = await doctor_cursor.to_list(100)
            doctor_name_map = {str(doc["_id"]): doc.get("full_name", "Doctor") for doc in doctors}

    total_doctors = 0
    if current_doctor_id:
        total_doctors = await db["users"].count_documents({"role": UserRole.DOCTOR.value})

    for appt in appts:
        appt["id"] = str(appt["_id"])
        appt["symptoms"] = decrypt_text(appt.get("symptoms"))
        appt.setdefault("doctor_id", None)
        appt["doctor_name"] = doctor_name_map.get(appt.get("doctor_id"))
        appt.setdefault("rejected_doctor_ids", [])
        appt.setdefault("accepted_at", None)
        appt["mandatory_for_current_doctor"] = False
        appt["mandatory_message"] = None

        if current_doctor_id and appt["status"] == AppointmentStatus.PENDING.value and not appt.get("doctor_id"):
            rejected_doctors = appt.get("rejected_doctor_ids", [])
            only_one_left = total_doctors > 0 and len(rejected_doctors) >= (total_doctors - 1)
            if only_one_left and current_doctor_id not in rejected_doctors:
                appt["mandatory_for_current_doctor"] = True
                appt["mandatory_message"] = "All other doctors have rejected this request. Please attend this patient on priority."

    return appts

@router.put("/{appointment_id}/status", response_model=Appointment)
async def update_appointment_status(
    appointment_id: str, 
    status: str,
    db = Depends(get_database), 
    current_user = Depends(require_role(UserRole.DOCTOR))
):
    try:
        obj_id = ObjectId(appointment_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID")

    doctor_id = str(current_user["_id"])
    normalized_status = status.lower().strip()
    valid_statuses = {item.value for item in AppointmentStatus}
    if normalized_status not in valid_statuses and normalized_status != "rejected":
        raise HTTPException(status_code=400, detail="Invalid status")

    if normalized_status == "rejected":
        pending_appt = await db["appointments"].find_one(
            {
                "_id": obj_id,
                "status": AppointmentStatus.PENDING.value,
                "doctor_id": None,
            }
        )
        if not pending_appt:
            raise HTTPException(status_code=404, detail="Appointment not found or already handled")

        rejected_doctors = pending_appt.get("rejected_doctor_ids", [])
        if doctor_id in rejected_doctors:
            raise HTTPException(status_code=404, detail="Appointment already rejected by this doctor")

        total_doctors = await db["users"].count_documents({"role": UserRole.DOCTOR.value})
        only_one_left = total_doctors > 0 and len(rejected_doctors) >= (total_doctors - 1)
        if only_one_left:
            raise HTTPException(
                status_code=400,
                detail="You are the last available doctor for this patient. Rejection is not allowed; please accept.",
            )

        update_result = await db["appointments"].update_one(
            {
                "_id": obj_id,
                "status": AppointmentStatus.PENDING.value,
                "doctor_id": None,
                "rejected_doctor_ids": {"$ne": doctor_id},
            },
            {"$addToSet": {"rejected_doctor_ids": doctor_id}},
        )
        if update_result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Appointment not found, already handled, or already rejected")

    elif normalized_status == AppointmentStatus.CONFIRMED.value:
        # First try to claim an unassigned pending request from the common queue.
        claim_result = await db["appointments"].update_one(
            {
                "_id": obj_id,
                "status": AppointmentStatus.PENDING.value,
                "doctor_id": None,
                "rejected_doctor_ids": {"$ne": doctor_id},
            },
            {
                "$set": {
                    "doctor_id": doctor_id,
                    "status": AppointmentStatus.CONFIRMED.value,
                    "accepted_at": datetime.utcnow(),
                }
            },
        )

        if claim_result.matched_count == 0:
            owned_result = await db["appointments"].update_one(
                {"_id": obj_id, "doctor_id": doctor_id},
                {"$set": {"status": AppointmentStatus.CONFIRMED.value, "accepted_at": datetime.utcnow()}},
            )
            if owned_result.matched_count == 0:
                raise HTTPException(status_code=404, detail="Appointment not found or not authorized")

    else:
        update_result = await db["appointments"].update_one(
            {"_id": obj_id, "doctor_id": doctor_id},
            {"$set": {"status": normalized_status}},
        )
        if update_result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Appointment not found or not authorized")

    updated_appt = await db["appointments"].find_one({"_id": obj_id})
    updated_appt["id"] = str(updated_appt["_id"])
    updated_appt["symptoms"] = decrypt_text(updated_appt.get("symptoms"))
    updated_appt.setdefault("doctor_id", None)
    doctor = None
    if updated_appt.get("doctor_id") and ObjectId.is_valid(updated_appt["doctor_id"]):
        doctor = await db["users"].find_one({"_id": ObjectId(updated_appt["doctor_id"])})
    updated_appt["doctor_name"] = doctor.get("full_name") if doctor else None
    updated_appt.setdefault("rejected_doctor_ids", [])
    updated_appt.setdefault("accepted_at", None)
    updated_appt["mandatory_for_current_doctor"] = False
    updated_appt["mandatory_message"] = None
    return updated_appt
