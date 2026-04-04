from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def simulate_placeholder():
    return {"message": "simulate endpoint coming soon"}
