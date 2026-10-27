from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.database import get_db
from app.models import Form, FormField, FormSubmission, Recipient, Project, Credential, CertificateTemplate
from app.schemas import (
    FormUpdate, FormOut, FormFieldCreate, FormFieldOut,
    FormSubmissionCreate, FormSubmissionOut
)
from app.services.verification_service import generate_human_credential_id
from app.config import settings

router = APIRouter(tags=["Forms"])

@router.get("/forms/{form_id}", response_model=FormOut)
def get_form(form_id: str, db: Session = Depends(get_db)):
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    return form

@router.patch("/forms/{form_id}", response_model=FormOut)
def update_form(form_id: str, data: FormUpdate, db: Session = Depends(get_db)):
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
        
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(form, k, v)
        
    db.commit()
    db.refresh(form)
    return form

@router.post("/forms/{form_id}/fields", response_model=FormFieldOut)
def add_form_field(form_id: str, data: FormFieldCreate, db: Session = Depends(get_db)):
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
        
    # Standardize binding key: e.g. "Full Name" -> "full_name"
    b_key = data.binding_key.strip().lower().replace(" ", "_")
    
    field = FormField(
        form_id=form_id,
        binding_key=b_key,
        label=data.label,
        help_text=data.help_text,
        placeholder=data.placeholder,
        field_type=data.field_type,
        is_required=data.is_required,
        default_value=data.default_value,
        validation_rules=data.validation_rules,
        display_order=data.display_order
    )
    db.add(field)
    db.commit()
    db.refresh(field)
    return field

@router.delete("/forms/{form_id}/fields/{field_id}")
def delete_form_field(form_id: str, field_id: str, db: Session = Depends(get_db)):
    field = db.query(FormField).filter(FormField.id == field_id, FormField.form_id == form_id).first()
    if not field:
        raise HTTPException(status_code=404, detail="Form field not found")
    db.delete(field)
    db.commit()
    return {"success": True, "message": "Field deleted"}

# --- Public Form Endpoints ---

@router.get("/public/forms/{form_id}")
def get_public_form(form_id: str, db: Session = Depends(get_db)):
    """Public portal: fetch published form details and schema."""
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    if not form.is_published:
        raise HTTPException(status_code=403, detail="This form is currently unpublished.")
        
    project = db.query(Project).filter(Project.id == form.project_id).first()
    
    return {
        "id": form.id,
        "title": form.title,
        "description": form.description,
        "project_title": project.title if project else "Certificate Program",
        "auto_issue_enabled": form.auto_issue_enabled,
        "allow_preview": form.allow_preview,
        "custom_message": form.custom_message,
        "fields": [
            {
                "id": f.id,
                "binding_key": f.binding_key,
                "label": f.label,
                "help_text": f.help_text,
                "placeholder": f.placeholder,
                "field_type": f.field_type,
                "is_required": f.is_required,
                "default_value": f.default_value,
                "validation_rules": f.validation_rules,
                "display_order": f.display_order
            }
            for f in sorted(form.fields, key=lambda x: x.display_order)
        ]
    }

@router.post("/public/forms/{form_id}/submissions")
def submit_public_form(form_id: str, payload: FormSubmissionCreate, db: Session = Depends(get_db)):
    """Public respondent intake submission with validation and optional auto-issuance."""
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form or not form.is_published:
        raise HTTPException(status_code=400, detail="Form is not available for submissions")
        
    data = payload.data
    errors = []
    
    # Validate required fields
    for f in form.fields:
        if f.is_required:
            val = data.get(f.binding_key)
            if val is None or str(val).strip() == "":
                errors.append(f"'{f.label}' is required.")
                
    if errors:
        raise HTTPException(status_code=422, detail={"errors": errors})
        
    # Create Recipient in Project
    recipient = Recipient(
        project_id=form.project_id,
        data=data,
        source="form",
        status="valid"
    )
    db.add(recipient)
    db.flush()
    
    # Create FormSubmission record
    submission = FormSubmission(
        form_id=form.id,
        recipient_id=recipient.id,
        submitted_at=datetime.now(timezone.utc),
        review_status="approved" if form.auto_issue_enabled else "pending"
    )
    db.add(submission)
    db.flush()
    
    issued_credential_id = None
    if form.auto_issue_enabled:
        # Issue certificate immediately
        template = db.query(CertificateTemplate).filter(
            CertificateTemplate.project_id == form.project_id,
            CertificateTemplate.is_active == True
        ).first()
        
        cred_id = generate_human_credential_id()
        cred = Credential(
            credential_id=cred_id,
            project_id=form.project_id,
            recipient_id=recipient.id,
            template_id=template.id if template else None,
            template_version=template.version if template else 1,
            issued_data_snapshot=data,
            credential_status="valid",
            issued_at=datetime.now(timezone.utc),
            verification_url=f"{settings.PUBLIC_BASE_URL}/verify/{cred_id}"
        )
        db.add(cred)
        recipient.status = "issued"
        issued_credential_id = cred_id
        
    db.commit()
    
    return {
        "success": True,
        "message": "Submission received successfully." if not form.auto_issue_enabled else "Certificate automatically created & issued successfully!",
        "submission_id": submission.id,
        "recipient_id": recipient.id,
        "auto_issued": form.auto_issue_enabled,
        "credential_id": issued_credential_id,
        "verification_url": f"{settings.PUBLIC_BASE_URL}/verify/{issued_credential_id}" if issued_credential_id else None,
        "download_pdf_url": f"/api/v1/recipients/{recipient.id}/export-pdf" if form.auto_issue_enabled else None,
        "download_png_url": f"/api/v1/recipients/{recipient.id}/export-png" if form.auto_issue_enabled else None,
        "recipient_data": data
    }
