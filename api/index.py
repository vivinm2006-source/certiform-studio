import sys
import os
from pathlib import Path

# Add backend directory to sys.path so app modules import cleanly
root_dir = Path(__file__).resolve().parent.parent
backend_dir = root_dir / "backend"

if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Set VERCEL environment flag
os.environ["VERCEL"] = "1"

from app.main import app

# Expose app for Vercel Python runtime
handler = app
