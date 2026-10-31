from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.config import settings, BASE_DIR
from app.database import engine, Base
from app.api import projects, templates, forms, recipients, signatures, issuance, verification, qa_testing

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
try:
    settings.STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    app.mount("/storage", StaticFiles(directory=str(settings.STORAGE_DIR)), name="storage")
except Exception:
    pass

@app.on_event("startup")
async def startup_event():
    """Optimize AnyIO worker thread pool for high concurrency throughput."""
    try:
        import anyio
        limiter = anyio.to_thread.current_default_thread_limiter()
        limiter.total_tokens = 500
    except Exception as e:
        print("Thread limiter optimization warning:", e)

# Include Routers under API prefix
api_prefix = settings.API_V1_STR
app.include_router(projects.router, prefix=api_prefix)
app.include_router(templates.router, prefix=api_prefix)
app.include_router(forms.router, prefix=api_prefix)
app.include_router(recipients.router, prefix=api_prefix)
app.include_router(signatures.router, prefix=api_prefix)
app.include_router(issuance.router, prefix=api_prefix)
app.include_router(verification.router, prefix=api_prefix)
app.include_router(qa_testing.router, prefix=api_prefix)

# Also support /v1 for direct serverless rewrites
app.include_router(projects.router, prefix="/v1")
app.include_router(templates.router, prefix="/v1")
app.include_router(forms.router, prefix="/v1")
app.include_router(recipients.router, prefix="/v1")
app.include_router(signatures.router, prefix="/v1")
app.include_router(issuance.router, prefix="/v1")
app.include_router(verification.router, prefix="/v1")
app.include_router(qa_testing.router, prefix="/v1")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    tb = traceback.format_exc()
    print("GLOBAL EXCEPTION:", tb)
    return JSONResponse(status_code=500, content={"detail": str(exc), "traceback": tb})

@app.exception_handler(404)
async def custom_404_handler(request: Request, exc):
    return JSONResponse(
        status_code=404,
        content={
            "detail": "Not Found",
            "scope_path": request.scope.get("path"),
            "scope_root_path": request.scope.get("root_path"),
            "url": str(request.url),
            "raw_path": request.scope.get("raw_path", b"").decode("latin1", errors="replace")
        }
    )

@app.get("/api")
def api_root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION
    }

@app.get("/api/health")
@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION
    }

# Serve built frontend assets
frontend_dist = BASE_DIR.parent / "frontend" / "dist"
if (frontend_dist / "index.html").exists():
    if (frontend_dist / "assets").exists():
        app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="static_assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa_frontend(full_path: str):
        if full_path.startswith("api") or full_path.startswith("storage") or full_path.startswith("health"):
            return JSONResponse(status_code=404, content={"detail": "Not Found"})
        file_path = frontend_dist / full_path
        if full_path and file_path.is_file():
            return FileResponse(str(file_path))
        resp = FileResponse(str(frontend_dist / "index.html"))
        resp.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
        resp.headers["Pragma"] = "no-cache"
        resp.headers["Expires"] = "0"
        resp.headers["Clear-Site-Data"] = '"cache"'
        return resp

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
