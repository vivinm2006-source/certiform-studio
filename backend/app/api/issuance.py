import io
import os
import zipfile
import base64
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Project, CertificateTemplate, Recipient, IssuanceJob, Credential
from app.schemas import IssuanceJobCreate, IssuanceJobOut, PreflightReport
from app.engine.image_renderer import render_certificate_image
from app.engine.pdf_renderer import render_certificate_pdf, render_consolidated_pdf
from app.engine.preflight import PreflightChecker
from app.services.issuance_service import launch_issuance_job, process_issuance_job
from app.services.verification_service import generate_human_credential_id
from app.config import settings

router = APIRouter(tags=["Issuance & Rendering"])

@router.post("/render/preview")
def render_live_preview(payload: Dict[str, Any], db: Session = Depends(get_db)):
    """
    Generate deterministic document preview using backend engine (Pillow or ReportLab).
    Does NOT rely on browser screenshots.
    """
    template_data = payload.get("template", {})
    elements_data = payload.get("elements", [])
    recipient_data = payload.get("recipient_data", {})
    output_format = payload.get("format", "png").lower() # "png" or "pdf"
    credential_id = payload.get("credential_id", "SAMPLE-PREVIEW-001")
    
    if output_format == "pdf":
        pdf_bytes = render_certificate_pdf(
            template_data, elements_data, recipient_data, credential_id=credential_id, public_base_url=settings.PUBLIC_BASE_URL
        )
        return Response(content=pdf_bytes, media_type="application/pdf")
    else:
        # Standard high-quality PNG preview
        img = render_certificate_image(
            template_data, elements_data, recipient_data, credential_id=credential_id, dpi=settings.PREVIEW_DPI, public_base_url=settings.PUBLIC_BASE_URL
        )
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        b64_str = base64.b64encode(buf.getvalue()).decode("utf-8")
        return {
            "mime_type": "image/png",
            "data_url": f"data:image/png;base64,{b64_str}",
            "width": img.width,
            "height": img.height
        }

@router.post("/projects/{project_id}/preflight", response_model=PreflightReport)
def run_preflight_check(project_id: str, db: Session = Depends(get_db)):
    """Analyze active template against all project recipients for text overflow and missing variables."""
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
        
    template = db.query(CertificateTemplate).filter(
        CertificateTemplate.project_id == project_id,
        CertificateTemplate.is_active == True
    ).first()
    if not template:
        template = db.query(CertificateTemplate).filter(CertificateTemplate.project_id == project_id).first()
        
    if not template:
        raise HTTPException(status_code=400, detail="No certificate template found")
        
    recipients = db.query(Recipient).filter(Recipient.project_id == project_id).all()
    
    template_dict = {
        "width_pt": template.width_pt,
        "height_pt": template.height_pt
    }
    elements_list = [
        {
            "id": el.id,
            "element_type": el.element_type,
            "x": el.x, "y": el.y, "width": el.width, "height": el.height,
            "content": el.content, "binding_key": el.binding_key,
            "font_family": el.font_family, "font_size": el.font_size, "font_weight": el.font_weight,
            "auto_fit_text": el.auto_fit_text, "asset_url": el.asset_url
        }
        for el in template.elements
    ]
    recipients_list = [{"id": r.id, "data": r.data} for r in recipients]
    
    report = PreflightChecker.inspect(
        template_dict=template_dict,
        elements=elements_list,
        recipients=recipients_list,
        required_binding_keys=["recipient_name"]
    )
    return report

def export_bulk_certificates_direct(project_id: str, mode: str, db: Session, template_id: Optional[str] = None):
    """Directly generate and return bulk certificate export stream in-memory."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    template = None
    if template_id:
        template = db.query(CertificateTemplate).filter(
            CertificateTemplate.id == template_id,
            CertificateTemplate.project_id == project_id
        ).first()

    if not template:
        template = db.query(CertificateTemplate).filter(
            CertificateTemplate.project_id == project_id,
            CertificateTemplate.is_active == True
        ).first()

    if not template:
        template = db.query(CertificateTemplate).filter(CertificateTemplate.project_id == project_id).first()

    if not template:
        raise HTTPException(status_code=400, detail="No certificate template found in project")
        
    template_dict = {
        "id": template.id,
        "version": template.version,
        "width_pt": template.width_pt,
        "height_pt": template.height_pt,
        "background_color": template.background_color,
        "background_asset_url": template.background_asset_url
    }
    elements_list = [
        {
            "id": el.id, "element_type": el.element_type,
            "x": el.x, "y": el.y, "width": el.width, "height": el.height, "rotation": el.rotation,
            "content": el.content, "binding_key": el.binding_key,
            "font_family": el.font_family, "font_size": el.font_size, "font_weight": el.font_weight,
            "font_style": el.font_style, "color": el.color, "text_align": el.text_align,
            "vertical_align": el.vertical_align, "letter_spacing": el.letter_spacing,
            "line_height": el.line_height, "uppercase": el.uppercase, "auto_fit_text": el.auto_fit_text,
            "asset_url": el.asset_url, "shape_type": el.shape_type,
            "border_color": el.border_color, "border_width": el.border_width, "fill_color": el.fill_color,
            "layer_order": el.layer_order, "is_visible": el.is_visible
        }
        for el in template.elements
    ]
    
    recipients = db.query(Recipient).filter(
        Recipient.project_id == project_id,
        Recipient.status != "error"
    ).all()
    
    if not recipients:
        raise HTTPException(status_code=400, detail="No recipients found for export")
        
    if mode == "consolidated_pdf":
        items = []
        for idx, rec in enumerate(recipients):
            cred_id = f"CERT-BULK-{(idx + 1):04d}"
            items.append({"data": dict(rec.data or {}), "credential_id": cred_id})
        pdf_bytes = render_consolidated_pdf(template_dict, elements_list, items, public_base_url=settings.PUBLIC_BASE_URL)
        filename = f"certificates_consolidated_{project_id[:8]}.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    elif mode == "zip_pdf":
        zip_buf = io.BytesIO()
        with zipfile.ZipFile(zip_buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
            for idx, rec in enumerate(recipients):
                r_data = dict(rec.data or {})
                name = r_data.get("recipient_name") or r_data.get("full_name") or f"recipient_{(idx+1):03d}"
                safe_name = "".join(c for c in name if c.isalnum() or c in (" ", "_", "-")).strip().replace(" ", "_")
                cred_id = f"CERT-{(idx + 1):04d}"
                pdf_b = render_certificate_pdf(template_dict, elements_list, r_data, credential_id=cred_id, public_base_url=settings.PUBLIC_BASE_URL)
                zf.writestr(f"{(idx+1):03d}_{safe_name}.pdf", pdf_b)
        filename = f"certificates_pdf_bundle_{project_id[:8]}.zip"
        return Response(
            content=zip_buf.getvalue(),
            media_type="application/zip",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    else:  # zip_png
        zip_buf = io.BytesIO()
        with zipfile.ZipFile(zip_buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
            for idx, rec in enumerate(recipients):
                r_data = dict(rec.data or {})
                name = r_data.get("recipient_name") or r_data.get("full_name") or f"recipient_{(idx+1):03d}"
                safe_name = "".join(c for c in name if c.isalnum() or c in (" ", "_", "-")).strip().replace(" ", "_")
                cred_id = f"CERT-{(idx + 1):04d}"
                img = render_certificate_image(template_dict, elements_list, r_data, credential_id=cred_id, dpi=settings.DEFAULT_DPI, public_base_url=settings.PUBLIC_BASE_URL)
                img_b = io.BytesIO()
                img.save(img_b, format="PNG")
                zf.writestr(f"{(idx+1):03d}_{safe_name}.png", img_b.getvalue())
        filename = f"certificates_png_bundle_{project_id[:8]}.zip"
        return Response(
            content=zip_buf.getvalue(),
            media_type="application/zip",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )

@router.post("/projects/{project_id}/issuance/jobs", response_model=IssuanceJobOut)
def create_issuance_job(project_id: str, payload: IssuanceJobCreate, db: Session = Depends(get_db)):
    """Create and trigger document generation task."""
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
        
    valid_recipients_count = db.query(Recipient).filter(
        Recipient.project_id == project_id,
        Recipient.status != "error"
    ).count()
    
    if valid_recipients_count == 0:
        raise HTTPException(status_code=400, detail="No recipients available for issuance.")
        
    job = IssuanceJob(
        project_id=project_id,
        template_id=payload.template_id,
        output_mode=payload.output_mode,
        status="queued",
        total_count=valid_recipients_count,
        completed_count=0,
        error_count=0,
        progress_percentage=0.0
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    
    # Process job synchronously in-process so artifacts are 100% generated immediately
    # without risk of serverless background thread suspension
    try:
        process_issuance_job(job.id)
        db.refresh(job)
    except Exception as e:
        print(f"Error in synchronous issuance job: {e}")
        launch_issuance_job(job.id)
    
    return job

@router.get("/issuance/jobs/{job_id}", response_model=IssuanceJobOut)
def get_issuance_job_status(job_id: str, db: Session = Depends(get_db)):
    """Poll progress status of an issuance background job."""
    job = db.query(IssuanceJob).filter(IssuanceJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Issuance job not found")
    return job

@router.get("/issuance/jobs/{job_id}/download")
def download_job_artifact(job_id: str, template_id: Optional[str] = None, db: Session = Depends(get_db)):
    """Download generated ZIP archive or consolidated PDF."""
    job = db.query(IssuanceJob).filter(IssuanceJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Issuance job not found")
        
    full_path = None
    if job.artifact_url:
        rel_path = job.artifact_url.replace("/storage/", "")
        full_path = settings.STORAGE_DIR / rel_path
        
    tpl_id = template_id or job.template_id
    # If the file is not on disk (e.g. cross-lambda stateless container in Vercel),
    # re-generate it on the fly!
    if not full_path or not full_path.exists():
        try:
            process_issuance_job(job.id)
            db.refresh(job)
            if job.artifact_url:
                rel_path = job.artifact_url.replace("/storage/", "")
                full_path = settings.STORAGE_DIR / rel_path
        except Exception as e:
            print(f"Regeneration error: {e}")

    if not full_path or not full_path.exists():
        # Fallback: direct in-memory stream
        return export_bulk_certificates_direct(job.project_id, job.output_mode, db, template_id=tpl_id)
        
    media_type = "application/zip" if job.artifact_filename and job.artifact_filename.endswith(".zip") else "application/pdf"
    return FileResponse(
        path=str(full_path),
        filename=job.artifact_filename or "certificates_export",
        media_type=media_type
    )

@router.get("/projects/{project_id}/export/bulk-pdf")
def export_bulk_pdf_direct(project_id: str, template_id: Optional[str] = None, db: Session = Depends(get_db)):
    """Direct 1-click download of all recipient certificates as a single consolidated PDF."""
    return export_bulk_certificates_direct(project_id, "consolidated_pdf", db, template_id=template_id)

@router.get("/projects/{project_id}/export/bulk-zip")
def export_bulk_zip_direct(project_id: str, template_id: Optional[str] = None, db: Session = Depends(get_db)):
    """Direct 1-click download of all recipient certificates as a ZIP archive of individual PDFs."""
    return export_bulk_certificates_direct(project_id, "zip_pdf", db, template_id=template_id)

@router.get("/projects/{project_id}/export/bulk-png")
def export_bulk_png_direct(project_id: str, template_id: Optional[str] = None, db: Session = Depends(get_db)):
    """Direct 1-click download of all recipient certificates as a ZIP archive of PNG images."""
    return export_bulk_certificates_direct(project_id, "zip_png", db, template_id=template_id)

@router.post("/projects/{project_id}/instant-certificate")
def create_instant_certificate(project_id: str, payload: Dict[str, Any], db: Session = Depends(get_db)):
    """
    Direct input-to-certificate creation action:
    Takes recipient & certificate input data, registers recipient,
    creates authoritative credential with QR verification, renders live PNG/PDF,
    and returns full certificate package with download links.
    """
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
        
    template = db.query(CertificateTemplate).filter(
        CertificateTemplate.project_id == project_id,
        CertificateTemplate.is_active == True
    ).first()
    if not template:
        template = db.query(CertificateTemplate).filter(CertificateTemplate.project_id == project_id).first()
    if not template:
        raise HTTPException(status_code=400, detail="No certificate template found in project")
        
    # Extract recipient data (support either flat payload or nested 'data')
    rec_data = dict(payload.get("data", payload))
    # Remove metadata keys if present
    rec_data.pop("data", None)
    
    if "recipient_name" not in rec_data or not str(rec_data["recipient_name"]).strip():
        rec_data["recipient_name"] = "Honored Recipient"
        
    # Create Recipient
    recipient = Recipient(
        project_id=project_id,
        data=rec_data,
        source="instant_generator",
        status="issued"
    )
    db.add(recipient)
    db.flush()
    
    # Generate unique human-readable credential ID
    cred_id = generate_human_credential_id()
    cred = Credential(
        credential_id=cred_id,
        project_id=project_id,
        recipient_id=recipient.id,
        template_id=template.id,
        template_version=template.version,
        issued_data_snapshot=rec_data,
        credential_status="valid",
        issued_at=datetime.now(timezone.utc),
        verification_url=f"{settings.PUBLIC_BASE_URL}/verify/{cred_id}"
    )
    db.add(cred)
    db.commit()
    db.refresh(recipient)
    db.refresh(cred)
    
    # Pre-render high-res PNG preview
    template_data = {
        "width_pt": template.width_pt,
        "height_pt": template.height_pt,
        "background_color": template.background_color,
        "background_asset_url": template.background_asset_url
    }
    elements_data = [
        {
            "id": el.id, "element_type": el.element_type,
            "x": el.x, "y": el.y, "width": el.width, "height": el.height,
            "content": el.content, "binding_key": el.binding_key,
            "font_family": el.font_family, "font_size": el.font_size, "font_weight": el.font_weight,
            "font_style": el.font_style, "text_decoration": el.text_decoration, "color": el.color,
            "text_align": el.text_align, "vertical_align": el.vertical_align,
            "line_height": el.line_height, "letter_spacing": el.letter_spacing,
            "uppercase": el.uppercase, "auto_fit_text": el.auto_fit_text,
            "border_color": el.border_color, "border_width": el.border_width,
            "fill_color": el.fill_color, "shape_type": el.shape_type,
            "asset_url": el.asset_url, "layer_order": el.layer_order,
            "is_visible": el.is_visible
        }
        for el in template.elements
    ]
    
    img = render_certificate_image(
        template_data, elements_data, rec_data, credential_id=cred_id, dpi=settings.PREVIEW_DPI, public_base_url=settings.PUBLIC_BASE_URL
    )
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    b64_str = base64.b64encode(buf.getvalue()).decode("utf-8")
    
    return {
        "success": True,
        "message": f"Certificate created successfully for {rec_data.get('recipient_name')}",
        "recipient_id": recipient.id,
        "credential_id": cred_id,
        "verification_url": cred.verification_url,
        "preview_png": f"data:image/png;base64,{b64_str}",
        "download_pdf_url": f"/api/v1/recipients/{recipient.id}/export-pdf",
        "download_png_url": f"/api/v1/recipients/{recipient.id}/export-png",
        "recipient": {
            "id": recipient.id,
            "data": recipient.data,
            "status": recipient.status
        }
    }

@router.get("/recipients/{recipient_id}/export-pdf")
def export_recipient_pdf(recipient_id: str, db: Session = Depends(get_db)):
    """Export single recipient certificate directly as vector PDF."""
    recipient = db.query(Recipient).filter(Recipient.id == recipient_id).first()
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")
        
    template = db.query(CertificateTemplate).filter(
        CertificateTemplate.project_id == recipient.project_id,
        CertificateTemplate.is_active == True
    ).first()
    if not template:
        template = db.query(CertificateTemplate).filter(CertificateTemplate.project_id == recipient.project_id).first()
    if not template:
        raise HTTPException(status_code=400, detail="No certificate template found")
        
    cred = db.query(Credential).filter(Credential.recipient_id == recipient_id).order_by(Credential.issued_at.desc()).first()
    cred_id = cred.credential_id if cred else f"CERT-{recipient_id[:8]}"
    
    template_data = {
        "width_pt": template.width_pt, "height_pt": template.height_pt,
        "background_color": template.background_color, "background_asset_url": template.background_asset_url
    }
    elements_data = [
        {
            "id": el.id, "element_type": el.element_type,
            "x": el.x, "y": el.y, "width": el.width, "height": el.height,
            "content": el.content, "binding_key": el.binding_key,
            "font_family": el.font_family, "font_size": el.font_size, "font_weight": el.font_weight,
            "font_style": el.font_style, "text_decoration": el.text_decoration, "color": el.color,
            "text_align": el.text_align, "vertical_align": el.vertical_align,
            "line_height": el.line_height, "letter_spacing": el.letter_spacing,
            "uppercase": el.uppercase, "auto_fit_text": el.auto_fit_text,
            "border_color": el.border_color, "border_width": el.border_width,
            "fill_color": el.fill_color, "shape_type": el.shape_type,
            "asset_url": el.asset_url, "layer_order": el.layer_order,
            "is_visible": el.is_visible
        }
        for el in template.elements
    ]
    
    pdf_bytes = render_certificate_pdf(
        template_data, elements_data, recipient.data or {}, credential_id=cred_id, public_base_url=settings.PUBLIC_BASE_URL
    )
    
    name_clean = str(recipient.data.get("recipient_name", "Certificate")).replace(" ", "_")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={name_clean}_certificate.pdf"}
    )

@router.get("/recipients/{recipient_id}/export-png")
def export_recipient_png(recipient_id: str, db: Session = Depends(get_db)):
    """Export single recipient certificate directly as high-res 300 DPI PNG."""
    recipient = db.query(Recipient).filter(Recipient.id == recipient_id).first()
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")
        
    template = db.query(CertificateTemplate).filter(
        CertificateTemplate.project_id == recipient.project_id,
        CertificateTemplate.is_active == True
    ).first()
    if not template:
        template = db.query(CertificateTemplate).filter(CertificateTemplate.project_id == recipient.project_id).first()
    if not template:
        raise HTTPException(status_code=400, detail="No certificate template found")
        
    cred = db.query(Credential).filter(Credential.recipient_id == recipient_id).order_by(Credential.issued_at.desc()).first()
    cred_id = cred.credential_id if cred else f"CERT-{recipient_id[:8]}"
    
    template_data = {
        "width_pt": template.width_pt, "height_pt": template.height_pt,
        "background_color": template.background_color, "background_asset_url": template.background_asset_url
    }
    elements_data = [
        {
            "id": el.id, "element_type": el.element_type,
            "x": el.x, "y": el.y, "width": el.width, "height": el.height,
            "content": el.content, "binding_key": el.binding_key,
            "font_family": el.font_family, "font_size": el.font_size, "font_weight": el.font_weight,
            "font_style": el.font_style, "text_decoration": el.text_decoration, "color": el.color,
            "text_align": el.text_align, "vertical_align": el.vertical_align,
            "line_height": el.line_height, "letter_spacing": el.letter_spacing,
            "uppercase": el.uppercase, "auto_fit_text": el.auto_fit_text,
            "border_color": el.border_color, "border_width": el.border_width,
            "fill_color": el.fill_color, "shape_type": el.shape_type,
            "asset_url": el.asset_url, "layer_order": el.layer_order,
            "is_visible": el.is_visible
        }
        for el in template.elements
    ]
    
    img = render_certificate_image(
        template_data, elements_data, recipient.data or {}, credential_id=cred_id, dpi=300, public_base_url=settings.PUBLIC_BASE_URL
    )
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    
    name_clean = str(recipient.data.get("recipient_name", "Certificate")).replace(" ", "_")
    return Response(
        content=buf.getvalue(),
        media_type="image/png",
        headers={"Content-Disposition": f"attachment; filename={name_clean}_certificate.png"}
    )
