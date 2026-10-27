import hashlib
import random
import string
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models import Credential, Recipient, Project, AuditEvent
from app.config import settings

def generate_human_credential_id(counter: int = 1) -> str:
    """Generate human-readable credential ID, e.g., CERT-2026-000125."""
    year = datetime.now().year
    # 6-digit padded number or random alphanumeric if collision
    rand_suffix = "".join(random.choices(string.digits, k=6))
    return f"CERT-{year}-{rand_suffix}"

def compute_sha256(data_bytes: bytes) -> str:
    """Calculate SHA-256 digest of artifact."""
    return hashlib.sha256(data_bytes).hexdigest()

class VerificationService:
    @staticmethod
    def get_public_verification(db: Session, credential_id: str) -> Dict[str, Any]:
        """Query public verification record for a given credential ID."""
        cred = db.query(Credential).filter(
            (Credential.credential_id == credential_id) | (Credential.id == credential_id)
        ).first()
        
        if not cred:
            return {
                "status": "not_found",
                "credential_id": credential_id,
                "certificate_title": None,
                "recipient_name": None,
                "issuing_organization": None,
                "issued_at": None,
                "revoked_at": None,
                "revocation_reason": None,
                "read_only_preview_url": None,
                "artifact_digest": None
            }
            
        proj = db.query(Project).filter(Project.id == cred.project_id).first()
        snapshot = cred.issued_data_snapshot or {}
        
        # Privacy: show recipient name if present
        rec_name = snapshot.get("recipient_name", snapshot.get("full_name", "Authorized Recipient"))
        
        # Record audit event for verification lookup
        audit = AuditEvent(
            project_id=cred.project_id,
            credential_id=cred.credential_id,
            actor="Public Verifier",
            action="verified",
            metadata_snapshot={"status": cred.credential_status, "verified_at": datetime.now(timezone.utc).isoformat()}
        )
        db.add(audit)
        db.commit()
        
        return {
            "status": cred.credential_status,
            "credential_id": cred.credential_id,
            "certificate_title": proj.title if proj else "Certificate of Achievement",
            "recipient_name": rec_name,
            "issuing_organization": (proj.organization.name if (proj and proj.organization) else "CertiForm Issuing Authority"),
            "issued_at": cred.issued_at,
            "revoked_at": cred.revoked_at,
            "revocation_reason": cred.revocation_reason,
            "read_only_preview_url": cred.png_asset_url or cred.pdf_asset_url,
            "artifact_digest": cred.artifact_digest
        }
        
    @staticmethod
    def revoke_credential(db: Session, credential_id: str, reason: str, actor: str = "Administrator") -> Credential:
        """Revoke an issued credential with an audit reason."""
        cred = db.query(Credential).filter(
            (Credential.credential_id == credential_id) | (Credential.id == credential_id)
        ).first()
        if not cred:
            raise ValueError(f"Credential '{credential_id}' not found.")
            
        cred.credential_status = "revoked"
        cred.revoked_at = datetime.now(timezone.utc)
        cred.revocation_reason = reason
        
        audit = AuditEvent(
            project_id=cred.project_id,
            credential_id=cred.credential_id,
            actor=actor,
            action="revoked",
            metadata_snapshot={"reason": reason, "revoked_at": cred.revoked_at.isoformat()}
        )
        db.add(audit)
        db.commit()
        db.refresh(cred)
        return cred

    @staticmethod
    def reissue_credential(
        db: Session,
        old_credential_id: str,
        updated_data: Dict[str, Any],
        reason: str,
        actor: str = "Administrator"
    ) -> Credential:
        """
        Perform a controlled reissuance.
        Revokes old credential with pointer to new credential, and generates new credential with reference to old.
        """
        old_cred = db.query(Credential).filter(
            (Credential.credential_id == old_credential_id) | (Credential.id == old_credential_id)
        ).first()
        if not old_cred:
            raise ValueError(f"Credential '{old_credential_id}' not found.")
            
        new_cred_id = generate_human_credential_id()
        now = datetime.now(timezone.utc)
        
        # 1. Revoke old credential
        old_cred.credential_status = "revoked"
        old_cred.revoked_at = now
        old_cred.revocation_reason = f"Replaced by reissued credential {new_cred_id}. Reason: {reason}"
        
        # 2. Update recipient table record
        rec = db.query(Recipient).filter(Recipient.id == old_cred.recipient_id).first()
        if rec:
            merged = dict(rec.data or {})
            merged.update(updated_data)
            rec.data = merged
            rec.status = "issued"
            db.add(rec)
            
        # 3. Create new credential snapshot
        new_cred = Credential(
            credential_id=new_cred_id,
            project_id=old_cred.project_id,
            recipient_id=old_cred.recipient_id,
            template_id=old_cred.template_id,
            template_version=old_cred.template_version,
            issued_data_snapshot=updated_data,
            credential_status="valid",
            issued_at=now,
            verification_url=f"{settings.PUBLIC_BASE_URL}/verify/{new_cred_id}",
            replaced_credential_id=old_cred.credential_id
        )
        db.add(new_cred)
        
        # 4. Audit events
        db.add(AuditEvent(
            project_id=old_cred.project_id,
            credential_id=old_cred.credential_id,
            actor=actor,
            action="superseded_by_reissuance",
            metadata_snapshot={"replaced_by": new_cred_id, "reason": reason}
        ))
        db.add(AuditEvent(
            project_id=old_cred.project_id,
            credential_id=new_cred_id,
            actor=actor,
            action="reissued",
            metadata_snapshot={"replaces": old_cred.credential_id, "reason": reason}
        ))
        
        db.commit()
        db.refresh(new_cred)
        return new_cred
