import type {
  AdminReports,
  BookingCancelResponse,
  BookingResponse,
  BookingStatus,
  EventCreatePayload,
  EventRecord,
  EventUpdatePayload,
  Guide,
  GuideCreatePayload,
  GuideUpdatePayload,
  Schedule,
  ScheduleCreatePayload,
  ScheduleUpdatePayload,
} from "../types";

import { api } from "./api";

export const adminApi = {
  events: {
    create: (body: EventCreatePayload) => api.post<EventRecord>("/events", body),
    update: (id: number, body: EventUpdatePayload) =>
      api.put<EventRecord>(`/events/${id}`, body),
    remove: (id: number) => api.delete<void>(`/events/${id}`),
  },
  schedules: {
    list: (eventId?: number) =>
      api.get<Schedule[]>("/schedules", {
        params: eventId ? { event_id: eventId } : undefined,
      }),
    create: (body: ScheduleCreatePayload) =>
      api.post<Schedule>("/schedules", body),
    update: (id: number, body: ScheduleUpdatePayload) =>
      api.put<Schedule>(`/schedules/${id}`, body),
    remove: (id: number) => api.delete<void>(`/schedules/${id}`),
  },
  guides: {
    list: () => api.get<Guide[]>("/guides"),
    create: (body: GuideCreatePayload) => api.post<Guide>("/guides", body),
    update: (id: number, body: GuideUpdatePayload) =>
      api.put<Guide>(`/guides/${id}`, body),
    remove: (id: number) => api.delete<void>(`/guides/${id}`),
  },
  bookings: {
    listAll: (params?: {
      status?: BookingStatus;
      created_from?: string;
      created_to?: string;
    }) => {
      const q: Record<string, string> = {};
      if (params?.status) q.status = params.status;
      if (params?.created_from) q.created_from = params.created_from;
      if (params?.created_to) q.created_to = params.created_to;
      return api.get<BookingResponse[]>("/bookings/admin/all", {
        params: Object.keys(q).length ? q : undefined,
      });
    },
    confirm: (id: number) => api.post<BookingResponse>(`/bookings/${id}/confirm`),
    cancel: (id: number) =>
      api.post<BookingCancelResponse>(`/bookings/${id}/cancel`),
  },
  reports: {
    summary: (params?: { date_from?: string; date_to?: string }) => {
      const q: Record<string, string> = {};
      if (params?.date_from) q.date_from = params.date_from;
      if (params?.date_to) q.date_to = params.date_to;
      return api.get<AdminReports>("/reports/admin/summary", {
        params: Object.keys(q).length ? q : undefined,
      });
    },
  },
};
