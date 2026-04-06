from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, computed_field, model_validator

from models import (
    BookingStatus,
    EventCategory,
    EventStatus,
    ScheduleStatus,
    UserRole,
)


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
    fcm_token: str | None = None


class UserUpdate(BaseModel):
    login: str | None = Field(None, min_length=1, max_length=255)
    email: EmailStr | None = None
    password: str | None = Field(None, min_length=8, max_length=128)
    first_name: str | None = Field(None, max_length=255)
    last_name: str | None = Field(None, max_length=255)
    patronymic: str | None = Field(None, max_length=255)
    phone: str | None = Field(None, max_length=32)
    fcm_token: str | None = Field(
        None,
        description="FCM-токен (мобильное приложение или Web Push через Firebase)",
    )


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


# --- Мероприятия (events) ---


class EventCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=512)
    description: str | None = None
    category: EventCategory
    target_audience: str | None = Field(None, max_length=512)
    duration_minutes: int | None = Field(None, ge=1)
    max_participants: int | None = Field(None, ge=1)
    base_price: Decimal = Field(default=Decimal("0"), ge=0)
    status: EventStatus = EventStatus.active
    meeting_point: str | None = None
    cover_image_url: str | None = Field(None, max_length=1024)


class EventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str | None
    category: EventCategory
    target_audience: str | None
    duration_minutes: int | None
    max_participants: int | None
    base_price: Decimal
    status: EventStatus
    meeting_point: str | None
    cover_image_url: str | None
    created_at: datetime
    updated_at: datetime


class EventUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=512)
    description: str | None = None
    category: EventCategory | None = None
    target_audience: str | None = Field(None, max_length=512)
    duration_minutes: int | None = Field(None, ge=1)
    max_participants: int | None = Field(None, ge=1)
    base_price: Decimal | None = Field(None, ge=0)
    status: EventStatus | None = None
    meeting_point: str | None = None
    cover_image_url: str | None = Field(None, max_length=1024)


class ScheduleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    event_id: int
    start_datetime: datetime
    end_datetime: datetime
    available_slots: int
    status: ScheduleStatus
    guide_id: int | None


class ScheduleBookingInfoResponse(BaseModel):
    """Сеанс + данные мероприятия для страницы бронирования (публично)."""

    id: int
    event_id: int
    event_title: str
    base_price: Decimal
    start_datetime: datetime
    end_datetime: datetime
    available_slots: int
    status: ScheduleStatus


class ScheduleCreate(BaseModel):
    event_id: int = Field(..., ge=1)
    start_datetime: datetime
    end_datetime: datetime
    available_slots: int = Field(..., ge=0)
    status: ScheduleStatus = ScheduleStatus.open
    guide_id: int | None = Field(None, ge=1)

    @model_validator(mode="after")
    def validate_interval(self) -> ScheduleCreate:
        if self.end_datetime <= self.start_datetime:
            raise ValueError("end_datetime должно быть позже start_datetime")
        return self


class ScheduleUpdate(BaseModel):
    start_datetime: datetime | None = None
    end_datetime: datetime | None = None
    available_slots: int | None = Field(None, ge=0)
    status: ScheduleStatus | None = None
    guide_id: int | None = Field(None, ge=1)


class GuideCreate(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=255)
    last_name: str = Field(..., min_length=1, max_length=255)
    patronymic: str | None = Field(None, max_length=255)
    phone: str | None = Field(None, max_length=32)
    email: str | None = Field(None, max_length=255)
    photo_url: str | None = Field(None, max_length=1024)
    specialization: str | None = Field(None, max_length=512)
    hire_date: date | None = None
    is_active: bool = True


class GuideUpdate(BaseModel):
    first_name: str | None = Field(None, min_length=1, max_length=255)
    last_name: str | None = Field(None, min_length=1, max_length=255)
    patronymic: str | None = Field(None, max_length=255)
    phone: str | None = Field(None, max_length=32)
    email: str | None = Field(None, max_length=255)
    photo_url: str | None = Field(None, max_length=1024)
    specialization: str | None = Field(None, max_length=512)
    hire_date: date | None = None
    is_active: bool | None = None


class GuideResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    first_name: str
    last_name: str
    patronymic: str | None
    phone: str | None
    email: str | None
    photo_url: str | None
    specialization: str | None
    hire_date: date | None
    is_active: bool


class ParticipantCreate(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=255)
    last_name: str = Field(..., min_length=1, max_length=255)
    patronymic: str | None = Field(None, max_length=255)
    age: int | None = Field(None, ge=0, le=120)
    is_child: bool = True
    special_notes: str | None = None


class BookingCreate(BaseModel):
    schedule_id: int = Field(..., ge=1)
    participants_count: int = Field(..., ge=1)
    customer_notes: str | None = None
    participants: list[ParticipantCreate]

    @model_validator(mode="after")
    def participants_match_count(self) -> BookingCreate:
        if len(self.participants) != self.participants_count:
            raise ValueError(
                "Число записей в participants должно совпадать с participants_count",
            )
        return self


class BookingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    schedule_id: int
    status: BookingStatus
    participants_count: int
    total_price: Decimal
    customer_notes: str | None
    created_at: datetime
    confirmed_at: datetime | None
    payment_url: str | None = None
    payment_id: str | None = None
    # Для списка «Мои бронирования» (подгружаются в роутере)
    event_title: str | None = None
    schedule_start_datetime: datetime | None = None

    @computed_field
    @property
    def booking_id(self) -> int:
        return self.id


class ParticipantResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    first_name: str
    last_name: str
    patronymic: str | None
    age: int | None
    is_child: bool
    special_notes: str | None


class EventBriefResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str


class EventBookingInfoResponse(BaseModel):
    """Краткая карточка мероприятия в деталях бронирования."""

    id: int
    title: str
    description: str | None
    meeting_point: str | None
    duration_minutes: int | None
    category: EventCategory
    base_price: Decimal


class ScheduleBriefResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    start_datetime: datetime
    end_datetime: datetime
    status: ScheduleStatus


class BookingDetailResponse(BookingResponse):
    participants: list[ParticipantResponse]
    event: EventBookingInfoResponse
    schedule: ScheduleBriefResponse
    qr_code_data_uri: str = ""


class BookingCancelResponse(BaseModel):
    booking: BookingResponse
    refund_id: str | None = None
    refund_initiated: bool = False
    message: str | None = None


class ReviewCreate(BaseModel):
    event_id: int = Field(..., ge=1)
    booking_id: int = Field(..., ge=1)
    rating: int = Field(..., ge=1, le=5)
    comment: str | None = None
    guide_rating: int | None = Field(None, ge=1, le=5)


class ReviewUpdate(BaseModel):
    rating: int | None = Field(None, ge=1, le=5)
    comment: str | None = None
    guide_rating: int | None = Field(None, ge=1, le=5)


class ReviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    event_id: int
    booking_id: int
    rating: int
    comment: str | None
    guide_rating: int | None
    created_at: datetime
    is_published: bool


class EventDetailResponse(EventResponse):
    schedules: list[ScheduleResponse]
    reviews: list[ReviewResponse]


class EventListResponse(BaseModel):
    items: list[EventResponse]
    total: int
    skip: int
    limit: int
