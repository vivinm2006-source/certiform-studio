import os
from pathlib import Path
from pydantic import BaseModel

IS_VERCEL = bool(os.getenv("VERCEL"))
BASE_DIR = Path(__file__).resolve().parent.parent

if IS_VERCEL:
    STORAGE_DIR = Path("/tmp/storage")
else:
    STORAGE_DIR = BASE_DIR / "storage"

UPLOADS_DIR = STORAGE_DIR / "uploads"
GENERATED_DIR = STORAGE_DIR / "generated"

# Ensure storage directories exist
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
GENERATED_DIR.mkdir(parents=True, exist_ok=True)

DEFAULT_DB = "sqlite:////tmp/certiform.db" if IS_VERCEL else f"sqlite:///{BASE_DIR}/certiform.db"

class Settings(BaseModel):
    PROJECT_NAME: str = "CertiForm Studio"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Storage paths
    STORAGE_DIR: Path = STORAGE_DIR
    UPLOADS_DIR: Path = UPLOADS_DIR
    GENERATED_DIR: Path = GENERATED_DIR
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", DEFAULT_DB)
    
    # Public Base URL for QR codes and verification links (configurable)
    PUBLIC_BASE_URL: str = os.getenv("PUBLIC_BASE_URL", "http://localhost:5173")
    
    # Document Rendering Defaults
    DEFAULT_DPI: int = 300
    PREVIEW_DPI: int = 150
    
    # Standard dimensions in points (72 pt = 1 inch)
    # A4 Landscape: 297mm x 210mm = 841.89 x 595.28 pt
    PAGE_SIZES: dict = {
        "A4_LANDSCAPE": {"width": 841.89, "height": 595.28, "label": "A4 Landscape (297 x 210 mm)"},
        "A4_PORTRAIT": {"width": 595.28, "height": 841.89, "label": "A4 Portrait (210 x 297 mm)"},
        "US_LETTER_LANDSCAPE": {"width": 792.0, "height": 612.0, "label": "US Letter Landscape (11 x 8.5 in)"},
        "US_LETTER_PORTRAIT": {"width": 612.0, "height": 792.0, "label": "US Letter Portrait (8.5 x 11 in)"},
        "16_9": {"width": 960.0, "height": 540.0, "label": "Widescreen 16:9"},
    }

settings = Settings()
