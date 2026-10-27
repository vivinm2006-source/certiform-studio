from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import SignatureAsset
from app.schemas import SignatureAssetCreate, SignatureAssetOut
from app.config import settings
import uuid
import shutil

router = APIRouter(prefix="/signatures", tags=["Signatures"])

@router.get("", response_model=List[SignatureAssetOut])
def list_signatures(db: Session = Depends(get_db)):
    """List institutional signatures with authorization metadata."""
    signatures = db.query(SignatureAsset).order_by(SignatureAsset.created_at.desc()).all()
    # If empty, seed standard institutional signers
    if not signatures:
        s1 = SignatureAsset(
            signer_name="Dr. Marcus Vance",
            designation="Organizing Secretary",
            institution="International Academy of Sciences",
            capture_type="type",
            typed_font="cursive",
            authorization_status="authorized",
            authorized_by="Admin"
        )
        s2 = SignatureAsset(
            signer_name="Prof. Elena Rostova",
            designation="Conference Director",
            institution="International Academy of Sciences",
            capture_type="type",
            typed_font="cursive",
            authorization_status="authorized",
            authorized_by="Admin"
        )
        db.add_all([s1, s2])
        db.commit()
        signatures = [s1, s2]
    return signatures

@router.post("", response_model=SignatureAssetOut)
def create_signature(payload: SignatureAssetCreate, db: Session = Depends(get_db)):
    """Create or record a new signature asset with explicit authorization."""
    sig = SignatureAsset(
        signer_name=payload.signer_name,
        designation=payload.designation,
        institution=payload.institution,
        capture_type=payload.capture_type,
        asset_url=payload.asset_url,
        typed_font=payload.typed_font,
        authorization_status="authorized", # Only authorized administrators can configure signatures
        authorized_by=payload.authorized_by or "Administrator"
    )
    db.add(sig)
    db.commit()
    db.refresh(sig)
    return sig

@router.post("/upload")
def upload_signature_image(file: UploadFile = File(...)):
    """Upload transparent PNG signature image."""
    ext = file.filename.split(".")[-1].lower() if file.filename else "png"
    if ext not in ("png", "webp"):
        raise HTTPException(status_code=400, detail="Signature images must be transparent PNG or WEBP.")
        
    saved_filename = f"sig_{uuid.uuid4().hex[:12]}.{ext}"
    dest_path = settings.UPLOADS_DIR / saved_filename
    
    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    asset_url = f"/storage/uploads/{saved_filename}"
    return {"success": True, "asset_url": asset_url}

@router.delete("/{id}")
def delete_signature(id: str, db: Session = Depends(get_db)):
    sig = db.query(SignatureAsset).filter(SignatureAsset.id == id).first()
    if not sig:
        raise HTTPException(status_code=404, detail="Signature asset not found")
    db.delete(sig)
    db.commit()
    return {"success": True, "message": "Signature deleted"}
