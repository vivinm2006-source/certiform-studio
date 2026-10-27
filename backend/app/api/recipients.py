from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Recipient, Project, Form, FormField
from app.schemas import RecipientCreate, RecipientUpdate, RecipientOut, BulkImportRequest
from app.services.recipient_service import (
    suggest_column_mapping, parse_csv_content, parse_xlsx_content, generate_empty_excel_template
)
import csv
import io

router = APIRouter(tags=["Recipients"])

@router.get("/projects/{project_id}/recipients")
def list_recipients(
    project_id: str,
    search: Optional[str] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    query = db.query(Recipient).filter(Recipient.project_id == project_id)
    
    if status and status != "all":
        query = query.filter(Recipient.status == status)
        
    all_recipients = query.order_by(Recipient.created_at.asc()).all()
    
    # In-memory search across JSON data fields
    if search:
        s_lower = search.lower()
        filtered = []
        for r in all_recipients:
            data_str = " ".join(str(v).lower() for v in (r.data or {}).values())
            if s_lower in data_str or s_lower in r.id.lower():
                filtered.append(r)
        all_recipients = filtered
        
    total_count = len(all_recipients)
    start = (page - 1) * page_size
    paged = all_recipients[start : start + page_size]
    
    return {
        "items": [
            {
                "id": r.id,
                "project_id": r.project_id,
                "data": r.data,
                "source": r.source,
                "status": r.status,
                "validation_errors": r.validation_errors,
                "created_at": r.created_at,
                "updated_at": r.updated_at
            }
            for r in paged
        ],
        "total": total_count,
        "page": page,
        "page_size": page_size,
        "total_pages": (total_count + page_size - 1) // page_size if total_count > 0 else 1
    }

@router.post("/projects/{project_id}/recipients", response_model=RecipientOut)
def create_recipient(project_id: str, payload: RecipientCreate, db: Session = Depends(get_db)):
    rec = Recipient(
        project_id=project_id,
        data=payload.data,
        source=payload.source,
        status=payload.status,
        validation_errors=payload.validation_errors
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return rec

@router.patch("/recipients/{id}", response_model=RecipientOut)
def update_recipient(id: str, payload: RecipientUpdate, db: Session = Depends(get_db)):
    rec = db.query(Recipient).filter(Recipient.id == id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recipient not found")
        
    if payload.data is not None:
        merged = dict(rec.data or {})
        merged.update(payload.data)
        rec.data = merged
        
    if payload.status is not None:
        rec.status = payload.status
        
    if payload.validation_errors is not None:
        rec.validation_errors = payload.validation_errors
        
    db.commit()
    db.refresh(rec)
    return rec

@router.delete("/recipients/{id}")
def delete_recipient(id: str, db: Session = Depends(get_db)):
    rec = db.query(Recipient).filter(Recipient.id == id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recipient not found")
    db.delete(rec)
    db.commit()
    return {"success": True, "message": "Recipient deleted"}

@router.post("/projects/{project_id}/recipients/parse-file")
async def parse_spreadsheet_file(project_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Parse uploaded XLSX or CSV file and return headers, preview rows, and smart column mapping."""
    content = await file.read()
    filename = file.filename.lower() if file.filename else ""
    
    if filename.endswith(".csv"):
        headers, rows = parse_csv_content(content)
    elif filename.endswith(".xlsx") or filename.endswith(".xls"):
        headers, rows = parse_xlsx_content(content)
    else:
        raise HTTPException(status_code=400, detail="Only CSV and XLSX files are supported.")
        
    if not headers or not rows:
        raise HTTPException(status_code=400, detail="The uploaded file contains no rows or readable headers.")
        
    # Get available binding keys from project forms
    form = db.query(Form).filter(Form.project_id == project_id).first()
    available_keys = ["recipient_name", "email", "institution", "event_name", "event_date", "registration_id"]
    if form and form.fields:
        available_keys = list(set([f.binding_key for f in form.fields] + available_keys))
        
    mapping = suggest_column_mapping(headers, available_keys)
    
    return {
        "headers": headers,
        "available_keys": available_keys,
        "suggested_mapping": mapping,
        "preview_rows": rows[:10],
        "total_rows": len(rows),
        "raw_rows": rows # returned for client confirmation
    }

@router.post("/projects/{project_id}/recipients/import")
def execute_import(project_id: str, payload: BulkImportRequest, db: Session = Depends(get_db)):
    """Import mapped spreadsheet rows into project recipients table."""
    mapping = payload.column_mapping
    rows = payload.rows
    
    created_recipients = []
    for r in rows:
        mapped_data = {}
        for file_col, target_key in mapping.items():
            if target_key and target_key in r:
                mapped_data[target_key] = r.get(file_col, "")
            elif target_key and file_col in r:
                mapped_data[target_key] = r.get(file_col, "")
                
        rec = Recipient(
            project_id=project_id,
            data=mapped_data,
            source="import",
            status="valid"
        )
        db.add(rec)
        created_recipients.append(rec)
        
    db.commit()
    return {
        "success": True,
        "imported_count": len(created_recipients)
    }

@router.get("/projects/{project_id}/recipients/template")
def download_excel_template(project_id: str, db: Session = Depends(get_db)):
    """Download clean Excel template matching project form fields."""
    form = db.query(Form).filter(Form.project_id == project_id).first()
    fields = form.fields if form else []
    excel_bytes = generate_empty_excel_template(fields)
    
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=recipients_template.xlsx"}
    )

@router.get("/projects/{project_id}/recipients/export")
def export_roster(project_id: str, db: Session = Depends(get_db)):
    """Export current recipient roster as CSV."""
    recipients = db.query(Recipient).filter(Recipient.project_id == project_id).all()
    if not recipients:
        raise HTTPException(status_code=400, detail="No recipients to export")
        
    # Gather all unique keys
    all_keys = set()
    for r in recipients:
        if r.data:
            all_keys.update(r.data.keys())
    fieldnames = ["id", "status"] + sorted(list(all_keys))
    
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=fieldnames)
    writer.writeheader()
    
    for r in recipients:
        row = {"id": r.id, "status": r.status}
        if r.data:
            row.update(r.data)
        writer.writerow(row)
        
    return Response(
        content=buf.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=roster_{project_id[:8]}.csv"}
    )
