"""
PrismRx API — FastAPI entrypoint (merged: rhythm's routing + sam's logging/error handling).
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from .core.config import get_settings
from .core.database import init_db
from .api.ingest import router as ingest_router
from .api.policies import router as policy_router
from .routers import matrix, simulate, diff

# Configure logging
settings = get_settings()
logging.basicConfig(
    level=getattr(logging, settings.log_level, logging.INFO),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting PrismRx API")
    await init_db()
    yield
    logger.info("Shutting down PrismRx API")


app = FastAPI(
    title="PrismRx API",
    description="Medical benefit drug policy intelligence",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest_router)
app.include_router(policy_router)
app.include_router(matrix.router, prefix="/api/v1/matrix", tags=["matrix"])
app.include_router(simulate.router, prefix="/api/v1/simulate", tags=["simulate"])
app.include_router(diff.router, prefix="/api/v1/diff", tags=["diff"])


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "PrismRx"}


@app.get("/")
async def root():
    return {"message": "PrismRx API", "docs": "/docs"}


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    logger.error(f"Validation error: {exc}")
    return JSONResponse(status_code=422, content={"detail": "Validation error", "errors": exc.errors()})


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
