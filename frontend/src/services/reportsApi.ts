import type { AdminCalendarResponse, AdminGuideRefusalItem, AdminReports } from "../types";

import { api } from "./api";

export const reportsApi = {
  adminSummary: (params?: { date_from?: string; date_to?: string }) =>
    api.get<AdminReports>("/reports/admin/summary", { params }),

  adminCalendar: (year: number, month: number) =>
    api.get<AdminCalendarResponse>("/reports/admin/calendar", {
      params: { year, month },
    }),

  adminGuideRefusals: (limit?: number) =>
    api.get<AdminGuideRefusalItem[]>("/reports/admin/guide-refusals", {
      params: limit ? { limit } : undefined,
    }),
};
