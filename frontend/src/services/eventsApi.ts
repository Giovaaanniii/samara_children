import type { EventDetail, EventListResponse } from "../types";

import { api } from "./api";

export const eventsApi = {
  list: (params?: { skip?: number; limit?: number }) =>
    api.get<EventListResponse>("/events", { params }),

  getById: (id: number) => api.get<EventDetail>(`/events/${id}`),
};
