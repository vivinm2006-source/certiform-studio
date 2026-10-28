import os
import io
import zipfile
import threading
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Project, CertificateTemplate, CanvasElement, Recipient, Credential, IssuanceJob, AuditEvent
from app.config import settings
from app.engine.pdf_renderer import render_certificate_pdf, render_consolidated_pdf
from app.engine.image_renderer import render_certificate_image
from app.services.verification_service import generate_human_credential_id, compute_sha256

def sanitize_filename(name: str) -> str:
    """Produce safe ASCII-friendly filename."""
    clean = "".join(c for c in name if c.isalnum() or c in (" ", "_", "-")).strip()
    return clean.replace(" ", "_") or "certificate"

def process_issuance_job(job_id: str):
    """
    Background worker function to execute issuance jobs.
    Runs in a dedicated thread with its own database session.
    """
    db: Session = SessionLocal()
    try:
        job = db.query(IssuanceJob).filter(IssuanceJob.id == job_id).first()
        if not job:
            return
            
        job.status = "processing"
        job.progress_percentage = 5.0
        db.commit()
        
        project = db.query(Project).filter(Project.id == job.project_id).first()
        if not project:
            job.status = "failed"
            job.error_summary = [{"message": "Project not found"}]
            db.commit()
            return
            
        # Get specified or active template
        template = None
        if hasattr(job, 'template_id') and job.template_id:
            template = db.query(CertificateTemplate).filter(CertificateTemplate.id == job.template_id).first()
        if not template:
            template = db.query(CertificateTemplate).filter(
                CertificateTemplate.project_id == project.id,
                CertificateTemplate.is_active == True
            ).first()
        if not template:
            template = db.query(CertificateTemplate).filter(CertificateTemplate.project_id == project.id).first()
            
        if not template:
            job.status = "failed"
            job.error_summary = [{"message": "No certificate template found for project"}]
            db.commit()
            return
            
        # Freeze template and elements dictionary
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
                "id": el.id,
                "element_type": el.element_type,
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
        
        # Load valid recipients
        recipients = db.query(Recipient).filter(
            Recipient.project_id == project.id,
            Recipient.status != "error"
        ).all()
        
        total = len(recipients)
        job.total_count = total
        db.commit()
        
        if total == 0:
            job.status = "completed"
            job.progress_percentage = 100.0
            job.completed_at = datetime.now(timezone.utc)
            db.commit()
            return
            
        completed_count = 0
        error_count = 0
        errors = []
        
        # In-memory or temporary buffers for packaging
        zip_buf = io.BytesIO() if job.output_mode in ("zip_pdf", "zip_png") else None
        zf = zipfile.ZipFile(zip_buf, mode="w", compression=zipfile.ZIP_DEFLATED) if zip_buf else None
        
        consolidated_items = []
        last_single_artifact_url = None
        last_single_filename = None
        
        for idx, rec in enumerate(recipients):
            try:
                rec_data = dict(rec.data or {})
                rec_name = rec_data.get("recipient_name") or rec_data.get("full_name") or f"Recipient_{idx+1}"
                
                # Check for existing valid credential to guarantee idempotency
                existing_cred = db.query(Credential).filter(
                    Credential.recipient_id == rec.id,
                    Credential.credential_status == "valid"
                ).first()
                
                if existing_cred:
                    cred = existing_cred
                    cred_id = existing_cred.credential_id
                else:
                    cred_id = generate_human_credential_id(counter=idx + 1)
                    cred = Credential(
                        credential_id=cred_id,
                        project_id=project.id,
                        recipient_id=rec.id,
                        template_id=template.id,
                        template_version=template.version,
                        issued_data_snapshot=rec_data,
                        credential_status="valid",
                        issued_at=datetime.now(timezone.utc),
                        verification_url=f"{settings.PUBLIC_BASE_URL}/verify/{cred_id}"
                    )
                    db.add(cred)
                    db.flush()
                    
                # Update recipient status to issued
                rec.status = "issued"
                db.add(rec)
                
                safe_name = sanitize_filename(rec_name)
                seq_prefix = f"{(idx+1):04d}"
                
                # Render based on job mode
                if job.output_mode in ("single_pdf", "zip_pdf"):
                    pdf_bytes = render_certificate_pdf(
                        template_dict, elements_list, rec_data, credential_id=cred_id, public_base_url=settings.PUBLIC_BASE_URL
                    )
                    digest = compute_sha256(pdf_bytes)
                    cred.artifact_digest = digest
                    
                    filename = f"{seq_prefix}_{safe_name}.pdf"
                    file_path = settings.GENERATED_DIR / filename
                    with open(file_path, "wb") as f:
                        f.write(pdf_bytes)
                    cred.pdf_asset_url = f"/storage/generated/{filename}"
                    
                    if zf:
                        zf.writestr(filename, pdf_bytes)
                    last_single_artifact_url = cred.pdf_asset_url
                    last_single_filename = filename
                    
                elif job.output_mode in ("single_png", "zip_png"):
                    img = render_certificate_image(
                        template_dict, elements_list, rec_data, credential_id=cred_id, dpi=settings.DEFAULT_DPI, public_base_url=settings.PUBLIC_BASE_URL
                    )
                    img_buf = io.BytesIO()
                    img.save(img_buf, format="PNG")
                    img_bytes = img_buf.getvalue()
                    
                    digest = compute_sha256(img_bytes)
                    cred.artifact_digest = digest
                    
                    filename = f"{seq_prefix}_{safe_name}.png"
                    file_path = settings.GENERATED_DIR / filename
                    with open(file_path, "wb") as f:
                        f.write(img_bytes)
                    cred.png_asset_url = f"/storage/generated/{filename}"
                    
                    if zf:
                        zf.writestr(filename, img_bytes)
                    last_single_artifact_url = cred.png_asset_url
                    last_single_filename = filename
                    
                elif job.output_mode == "consolidated_pdf":
                    consolidated_items.append({"data": rec_data, "credential_id": cred_id})
                    
                # Audit event for certificate issuance
                db.add(AuditEvent(
                    project_id=project.id,
                    credential_id=cred_id,
                    actor="Issuance Engine",
                    action="issued",
                    metadata_snapshot={"recipient_name": rec_name, "mode": job.output_mode}
                ))
                
                completed_count += 1
            except Exception as e:
                error_count += 1
                errors.append({"recipient_id": rec.id, "error": str(e)})
                
            # Periodically update progress percentage
            job.completed_count = completed_count
            job.error_count = error_count
            job.progress_percentage = round(5.0 + (90.0 * (idx + 1) / total), 1)
            db.commit()
            
        # Finalize batch packaging
        if job.output_mode in ("zip_pdf", "zip_png") and zf:
            zf.close()
            ext = "zip"
            archive_filename = f"batch_{project.id[:8]}_{job.output_mode}_{datetime.now().strftime('%Y%m%d%H%M%S')}.zip"
            archive_path = settings.GENERATED_DIR / archive_filename
            with open(archive_path, "wb") as f:
                f.write(zip_buf.getvalue())
            job.artifact_url = f"/storage/generated/{archive_filename}"
            job.artifact_filename = archive_filename
            
        elif job.output_mode == "consolidated_pdf":
            multi_pdf_bytes = render_consolidated_pdf(
                template_dict, elements_list, consolidated_items, public_base_url=settings.PUBLIC_BASE_URL
            )
            multi_filename = f"consolidated_{project.id[:8]}_{datetime.now().strftime('%Y%m%d%H%M%S')}.pdf"
            multi_path = settings.GENERATED_DIR / multi_filename
            with open(multi_path, "wb") as f:
                f.write(multi_pdf_bytes)
            job.artifact_url = f"/storage/generated/{multi_filename}"
            job.artifact_filename = multi_filename
            
        else:
            job.artifact_url = last_single_artifact_url
            job.artifact_filename = last_single_filename
            
        job.status = "completed" if error_count == 0 else "completed_with_errors"
        job.progress_percentage = 100.0
        job.completed_at = datetime.now(timezone.utc)
        job.error_summary = errors
        db.commit()
        
    except Exception as ex:
        db.rollback()
        job = db.query(IssuanceJob).filter(IssuanceJob.id == job_id).first()
        if job:
            job.status = "failed"
            job.error_summary = [{"error": str(ex)}]
            job.completed_at = datetime.now(timezone.utc)
            db.commit()
    finally:
        db.close()

def launch_issuance_job(job_id: str):
    """Spawns background worker thread for non-blocking asynchronous document generation."""
    thread = threading.Thread(target=process_issuance_job, args=(job_id,), daemon=True)
    thread.start()
    return thread
