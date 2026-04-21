import type {
  EventCategory,
  EventDetail,
  EventListResponse,
  EventRecord,
  EventStatus,
} from "../types";

import { api } from "./api";

export type EventsListParams = {
  skip?: number;
  limit?: number;
  category?: EventCategory;
  target_audience?: string;
  status?: EventStatus;
  q?: string;
  date_from?: string;
  date_to?: string;
};

export const eventsApi = {
  list: (params?: EventsListParams) =>
    api.get<EventListResponse>("/events", { params }),

  getById: (id: number) => api.get<EventDetail>(`/events/${id}`),

  popularNow: () => api.get<EventRecord[]>("/events/popular-now"),

  adminPopularNowSet: (event_ids: number[]) =>
    api.put<EventRecord[]>("/events/admin/popular-now", { event_ids }),
};
