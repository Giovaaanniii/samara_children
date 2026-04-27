from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from enum import Enum as PyEnum

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


# --- Перечисления (хранятся в БД как имена значений) ---


class UserRole(str, PyEnum):
    client = "client"
    admin = "admin"
    guide = "guide"


class EventCategory(str, PyEnum):
    excursion = "excursion"
    quest = "quest"
    workshop = "workshop"


class EventStatus(str, PyEnum):
    active = "active"
    suspended = "suspended"
    archived = "archived"


class ScheduleStatus(str, PyEnum):
    open = "open"
    closed = "closed"
    cancelled = "cancelled"
    completed = "completed"


class GuideAvailabilityStatus(str, PyEnum):
    active = "active"
    busy = "busy"
    vacation = "vacation"
    sick = "sick"


class BookingStatus(str, PyEnum):
    pending = "pending"  # ожидает оплаты
    confirmed = "confirmed"
    cancelled = "cancelled"
    completed = "completed"


class PaymentMethod(str, PyEnum):
    card_online = "card_online"
    cash = "cash"
    transfer = "transfer"


class TransactionStatus(str, PyEnum):
    pending = "pending"
    completed = "completed"
    failed = "failed"
    refunded = "refunded"


class SettingDataType(str, PyEnum):
    number = "number"
    string = "string"
    boolean = "boolean"


# --- Модели ---


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    login: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role", native_enum=True),
        default=UserRole.client,
    )
    first_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    patronymic: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    guide_id: Mapped[int | None] = mapped_column(
        ForeignKey("guides.id", ondelete="SET NULL"),
        nullable=True,
        unique=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    last_login_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    auth_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    oauth_provider: Mapped[str | None] = mapped_column(String(32), nullable=True)
    oauth_provider_user_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    vk_user_id: Mapped[int | None] = mapped_column(BigInteger, unique=True, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    # FCM (мобильное приложение или Web Push через Firebase)
    fcm_token: Mapped[str | None] = mapped_column(Text, nullable=True)

    bookings: Mapped[list[Booking]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    reviews: Mapped[list[Review]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    guide_profile: Mapped[Guide | None] = relationship(
        back_populates="user_account",
        foreign_keys=[guide_id],
    )


class Guide(Base):
    __tablename__ = "guides"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    first_name: Mapped[str] = mapped_column(String(255))
    last_name: Mapped[str] = mapped_column(String(255))
    patronymic: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    specialization: Mapped[str | None] = mapped_column(String(512), nullable=True)
    hire_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    availability_status: Mapped[GuideAvailabilityStatus] = mapped_column(
        Enum(
            GuideAvailabilityStatus,
            name="guide_availability_status",
            native_enum=False,
            validate_strings=True,
        ),
        default=GuideAvailabilityStatus.active,
    )

    schedules: Mapped[list[Schedule]] = relationship(
        back_populates="guide",
        foreign_keys="Schedule.guide_id",
    )
    user_account: Mapped[User | None] = relationship(
        back_populates="guide_profile",
        foreign_keys=[User.guide_id],
    )
    salary_events: Mapped[list[GuideSalaryEvent]] = relationship(
        back_populates="guide",
        cascade="all, delete-orphan",
    )
    chat_messages: Mapped[list[GuideChatMessage]] = relationship(
        back_populates="guide",
        cascade="all, delete-orphan",
    )


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(512))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[EventCategory] = mapped_column(
        Enum(EventCategory, name="event_category", native_enum=True),
    )
    target_audience: Mapped[str | None] = mapped_column(String(512), nullable=True)
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_participants: Mapped[int | None] = mapped_column(Integer, nullable=True)
    base_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    status: Mapped[EventStatus] = mapped_column(
        Enum(EventStatus, name="event_status", native_enum=True),
        default=EventStatus.active,
    )
    meeting_point: Mapped[str | None] = mapped_column(Text, nullable=True)
    cover_image_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    schedules: Mapped[list[Schedule]] = relationship(
        back_populates="event",
        cascade="all, delete-orphan",
    )
    reviews: Mapped[list[Review]] = relationship(
        back_populates="event",
        cascade="all, delete-orphan",
    )


class Schedule(Base):
    __tablename__ = "schedules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"))
    start_datetime: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    end_datetime: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    available_slots: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[ScheduleStatus] = mapped_column(
        Enum(ScheduleStatus, name="schedule_status", native_enum=True),
        default=ScheduleStatus.open,
    )
    guide_id: Mapped[int | None] = mapped_column(
        ForeignKey("guides.id", ondelete="SET NULL"),
        nullable=True,
    )
    # Кто отказался от сеанса (сохраняется при снятии guide_id с сеанса)
    rejected_by_guide_id: Mapped[int | None] = mapped_column(
        ForeignKey("guides.id", ondelete="SET NULL"),
        nullable=True,
    )
    guide_confirmed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    guide_rejected_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    guide_reject_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    guide_completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    event: Mapped[Event] = relationship(back_populates="schedules")
    guide: Mapped[Guide | None] = relationship(
        back_populates="schedules",
        foreign_keys=lambda: [Schedule.guide_id],
    )
    bookings: Mapped[list[Booking]] = relationship(
        back_populates="schedule",
        cascade="all, delete-orphan",
    )
    salary_event: Mapped[GuideSalaryEvent | None] = relationship(
        back_populates="schedule",
        uselist=False,
    )


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    schedule_id: Mapped[int] = mapped_column(
        ForeignKey("schedules.id", ondelete="CASCADE"),
    )
    status: Mapped[BookingStatus] = mapped_column(
        Enum(BookingStatus, name="booking_status", native_enum=True),
        default=BookingStatus.pending,
    )
    participants_count: Mapped[int] = mapped_column(Integer, default=1)
    total_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    customer_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    confirmed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    user: Mapped[User] = relationship(back_populates="bookings")
    schedule: Mapped[Schedule] = relationship(back_populates="bookings")
    participants: Mapped[list[Participant]] = relationship(
        back_populates="booking",
        cascade="all, delete-orphan",
    )
    transactions: Mapped[list[Transaction]] = relationship(
        back_populates="booking",
        cascade="all, delete-orphan",
    )
    reviews: Mapped[list[Review]] = relationship(
        back_populates="booking",
        cascade="all, delete-orphan",
    )


class Participant(Base):
    __tablename__ = "participants"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    booking_id: Mapped[int] = mapped_column(
        ForeignKey("bookings.id", ondelete="CASCADE"),
    )
    first_name: Mapped[str] = mapped_column(String(255))
    last_name: Mapped[str] = mapped_column(String(255))
    patronymic: Mapped[str | None] = mapped_column(String(255), nullable=True)
    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_child: Mapped[bool] = mapped_column(Boolean, default=True)
    special_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    booking: Mapped[Booking] = relationship(back_populates="participants")


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    booking_id: Mapped[int] = mapped_column(
        ForeignKey("bookings.id", ondelete="CASCADE"),
    )
    payment_method: Mapped[PaymentMethod] = mapped_column(
        Enum(PaymentMethod, name="payment_method", native_enum=True),
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    status: Mapped[TransactionStatus] = mapped_column(
        Enum(TransactionStatus, name="transaction_status", native_enum=True),
        default=TransactionStatus.pending,
    )
    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    refund_external_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    booking: Mapped[Booking] = relationship(back_populates="transactions")


class Review(Base):
    __tablename__ = "reviews"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"))
    booking_id: Mapped[int] = mapped_column(
        ForeignKey("bookings.id", ondelete="CASCADE"),
    )
    rating: Mapped[int] = mapped_column(Integer)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    guide_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Вовлечённость (1–5); у старых записей может быть NULL
    engagement_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Организация мероприятия (1–5); у старых записей может быть NULL
    organization_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)

    user: Mapped[User] = relationship(back_populates="reviews")
    event: Mapped[Event] = relationship(back_populates="reviews")
    booking: Mapped[Booking] = relationship(back_populates="reviews")


class Settings(Base):
    __tablename__ = "settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    param_name: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    param_value: Mapped[str] = mapped_column(Text)
    data_type: Mapped[SettingDataType] = mapped_column(
        Enum(SettingDataType, name="setting_data_type", native_enum=True),
        default=SettingDataType.string,
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)


class GuideSalaryEvent(Base):
    __tablename__ = "guide_salary_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    guide_id: Mapped[int] = mapped_column(ForeignKey("guides.id", ondelete="CASCADE"))
    schedule_id: Mapped[int] = mapped_column(
        ForeignKey("schedules.id", ondelete="CASCADE"),
        unique=True,
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    guide: Mapped[Guide] = relationship(back_populates="salary_events")
    schedule: Mapped[Schedule] = relationship(back_populates="salary_event")


class GuideChatMessage(Base):
    __tablename__ = "guide_chat_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    guide_id: Mapped[int] = mapped_column(ForeignKey("guides.id", ondelete="CASCADE"))
    admin_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    sender_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
    )
    message: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    guide: Mapped[Guide] = relationship(back_populates="chat_messages")
