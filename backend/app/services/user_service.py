import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


async def get_or_create_user(db: AsyncSession, anonymous_id: uuid.UUID) -> User:
    result = await db.execute(select(User).where(User.id == anonymous_id))
    user = result.scalar_one_or_none()

    if user is None:
        user = User(id=anonymous_id)
        db.add(user)
        await db.flush()

    return user


async def get_user(db: AsyncSession, user_id: uuid.UUID) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def delete_user(db: AsyncSession, user_id: uuid.UUID) -> bool:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        return False
    await db.delete(user)
    await db.flush()
    return True
