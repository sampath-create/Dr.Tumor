from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import List, Optional
from app.auth.dependencies import get_current_user, require_role
from app.core.database import get_database
from app.schemas.medical import (
    Prescription, PrescriptionCreate, LabRequest, LabRequestCreate, LabReport, LabRequestStatus
)
from app.schemas.user import UserRole
from bson import ObjectId
import shutil
import os

router = APIRouter()

# --- PRESCRIPTIONS ---

@router.post("/prescriptions", response_model=Prescription)
async def create_prescription(
    prescription: PrescriptionCreate, 
    db = Depends(get_database), 
    current_user = Depends(require_role(UserRole.DOCTOR))
):
    daily = prescription.dict()
    daily["doctor_id"] = str(current_user["_id"])
    daily["is_dispensed"] = False
    
    new_rx = await db["prescriptions"].insert_one(daily)
    created_rx = await db["prescriptions"].find_one({"_id": new_rx.inserted_id})
    created_rx["id"] = str(created_rx["_id"])
    return created_rx

@router.get("/prescriptions", response_model=List[Prescription])
async def get_prescriptions(
    db = Depends(get_database), 
    current_user = Depends(get_current_user)
):
    query = {}
    if current_user["role"] == UserRole.PATIENT.value:
        query["patient_id"] = str(current_user["_id"])
    elif current_user["role"] == UserRole.DOCTOR.value:
        query["doctor_id"] = str(current_user["_id"])
    # Pharmacy sees all undisclosed or maybe filter by ID if passed? For now all
    
    prescriptions = await db["prescriptions"].find(query).to_list(100)
    for p in prescriptions:
        p["id"] = str(p["_id"])
    return prescriptions

@router.put("/prescriptions/{rx_id}/dispense", response_model=Prescription)
async def dispense_prescription(
    rx_id: str, 
    db = Depends(get_database), 
    current_user = Depends(require_role(UserRole.PHARMACY))
):
    try:
        obj_id = ObjectId(rx_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID")

    update_result = await db["prescriptions"].update_one(
        {"_id": obj_id},
        {"$set": {"is_dispensed": True}}
    )
    if update_result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Prescription not found")
        
    updated_rx = await db["prescriptions"].find_one({"_id": obj_id})
    updated_rx["id"] = str(updated_rx["_id"])
    return updated_rx

# --- LAB REQUESTS ---

@router.post("/lab-requests", response_model=LabRequest)
async def create_lab_request(
    request: LabRequestCreate,
    db = Depends(get_database),
    current_user = Depends(require_role(UserRole.DOCTOR))
):
    req_dict = request.dict()
    req_dict["doctor_id"] = str(current_user["_id"])
    req_dict["status"] = LabRequestStatus.PENDING.value
    
    new_req = await db["lab_requests"].insert_one(req_dict)
    created_req = await db["lab_requests"].find_one({"_id": new_req.inserted_id})
    created_req["id"] = str(created_req["_id"])
    return created_req

@router.get("/lab-requests", response_model=List[LabRequest])
async def get_lab_requests(
    db = Depends(get_database), 
    current_user = Depends(get_current_user)
):
    query = {}
    if current_user["role"] == UserRole.PATIENT.value:
        query["patient_id"] = str(current_user["_id"])
    elif current_user["role"] == UserRole.DOCTOR.value:
        query["doctor_id"] = str(current_user["_id"])
    # Lab Tech sees all
    
    reqs = await db["lab_requests"].find(query).to_list(100)
    for r in reqs:
        r["id"] = str(r["_id"])
    return reqs

@router.post("/lab-requests/{request_id}/upload")
async def upload_lab_report(
    request_id: str,
    file: UploadFile = File(...),
    ai_analysis: bool = Form(True),
    db = Depends(get_database),
    current_user = Depends(require_role(UserRole.LAB_TECHNICIAN))
):
    # simple file save
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)
    file_location = f"{upload_dir}/{file.filename}"
    with open(file_location, "wb+") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Placeholder for AI analysis
    ai_result = None
    if ai_analysis:
        ai_result = {"diagnosis": "Normal", "confidence": 0.98, "details": "No anomalies detected in the scan."}

    report_data = {
        "lab_request_id": request_id,
        "report_url": file_location,
        "technician_id": str(current_user["_id"]),
        "ai_analysis_result": ai_result
    }
    
    new_report = await db["lab_reports"].insert_one(report_data)
    
    try:
        req_oid = ObjectId(request_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid Request ID")

    # Update request status
    await db["lab_requests"].update_one(
        {"_id": req_oid},
        {"$set": {"status": LabRequestStatus.COMPLETED.value, "result_id": str(new_report.inserted_id)}}
    )
    
    created_report = await db["lab_reports"].find_one({"_id": new_report.inserted_id})
    created_report["id"] = str(created_report["_id"])
    del created_report["_id"]
    
    # Return a dict that matches LabReport schema partially or fully, 
    # but router return type isn't strict here due to Form/File mix complexity often needing manual return
    return created_report

@router.get("/lab-reports/{report_id}", response_model=LabReport)
async def get_lab_report(
    report_id: str,
    db = Depends(get_database),
    current_user = Depends(get_current_user)
):
    try:
        rep_oid = ObjectId(report_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid Report ID")

    report = await db["lab_reports"].find_one({"_id": rep_oid})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    report["id"] = str(report["_id"])
    # Add privacy check here (only patient, doctor, tech involved)
    return report
