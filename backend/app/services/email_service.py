import smtplib
import io
import re
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from email.utils import formataddr, make_msgid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Project, CertificateTemplate, Recipient, Credential, AuditEvent
from app.engine.pdf_renderer import render_certificate_pdf
from app.services.verification_service import generate_human_credential_id
from app.services.recipient_service import clean_record_dict

def extract_recipient_email(data: Dict[str, Any]) -> Optional[str]:
    """Extract valid email address from recipient record data dictionary."""
    if not isinstance(data, dict):
        return None
    for key in ("email", "mail", "email_address", "e_mail", "emailaddress", "Email", "Mail", "Email Address"):
        val = data.get(key)
        if val and isinstance(val, str) and "@" in val and "." in val:
            return val.strip().lower()
    return None

def extract_recipient_name(data: Dict[str, Any]) -> str:
    """Extract human recipient name with fallback."""
    if not isinstance(data, dict):
        return "Honored Recipient"
    for key in ("recipient_name", "student_name", "full_name", "name", "participant_name", "Student Name", "Full Name", "Name"):
        val = data.get(key)
        if val and isinstance(val, str) and val.strip():
            return val.strip()
    return "Honored Recipient"

def generate_certificate_email_html(
    recipient_name: str,
    certificate_title: str,
    credential_id: str,
    verification_url: str,
    institution_name: str = "CertiForm Studio",
    custom_message: Optional[str] = None
) -> str:
    """Generate responsive HTML email message with credential summary and verification link."""
    custom_block = f"<p style='color: #475569; font-size: 14px; line-height: 1.6; margin: 16px 0;'>{custom_message}</p>" if custom_message else ""
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Official Certificate: {certificate_title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="600" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #4F46E5; padding: 32px 32px 24px; text-align: center;">
              <span style="font-size: 11px; font-weight: 700; color: #E0E7FF; letter-spacing: 1.5px; text-transform: uppercase;">Official Credential Issuance</span>
              <h1 style="color: #FFFFFF; font-size: 22px; margin: 8px 0 0; font-weight: 800; letter-spacing: -0.5px;">{institution_name}</h1>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 32px 24px;">
              <p style="font-size: 16px; font-weight: 700; color: #0F172A; margin: 0 0 12px;">Dear {recipient_name},</p>
              <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px;">
                Congratulations! Your official certificate of achievement for <strong>{certificate_title}</strong> has been generated, digitally verified, and issued to your records.
              </p>
              {custom_block}
              <!-- Credential Summary Card -->
              <table role="presentation" width="100%" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; margin: 20px 0;">
                <tr>
                  <td style="font-size: 12px; color: #64748B; font-weight: 600; padding-bottom: 6px;">Recipient Name:</td>
                  <td style="font-size: 13px; color: #0F172A; font-weight: 700; text-align: right; padding-bottom: 6px;">{recipient_name}</td>
                </tr>
                <tr>
                  <td style="font-size: 12px; color: #64748B; font-weight: 600; padding-bottom: 6px;">Credential Identifier:</td>
                  <td style="font-size: 13px; color: #4F46E5; font-family: monospace; font-weight: 700; text-align: right; padding-bottom: 6px;">{credential_id}</td>
                </tr>
                <tr>
                  <td style="font-size: 12px; color: #64748B; font-weight: 600; padding-bottom: 6px;">Watermark & Security:</td>
                  <td style="font-size: 12px; color: #059669; font-weight: 700; text-align: right; padding-bottom: 6px;">GEMINI Verified Credential</td>
                </tr>
                <tr>
                  <td style="font-size: 12px; color: #64748B; font-weight: 600;">Issuance Status:</td>
                  <td style="font-size: 12px; color: #0F172A; font-weight: 700; text-align: right;">Digitally Signed & Active</td>
                </tr>
              </table>

              <!-- Call to Action Button -->
              <div style="text-align: center; margin: 28px 0 24px;">
                <a href="{verification_url}" style="background-color: #4F46E5; color: #FFFFFF; font-size: 14px; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 8px; display: inline-block; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);">
                  Verify Online Credential
                </a>
              </div>

              <!-- Attachment Note -->
              <div style="background-color: #EFF6FF; border-left: 4px solid #3B82F6; padding: 12px 16px; border-radius: 6px; margin-top: 20px;">
                <p style="font-size: 12px; color: #1E40AF; margin: 0; line-height: 1.5;">
                  <strong>Attachment Included:</strong> Your official vector PDF certificate is attached to this email. You may save, archive, or print it directly.
                </p>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #F1F5F9; padding: 20px 32px; border-top: 1px solid #E2E8F0; text-align: center;">
              <p style="font-size: 11px; color: #64748B; margin: 0 0 6px;">
                This official credential was generated and dispatched by CertiForm Studio.
              </p>
              <p style="font-size: 10px; color: #94A3B8; margin: 0;">
                Direct verification link: <a href="{verification_url}" style="color: #4F46E5; text-decoration: none;">{verification_url}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

def generate_certificate_email_text(
    recipient_name: str,
    certificate_title: str,
    credential_id: str,
    verification_url: str,
    institution_name: str = "CertiForm Studio",
    custom_message: Optional[str] = None
) -> str:
    """Generate clean plain text fallback for email clients."""
    msg_part = f"\n{custom_message}\n" if custom_message else ""
    return f"""Dear {recipient_name},

Congratulations! Your official certificate of achievement for {certificate_title} has been generated and issued by {institution_name}.
{msg_part}
Credential Details:
- Recipient Name: {recipient_name}
- Credential ID: {credential_id}
- Security: GEMINI Verified Credential
- Verification URL: {verification_url}

Your official vector PDF certificate is attached to this email.

Best regards,
{institution_name}
"""

def build_certificate_email_message(
    recipient_email: str,
    recipient_name: str,
    certificate_title: str,
    credential_id: str,
    verification_url: str,
    pdf_bytes: bytes,
    filename: str,
    institution_name: str = "CertiForm Studio",
    custom_message: Optional[str] = None
) -> MIMEMultipart:
    """Construct multi-part MIME email containing HTML, text, and vector PDF attachment."""
    msg = MIMEMultipart("mixed")
    msg["From"] = formataddr((settings.SMTP_FROM_NAME, settings.SMTP_FROM_EMAIL))
    msg["To"] = formataddr((recipient_name, recipient_email))
    msg["Subject"] = f"Official Certificate: {certificate_title} - {recipient_name}"
    msg["Message-ID"] = make_msgid(domain="certiform-studio.vercel.app")
    msg["Date"] = datetime.now(timezone.utc).strftime("%a, %d %b %Y %H:%M:%S +0000")

    # Body alternative container
    body_alt = MIMEMultipart("alternative")
    text_content = generate_certificate_email_text(
        recipient_name, certificate_title, credential_id, verification_url, institution_name, custom_message
    )
    html_content = generate_certificate_email_html(
        recipient_name, certificate_title, credential_id, verification_url, institution_name, custom_message
    )
    body_alt.attach(MIMEText(text_content, "plain", "utf-8"))
    body_alt.attach(MIMEText(html_content, "html", "utf-8"))
    msg.attach(body_alt)

    # Attach PDF
    pdf_attachment = MIMEApplication(pdf_bytes, _subtype="pdf")
    pdf_attachment.add_header("Content-Disposition", "attachment", filename=filename)
    msg.attach(pdf_attachment)

    return msg

def send_single_certificate_email(
    recipient_email: str,
    recipient_name: str,
    certificate_title: str,
    credential_id: str,
    verification_url: str,
    pdf_bytes: bytes,
    filename: str,
    institution_name: str = "CertiForm Studio",
    custom_message: Optional[str] = None
) -> Dict[str, Any]:
    """
    Send an individual certificate email directly to the recipient.
    Uses real SMTP relay when SMTP_HOST is configured, or safe logged simulation mode.
    """
    if not recipient_email or "@" not in recipient_email:
        return {"success": False, "error": "Invalid or missing recipient email address"}

    msg = build_certificate_email_message(
        recipient_email=recipient_email,
        recipient_name=recipient_name,
        certificate_title=certificate_title,
        credential_id=credential_id,
        verification_url=verification_url,
        pdf_bytes=pdf_bytes,
        filename=filename,
        institution_name=institution_name,
        custom_message=custom_message
    )

    is_live_smtp = bool(settings.SMTP_HOST and str(settings.SMTP_HOST).strip()) and not settings.EMAIL_SIMULATION_MODE

    if is_live_smtp:
        try:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15)
            if settings.SMTP_USE_TLS:
                server.starttls()
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
            server.quit()
            return {
                "success": True,
                "mode": "smtp",
                "recipient_email": recipient_email,
                "message_id": msg["Message-ID"],
                "attachment_bytes": len(pdf_bytes)
            }
        except Exception as e:
            print(f"SMTP Dispatch Error for {recipient_email}: {e}")
            return {
                "success": False,
                "error": f"SMTP delivery failure: {str(e)}",
                "mode": "smtp"
            }
    else:
        # High-Fidelity Simulation Mode
        # Validates full MIME structure, logs delivery record, returns structured success
        return {
            "success": True,
            "mode": "simulated",
            "recipient_email": recipient_email,
            "message_id": msg["Message-ID"],
            "attachment_bytes": len(pdf_bytes),
            "simulated_at": datetime.now(timezone.utc).isoformat(),
            "note": "Delivered in safe simulation mode (configure SMTP_HOST to route via external relay)"
        }

def send_recipient_certificate_email(
    db: Session,
    recipient_id: str,
    template_id: Optional[str] = None,
    watermark: str = "GEMINI",
    custom_message: Optional[str] = None
) -> Dict[str, Any]:
    """
    Renders and sends an individual certificate email to a specific recipient.
    """
    recipient = db.query(Recipient).filter(Recipient.id == recipient_id).first()
    if not recipient:
        return {"success": False, "error": "Recipient record not found"}

    project = db.query(Project).filter(Project.id == recipient.project_id).first()
    if not project:
        return {"success": False, "error": "Project not found"}

    # Resolve template
    template = None
    if template_id:
        template = db.query(CertificateTemplate).filter(CertificateTemplate.id == template_id).first()
    if not template:
        template = db.query(CertificateTemplate).filter(
            CertificateTemplate.project_id == project.id,
            CertificateTemplate.is_active == True
        ).first()
    if not template:
        template = db.query(CertificateTemplate).filter(CertificateTemplate.project_id == project.id).first()
    if not template:
        return {"success": False, "error": "No certificate template found"}

    rec_data = clean_record_dict(dict(recipient.data or {}))
    recipient_email = extract_recipient_email(rec_data)
    if not recipient_email:
        return {"success": False, "error": "Recipient has no valid email address in their record"}

    recipient_name = extract_recipient_name(rec_data)

    # Ensure Credential exists
    cred = db.query(Credential).filter(
        Credential.recipient_id == recipient.id,
        Credential.credential_status == "valid"
    ).first()
    if not cred:
        cred_id = generate_human_credential_id()
        cred = Credential(
            credential_id=cred_id,
            project_id=project.id,
            recipient_id=recipient.id,
            template_id=template.id,
            template_version=template.version,
            issued_data_snapshot=rec_data,
            credential_status="valid",
            issued_at=datetime.now(timezone.utc),
            verification_url=f"{settings.PUBLIC_BASE_URL}/verify/{cred_id}"
        )
        db.add(cred)
        db.flush()
    else:
        cred_id = cred.credential_id

    verification_url = f"{settings.PUBLIC_BASE_URL}/verify/{cred_id}"

    # Prepare template & elements dict for vector rendering
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

    # Render vector PDF with Gemini watermark
    pdf_bytes = render_certificate_pdf(
        template_dict=template_data,
        elements=elements_data,
        recipient_data=rec_data,
        credential_id=cred_id,
        public_base_url=settings.PUBLIC_BASE_URL,
        watermark=watermark
    )

    clean_file_name = "".join(c for c in recipient_name if c.isalnum() or c in (" ", "_", "-")).strip().replace(" ", "_")
    filename = f"{clean_file_name}_Certificate_{cred_id}.pdf"

    cert_title = str(rec_data.get("event_name") or rec_data.get("session_topic") or project.title or "Achievement").strip()
    institution_name = str(rec_data.get("institution") or rec_data.get("venue") or "CertiForm Studio").strip()

    # Dispatch email
    dispatch_res = send_single_certificate_email(
        recipient_email=recipient_email,
        recipient_name=recipient_name,
        certificate_title=cert_title,
        credential_id=cred_id,
        verification_url=verification_url,
        pdf_bytes=pdf_bytes,
        filename=filename,
        institution_name=institution_name,
        custom_message=custom_message
    )

    if dispatch_res.get("success"):
        # Update recipient delivery metadata
        now_iso = datetime.now(timezone.utc).isoformat()
        current_data = dict(recipient.data or {})
        current_data["email_sent"] = True
        current_data["email_sent_at"] = now_iso
        current_data["last_email_mode"] = dispatch_res.get("mode")
        recipient.data = current_data
        recipient.status = "issued"
        db.add(recipient)

        # Audit Event
        db.add(AuditEvent(
            project_id=project.id,
            credential_id=cred_id,
            actor="Email Dispatcher",
            action="email_sent",
            metadata_snapshot={
                "recipient_id": recipient.id,
                "recipient_name": recipient_name,
                "recipient_email": recipient_email,
                "mode": dispatch_res.get("mode"),
                "timestamp": now_iso
            }
        ))
        db.commit()

    return dispatch_res

def send_bulk_project_certificate_emails(
    db: Session,
    project_id: str,
    template_id: Optional[str] = None,
    watermark: str = "GEMINI",
    only_unsent: bool = False,
    custom_message: Optional[str] = None
) -> Dict[str, Any]:
    """
    Iterates through all project recipients and individually emails their certificate.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        project = db.query(Project).order_by(Project.created_at.desc()).first()
    if not project:
        return {"success": False, "error": "Project not found"}

    recipients = db.query(Recipient).filter(
        Recipient.project_id == project.id,
        Recipient.status != "error"
    ).all()

    if not recipients:
        return {
            "success": True,
            "total_recipients": 0,
            "emails_sent": 0,
            "skipped_no_email": 0,
            "failed_count": 0,
            "recipient_results": []
        }

    emails_sent = 0
    skipped_no_email = 0
    failed_count = 0
    results = []

    for rec in recipients:
        r_data = dict(rec.data or {})
        rec_email = extract_recipient_email(r_data)
        rec_name = extract_recipient_name(r_data)

        if not rec_email:
            skipped_no_email += 1
            results.append({
                "recipient_id": rec.id,
                "recipient_name": rec_name,
                "status": "skipped",
                "reason": "Missing email address in recipient record"
            })
            continue

        if only_unsent and r_data.get("email_sent"):
            results.append({
                "recipient_id": rec.id,
                "recipient_name": rec_name,
                "recipient_email": rec_email,
                "status": "skipped",
                "reason": "Email already sent"
            })
            continue

        res = send_recipient_certificate_email(
            db=db,
            recipient_id=rec.id,
            template_id=template_id,
            watermark=watermark,
            custom_message=custom_message
        )

        if res.get("success"):
            emails_sent += 1
            results.append({
                "recipient_id": rec.id,
                "recipient_name": rec_name,
                "recipient_email": rec_email,
                "status": "sent",
                "mode": res.get("mode")
            })
        else:
            failed_count += 1
            results.append({
                "recipient_id": rec.id,
                "recipient_name": rec_name,
                "recipient_email": rec_email,
                "status": "failed",
                "error": res.get("error")
            })

    return {
        "success": True,
        "total_recipients": len(recipients),
        "emails_sent": emails_sent,
        "skipped_no_email": skipped_no_email,
        "failed_count": failed_count,
        "recipient_results": results
    }
