from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Credential, AuditEvent
from app.schemas import (
    PublicVerificationResponse, CredentialOut, RevokeCredentialRequest, ReissueCredentialRequest, AuditEventOut
)
from app.services.verification_service import VerificationService

router = APIRouter(tags=["Verification"])

@router.get("/public/verify/{credential_id}", response_model=PublicVerificationResponse)
def verify_credential_public(credential_id: str, db: Session = Depends(get_db)):
    """Public verification portal lookup by unique Credential ID or QR code URL."""
    res = VerificationService.get_public_verification(db, credential_id)
    return res

@router.get("/projects/{project_id}/credentials", response_model=List[CredentialOut])
def list_project_credentials(project_id: str, db: Session = Depends(get_db)):
    """Admin endpoint: List all credentials issued for a project."""
    creds = db.query(Credential).filter(Credential.project_id == project_id).order_by(Credential.issued_at.desc()).all()
    return creds

@router.post("/credentials/{credential_id}/revoke", response_model=CredentialOut)
def revoke_credential(credential_id: str, payload: RevokeCredentialRequest, db: Session = Depends(get_db)):
    """Controlled revocation of an issued credential."""
    try:
        cred = VerificationService.revoke_credential(db, credential_id, reason=payload.reason)
        return cred
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/credentials/{credential_id}/reissue", response_model=CredentialOut)
def reissue_credential(credential_id: str, payload: ReissueCredentialRequest, db: Session = Depends(get_db)):
    """Controlled reissuance: revokes old credential and produces a linked corrected credential."""
    try:
        new_cred = VerificationService.reissue_credential(
            db, credential_id, updated_data=payload.updated_data, reason=payload.reason
        )
        return new_cred
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/projects/{project_id}/audit-events", response_model=List[AuditEventOut])
def get_audit_trail(project_id: str, db: Session = Depends(get_db)):
    """Audit trail of all issuance, reissuance, verification, and revocation events."""
    events = db.query(AuditEvent).filter(AuditEvent.project_id == project_id).order_by(AuditEvent.timestamp.desc()).all()
    return events
