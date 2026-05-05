import type { ScheduleBookingInfo } from "../types/api";

import { api } from "./client";

export const schedulesApi = {
  getBookingContext: (scheduleId: number) =>
    api.get<ScheduleBookingInfo>(`/schedules/${scheduleId}`),
};
