from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.config import settings
from app.database import engine, Base
from app.api import projects, templates, forms, recipients, signatures, issuance, verification

# Initialize database schema
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Production-grade digital certificate design, intake, generation, issuance, and verification platform."
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for uploads and generated documents
app.mount("/storage", StaticFiles(directory=str(settings.STORAGE_DIR)), name="storage")

# Include Routers under API prefix
api_prefix = settings.API_V1_STR
app.include_router(projects.router, prefix=api_prefix)
app.include_router(templates.router, prefix=api_prefix)
app.include_router(forms.router, prefix=api_prefix)
app.include_router(recipients.router, prefix=api_prefix)
app.include_router(signatures.router, prefix=api_prefix)
app.include_router(issuance.router, prefix=api_prefix)
app.include_router(verification.router, prefix=api_prefix)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
