"""
PrismRx — Medical Benefit Drug Policy Tracker
Entry point: runs the FastAPI server.
"""
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

from backend.database.db import init_db
from backend.api.routes import router as policy_router
from backend.api.nl_query import router as nl_router

load_dotenv()

app = FastAPI(
    title="PrismRx",
    description="AI-powered medical benefit drug policy tracker",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:3000"), "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(policy_router)
app.include_router(nl_router)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/health")
def health():
    return {"status": "ok", "service": "PrismRx"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
