from __future__ import annotations

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from models import UserRole


class UserCreate(BaseModel):
    login: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    first_name: str | None = Field(None, max_length=255)
    last_name: str | None = Field(None, max_length=255)
    patronymic: str | None = Field(None, max_length=255)
    phone: str | None = Field(None, max_length=32)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    login: str
    email: str
    role: UserRole
    first_name: str | None
    last_name: str | None
    patronymic: str | None
    phone: str | None
    avatar_url: str | None
    is_active: bool


class UserUpdate(BaseModel):
    login: str | None = Field(None, min_length=1, max_length=255)
    email: EmailStr | None = None
    password: str | None = Field(None, min_length=8, max_length=128)
    first_name: str | None = Field(None, max_length=255)
    last_name: str | None = Field(None, max_length=255)
    patronymic: str | None = Field(None, max_length=255)
    phone: str | None = Field(None, max_length=32)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    login: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Логин или email",
    )
    password: str = Field(..., min_length=1, max_length=128)
