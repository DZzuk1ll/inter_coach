from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    success: bool
    data: T | None = None
    error: str | None = None


def success_response(data: T) -> dict:
    return {"success": True, "data": data}


def error_response(error: str) -> dict:
    return {"success": False, "error": error}
