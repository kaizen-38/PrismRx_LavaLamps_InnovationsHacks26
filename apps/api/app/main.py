"""FastAPI application factory and setup."""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from app.config import settings
from app.database import init_db, close_db
from app.routers import policies, matrix, ingest

# Configure logging
logging.basicConfig(
    level=settings.LOG_LEVEL,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan events."""
    # Startup
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    await init_db()
    yield
    # Shutdown
    logger.info("Shutting down application")
    await close_db()


def create_app() -> FastAPI:
    """Create and configure FastAPI application."""
    
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="Medical Benefit Drug Policy Intelligence Backend",
        lifespan=lifespan,
    )

    # Middleware: CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Middleware: Trusted Host (optional)
    if settings.ENVIRONMENT == "production":
        app.add_middleware(
            TrustedHostMiddleware,
            allowed_hosts=["prismrx.example.com"],
        )

    # Include routers
    logger.info("Registering routers")
    app.include_router(policies.router, prefix="/api/v1/policies", tags=["policies"])
    app.include_router(matrix.router, prefix="/api/v1/matrix", tags=["matrix"])
    app.include_router(ingest.router, prefix="/api/v1/ingest", tags=["ingest"])

    # Health check endpoint
    @app.get("/health")
    async def health_check():
        """Health check endpoint."""
        return {
            "status": "healthy",
            "app": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "environment": settings.ENVIRONMENT,
        }

    # Root endpoint
    @app.get("/")
    async def root():
        """Root endpoint."""
        return {
            "message": "PrismRx Backend API",
            "version": settings.APP_VERSION,
            "docs": "/docs",
            "openapi_schema": "/openapi.json",
        }

    # Exception handlers
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request, exc):
        logger.error(f"Validation error: {exc}")
        return JSONResponse(
            status_code=422,
            content={
                "detail": "Validation error",
                "errors": exc.errors(),
            },
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(request, exc):
        logger.error(f"Unhandled exception: {exc}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "detail": "Internal server error",
                "message": str(exc) if settings.DEBUG else "An error occurred",
            },
        )

    logger.info("FastAPI application created successfully")
    return app


# Create the application instance
app = create_app()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
    )
