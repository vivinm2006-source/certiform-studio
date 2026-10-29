from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Project, Recipient, Credential
from app.schemas import ProjectCreate, ProjectUpdate, ProjectOut
from app.services.project_service import create_default_project

router = APIRouter(prefix="/projects", tags=["Projects"])

@router.get("", response_model=List[ProjectOut])
def list_projects(db: Session = Depends(get_db)):
    projects = db.query(Project).order_by(Project.created_at.desc()).all()
    # If no projects exist, seed a sample default project
    if not projects:
        default_proj = create_default_project(db)
        projects = [default_proj]
        
    out = []
    for p in projects:
        rec_count = db.query(Recipient).filter(Recipient.project_id == p.id).count()
        issued_count = db.query(Credential).filter(
            Credential.project_id == p.id,
            Credential.credential_status == "valid"
        ).count()
        
        p_dict = {
            "id": p.id,
            "organization_id": p.organization_id,
            "title": p.title,
            "description": p.description,
            "status": p.status,
            "created_by": p.created_by,
            "created_at": p.created_at,
            "updated_at": p.updated_at,
            "templates": p.templates,
            "forms": p.forms,
            "recipient_count": rec_count,
            "issued_count": issued_count
        }
        out.append(p_dict)
    return out

@router.post("", response_model=ProjectOut)
def create_project(data: ProjectCreate, db: Session = Depends(get_db)):
    proj = create_default_project(db, title=data.title, description=data.description or "")
    rec_count = db.query(Recipient).filter(Recipient.project_id == proj.id).count()
    issued_count = db.query(Credential).filter(Credential.project_id == proj.id, Credential.credential_status == "valid").count()
    
    return {
        "id": proj.id,
        "organization_id": proj.organization_id,
        "title": proj.title,
        "description": proj.description,
        "status": proj.status,
        "created_by": proj.created_by,
        "created_at": proj.created_at,
        "updated_at": proj.updated_at,
        "templates": proj.templates,
        "forms": proj.forms,
        "recipient_count": rec_count,
        "issued_count": issued_count
    }

@router.get("/{id}", response_model=ProjectOut)
def get_project(id: str, db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == id).first()
    if not proj:
        proj = db.query(Project).order_by(Project.created_at.desc()).first()
    if not proj:
        proj = create_default_project(db)
        
    rec_count = db.query(Recipient).filter(Recipient.project_id == proj.id).count()
    issued_count = db.query(Credential).filter(Credential.project_id == proj.id, Credential.credential_status == "valid").count()
    
    return {
        "id": proj.id,
        "organization_id": proj.organization_id,
        "title": proj.title,
        "description": proj.description,
        "status": proj.status,
        "created_by": proj.created_by,
        "created_at": proj.created_at,
        "updated_at": proj.updated_at,
        "templates": proj.templates,
        "forms": proj.forms,
        "recipient_count": rec_count,
        "issued_count": issued_count
    }

@router.patch("/{id}", response_model=ProjectOut)
def update_project(id: str, data: ProjectUpdate, db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
        
    if data.title is not None: proj.title = data.title
    if data.description is not None: proj.description = data.description
    if data.status is not None: proj.status = data.status
    
    db.commit()
    db.refresh(proj)
    
    rec_count = db.query(Recipient).filter(Recipient.project_id == proj.id).count()
    issued_count = db.query(Credential).filter(Credential.project_id == proj.id, Credential.credential_status == "valid").count()
    
    return {
        "id": proj.id,
        "organization_id": proj.organization_id,
        "title": proj.title,
        "description": proj.description,
        "status": proj.status,
        "created_by": proj.created_by,
        "created_at": proj.created_at,
        "updated_at": proj.updated_at,
        "templates": proj.templates,
        "forms": proj.forms,
        "recipient_count": rec_count,
        "issued_count": issued_count
    }
