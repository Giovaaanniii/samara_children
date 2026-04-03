import type { ScheduleBookingInfo } from "../types";

import { api } from "./api";

export const schedulesApi = {
  getBookingContext: (scheduleId: number) =>
    api.get<ScheduleBookingInfo>(`/schedules/${scheduleId}`),
};
