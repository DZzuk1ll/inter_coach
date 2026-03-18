from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db_session
from app.dependencies import get_anonymous_user
from app.models.user import User
from app.schemas.common import success_response
from app.schemas.user import UserRead
from app.services.user_service import delete_user

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me")
async def get_current_user(user: User = Depends(get_anonymous_user)):
    return success_response(UserRead.model_validate(user))


@router.delete("/me")
async def delete_current_user(
    user: User = Depends(get_anonymous_user),
    db: AsyncSession = Depends(get_db_session),
):
    deleted = await delete_user(db, user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="User not found")
    return success_response({"message": "所有数据已删除"})
