from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, computed_field, model_validator

from models import (
    BookingStatus,
    EventCategory,
    EventStatus,
    GuideAvailabilityStatus,
    Review,
    ScheduleStatus,
    User,
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
    guide_id: int | None
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


class VkLoginUrlResponse(BaseModel):
    authorization_url: str
    state: str


class VkExchangeRequest(BaseModel):
    code: str = Field(..., min_length=1)
    state: str = Field(..., min_length=1)


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
    availability_status: GuideAvailabilityStatus = GuideAvailabilityStatus.active


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
    availability_status: GuideAvailabilityStatus | None = None


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
    availability_status: GuideAvailabilityStatus
    average_guide_rating: float | None = Field(
        None,
        description="Средняя оценка гида (guide_rating) по опубликованным отзывам",
    )
    guide_reviews_count: int = Field(
        0,
        description="Число опубликованных отзывов с оценкой гида",
    )


class GuideScheduleBookingBrief(BaseModel):
    """Одна бронь (группа) в рамках сеанса — для отображения гиду."""

    booking_id: int
    status: BookingStatus
    participants_count: int


class GuideMyScheduleItem(BaseModel):
    schedule_id: int
    event_id: int
    event_title: str
    start_datetime: datetime
    end_datetime: datetime
    schedule_status: ScheduleStatus
    participants_count: int
    guide_confirmed_at: datetime | None = None
    guide_rejected_at: datetime | None = None
    guide_reject_reason: str | None = None
    guide_completed_at: datetime | None = None
    bookings: list[GuideScheduleBookingBrief] = Field(default_factory=list)


class GuideRejectRequest(BaseModel):
    reason: str = Field(..., min_length=3, max_length=500)


class GuideScheduleDecisionResponse(BaseModel):
    schedule_id: int
    action: str
    guide_confirmed_at: datetime | None = None
    guide_rejected_at: datetime | None = None
    guide_reject_reason: str | None = None
    guide_completed_at: datetime | None = None


class GuideParticipantItem(BaseModel):
    participant_id: int
    first_name: str
    last_name: str
    patronymic: str | None = None
    age: int | None = None
    is_child: bool
    special_notes: str | None = None


class GuideGroupResponse(BaseModel):
    booking_id: int
    schedule_id: int
    event_id: int
    event_title: str
    start_datetime: datetime
    end_datetime: datetime
    customer_name: str
    customer_email: str | None = None
    customer_phone: str | None = None
    participants: list[GuideParticipantItem]


class GuideAvailabilityUpdate(BaseModel):
    availability_status: GuideAvailabilityStatus


class GuideChatDialogItem(BaseModel):
    admin_id: int
    admin_name: str
    last_message: str
    last_message_at: datetime


class GuideChatSendRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)


class GuideChatMessageResponse(BaseModel):
    id: int
    guide_id: int
    admin_id: int
    sender_user_id: int
    message: str
    created_at: datetime


class GuideRatingReviewItem(BaseModel):
    review_id: int
    event_id: int
    event_title: str
    booking_id: int
    rating: int
    guide_rating: int | None = None
    comment: str | None = None
    created_at: datetime
    author_name: str | None = None


class GuideRatingResponse(BaseModel):
    guide_id: int
    average_guide_rating: float
    reviews_count: int
    reviews: list[GuideRatingReviewItem]


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


class BookingStatusSnapshotResponse(BaseModel):
    """Лёгкий ответ для опроса статуса после редиректа с оплаты."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    status: BookingStatus
    confirmed_at: datetime | None


class BookingAdminStatusUpdate(BaseModel):
    """Изменение статуса бронирования администратором."""

    status: BookingStatus


class BookingDetailResponse(BookingResponse):
    participants: list[ParticipantResponse]
    event: EventBookingInfoResponse
    schedule: ScheduleBriefResponse


class BookingCancelResponse(BaseModel):
    booking: BookingResponse
    refund_id: str | None = None
    refund_initiated: bool = False
    message: str | None = None


class SalesSummaryResponse(BaseModel):
    bookings_total: int
    paid_bookings: int
    revenue_total: Decimal
    period_from: datetime | None = Field(
        None,
        description="Начало применённого периода (дата создания бронирования), если задано в запросе",
    )
    period_to: datetime | None = Field(
        None,
        description="Конец применённого периода (дата создания бронирования), если задано в запросе",
    )


class PopularEventPoint(BaseModel):
    event_id: int
    event_title: str
    bookings_count: int
    participants_count: int
    revenue: Decimal


class AdminReportsResponse(BaseModel):
    sales: SalesSummaryResponse
    popular_events: list[PopularEventPoint]


class AdminCalendarDayItem(BaseModel):
    """Один день в месяце: число подтверждённых броней (сеанс ещё не завершён)."""

    date: date
    confirmed_booking_count: int
    booking_ids: list[int] = Field(default_factory=list)


class AdminCalendarResponse(BaseModel):
    year: int
    month: int
    days: list[AdminCalendarDayItem]


class AdminGuideRefusalItem(BaseModel):
    schedule_id: int
    event_id: int
    event_title: str
    start_datetime: datetime
    rejected_at: datetime
    reject_reason: str
    guide_id: int | None = None
    guide_name: str


class ReviewCreate(BaseModel):
    event_id: int = Field(..., ge=1)
    booking_id: int = Field(..., ge=1)
    guide_rating: int = Field(..., ge=1, le=5, description="Работа гида")
    engagement_rating: int = Field(..., ge=1, le=5, description="Вовлечённость")
    organization_rating: int = Field(..., ge=1, le=5, description="Организация")
    comment: str | None = None


class ReviewUpdate(BaseModel):
    guide_rating: int | None = Field(None, ge=1, le=5)
    engagement_rating: int | None = Field(None, ge=1, le=5)
    organization_rating: int | None = Field(None, ge=1, le=5)
    comment: str | None = None


class ReviewResponse(BaseModel):
    """Отзыв: rating — целое среднее (1–5), average_rating — среднее по критериям (для звёзд)."""

    id: int
    user_id: int
    event_id: int
    booking_id: int
    rating: int
    average_rating: float = Field(
        ...,
        description="Среднее по критериям (половинки звёзд)",
    )
    comment: str | None
    guide_rating: int | None
    engagement_rating: int | None
    organization_rating: int | None = None
    created_at: datetime
    is_published: bool
    author_name: str | None = None


def review_to_response(review: Review, author: User | None = None) -> ReviewResponse:
    g = review.guide_rating
    e = review.engagement_rating
    o = review.organization_rating
    parts = [x for x in (g, e, o) if x is not None]
    if parts:
        avg = sum(parts) / len(parts)
    else:
        avg = float(review.rating)
    author_name: str | None = None
    if author is not None:
        if author.first_name and author.last_name:
            author_name = f"{author.first_name} {author.last_name[0]}."
        elif author.first_name:
            author_name = author.first_name
        else:
            author_name = author.login
    return ReviewResponse(
        id=review.id,
        user_id=review.user_id,
        event_id=review.event_id,
        booking_id=review.booking_id,
        rating=review.rating,
        average_rating=avg,
        guide_rating=g,
        engagement_rating=e,
        organization_rating=o,
        comment=review.comment,
        created_at=review.created_at,
        is_published=review.is_published,
        author_name=author_name,
    )


def compute_review_stored_rating(*scores: int) -> int:
    """Целое среднее 1–5 для поля rating в БД по одному или нескольким критериям."""
    if not scores:
        return 1
    return max(1, min(5, int(round(sum(scores) / len(scores)))))


class EligibleBookingReviewItem(BaseModel):
    booking_id: int
    schedule_end: datetime


class ReviewAdminItem(ReviewResponse):
    event_title: str


class EventDetailResponse(EventResponse):
    schedules: list[ScheduleResponse]
    reviews: list[ReviewResponse]


class EventListResponse(BaseModel):
    items: list[EventResponse]
    total: int
    skip: int
    limit: int


class PopularEventsSelectionUpdate(BaseModel):
    event_ids: list[int] = Field(default_factory=list, max_length=6)
