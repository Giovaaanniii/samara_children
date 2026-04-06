/** Типы, согласованные с backend (Pydantic). */

export type UserRole = "client" | "admin";

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

export interface Schedule {
  id: number;
  event_id: number;
  start_datetime: string;
  end_datetime: string;
  available_slots: number;
  status: ScheduleStatus;
  guide_id: number | null;
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
  rating: number;
  comment: string | null;
  guide_rating: number | null;
  created_at: string;
  is_published: boolean;
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
  qr_code_data_uri?: string;
}

export interface BookingCancelResponse {
  booking: BookingResponse;
  refund_id?: string | null;
  refund_initiated?: boolean;
  message?: string | null;
}
