from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def diff_placeholder():
    return {"message": "diff endpoint coming soon"}
