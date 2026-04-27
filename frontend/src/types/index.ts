/** Типы, согласованные с backend (Pydantic). */

export type UserRole = "client" | "admin" | "guide";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed";

export type EventCategory = "excursion" | "quest" | "workshop";

export type EventStatus = "active" | "suspended" | "archived";

export type ScheduleStatus =
  | "open"
  | "closed"
  | "cancelled"
  | "completed";

export interface User {
  id: number;
  login: string;
  email: string;
  role: UserRole;
  first_name: string | null;
  last_name: string | null;
  patronymic: string | null;
  phone: string | null;
  avatar_url: string | null;
  /** Связь с таблицей guides для роли guide */
  guide_id: number | null;
  is_active: boolean;
  fcm_token?: string | null;
}

export interface UserCreate {
  login: string;
  email: string;
  password: string;
  first_name?: string | null;
  last_name?: string | null;
  patronymic?: string | null;
  phone?: string | null;
}

export interface UserUpdate {
  login?: string | null;
  email?: string | null;
  password?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  patronymic?: string | null;
  phone?: string | null;
  fcm_token?: string | null;
}

export interface LoginRequest {
  login: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface VkLoginUrlResponse {
  authorization_url: string;
  state: string;
}

export interface EventRecord {
  id: number;
  title: string;
  description: string | null;
  category: EventCategory;
  target_audience: string | null;
  duration_minutes: number | null;
  max_participants: number | null;
  base_price: string;
  status: EventStatus;
  meeting_point: string | null;
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventCreatePayload {
  title: string;
  description?: string | null;
  category: EventCategory;
  target_audience?: string | null;
  duration_minutes?: number | null;
  max_participants?: number | null;
  base_price: string;
  status?: EventStatus;
  meeting_point?: string | null;
  cover_image_url?: string | null;
}

export type EventUpdatePayload = Partial<EventCreatePayload>;

export interface Schedule {
  id: number;
  event_id: number;
  start_datetime: string;
  end_datetime: string;
  available_slots: number;
  status: ScheduleStatus;
  guide_id: number | null;
}

export interface ScheduleCreatePayload {
  event_id: number;
  start_datetime: string;
  end_datetime: string;
  available_slots: number;
  status: ScheduleStatus;
  guide_id?: number | null;
}

export type ScheduleUpdatePayload = Partial<
  Omit<ScheduleCreatePayload, "event_id">
>;

export interface Guide {
  id: number;
  first_name: string;
  last_name: string;
  patronymic: string | null;
  phone: string | null;
  email: string | null;
  photo_url: string | null;
  specialization: string | null;
  hire_date: string | null;
  is_active: boolean;
  /** Средняя оценка гида из опубликованных отзывов (API /guides) */
  average_guide_rating?: number | null;
  guide_reviews_count?: number;
}

export interface GuideCreatePayload {
  first_name: string;
  last_name: string;
  patronymic?: string | null;
  phone?: string | null;
  email?: string | null;
  photo_url?: string | null;
  specialization?: string | null;
  hire_date?: string | null;
  is_active?: boolean;
}

export type GuideUpdatePayload = Partial<GuideCreatePayload>;

/** Элемент GET /guides/my/schedule */
export interface GuideScheduleBookingBrief {
  booking_id: number;
  status: BookingStatus;
  participants_count: number;
}

export interface GuideMyScheduleItem {
  schedule_id: number;
  event_id: number;
  event_title: string;
  start_datetime: string;
  end_datetime: string;
  schedule_status: ScheduleStatus;
  participants_count: number;
  guide_confirmed_at: string | null;
  guide_rejected_at: string | null;
  guide_reject_reason: string | null;
  guide_completed_at: string | null;
  bookings: GuideScheduleBookingBrief[];
}

export interface GuideScheduleDecisionResponse {
  schedule_id: number;
  action: string;
  guide_confirmed_at: string | null;
  guide_rejected_at: string | null;
  guide_reject_reason: string | null;
  guide_completed_at: string | null;
}

export interface GuideGroupResponse {
  booking_id: number;
  schedule_id: number;
  event_id: number;
  event_title: string;
  start_datetime: string;
  end_datetime: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  participants: {
    participant_id: number;
    first_name: string;
    last_name: string;
    patronymic: string | null;
    age: number | null;
    is_child: boolean;
    special_notes: string | null;
  }[];
}

/** Публичный ответ GET /schedules/:id для страницы бронирования */
export interface ScheduleBookingInfo {
  id: number;
  event_id: number;
  event_title: string;
  base_price: string;
  start_datetime: string;
  end_datetime: string;
  available_slots: number;
  status: ScheduleStatus;
}

export interface Review {
  id: number;
  user_id: number;
  event_id: number;
  booking_id: number;
  /** Целое среднее по критериям (1–5), для совместимости */
  rating: number;
  /** Среднее по критериям — для отображения звёзд (половинки) */
  average_rating: number;
  comment: string | null;
  guide_rating: number | null;
  engagement_rating: number | null;
  organization_rating: number | null;
  created_at: string;
  is_published: boolean;
  author_name?: string | null;
}

export interface ReviewCreatePayload {
  event_id: number;
  booking_id: number;
  guide_rating: number;
  engagement_rating: number;
  organization_rating: number;
  comment?: string | null;
}

export interface EligibleBookingReviewItem {
  booking_id: number;
  schedule_end: string;
}

export interface ReviewAdminItem extends Review {
  event_title: string;
}

export interface EventDetail extends EventRecord {
  schedules: Schedule[];
  reviews: Review[];
}

export interface EventListResponse {
  items: EventRecord[];
  total: number;
  skip: number;
  limit: number;
}

export interface ParticipantCreate {
  first_name: string;
  last_name: string;
  patronymic?: string | null;
  age?: number | null;
  is_child?: boolean;
  special_notes?: string | null;
}

export interface BookingCreate {
  schedule_id: number;
  participants_count: number;
  customer_notes?: string | null;
  participants: ParticipantCreate[];
}

export interface BookingResponse {
  id: number;
  user_id: number;
  schedule_id: number;
  status: BookingStatus;
  participants_count: number;
  total_price: string;
  customer_notes: string | null;
  created_at: string;
  confirmed_at: string | null;
  payment_url?: string | null;
  payment_id?: string | null;
  booking_id?: number;
  /** Список «Мои бронирования» */
  event_title?: string | null;
  schedule_start_datetime?: string | null;
}

/** GET /bookings/:id/status — лёгкий ответ для опроса после ЮKassa */
export interface BookingStatusSnapshot {
  id: number;
  status: BookingStatus;
  confirmed_at: string | null;
}

export interface Participant {
  id: number;
  first_name: string;
  last_name: string;
  patronymic: string | null;
  age: number | null;
  is_child: boolean;
  special_notes: string | null;
}

export interface EventBookingInfo {
  id: number;
  title: string;
  description: string | null;
  meeting_point: string | null;
  duration_minutes: number | null;
  category: EventCategory;
  base_price: string;
}

export interface ScheduleBrief {
  id: number;
  start_datetime: string;
  end_datetime: string;
  status: ScheduleStatus;
}

export interface BookingDetail extends BookingResponse {
  participants: Participant[];
  event: EventBookingInfo;
  schedule: ScheduleBrief;
}

export interface BookingCancelResponse {
  booking: BookingResponse;
  refund_id?: string | null;
  refund_initiated?: boolean;
  message?: string | null;
}

export interface SalesSummary {
  bookings_total: number;
  paid_bookings: number;
  revenue_total: string;
  period_from?: string | null;
  period_to?: string | null;
}

export interface PopularEventPoint {
  event_id: number;
  event_title: string;
  bookings_count: number;
  participants_count: number;
  revenue: string;
}

export interface AdminReports {
  sales: SalesSummary;
  popular_events: PopularEventPoint[];
}

/** GET /reports/admin/calendar */
export interface AdminCalendarDayItem {
  date: string;
  confirmed_booking_count: number;
  booking_ids: number[];
}

export interface AdminCalendarResponse {
  year: number;
  month: number;
  days: AdminCalendarDayItem[];
}

/** GET /reports/admin/guide-refusals */
export interface AdminGuideRefusalItem {
  schedule_id: number;
  event_id: number;
  event_title: string;
  start_datetime: string;
  rejected_at: string;
  reject_reason: string;
  guide_id: number | null;
  guide_name: string;
}

/** GET /guides/my/rating */
export interface GuideRatingReviewItem {
  review_id: number;
  event_id: number;
  event_title: string;
  booking_id: number;
  rating: number;
  guide_rating: number | null;
  comment: string | null;
  created_at: string;
  author_name: string | null;
}

export interface GuideRatingResponse {
  guide_id: number;
  average_guide_rating: number;
  reviews_count: number;
  reviews: GuideRatingReviewItem[];
}
