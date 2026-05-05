import type {
  GuideGroupResponse,
  GuideMyScheduleItem,
  GuideRatingResponse,
  GuideScheduleDecisionResponse,
} from "../types/api";

import { api } from "./client";

export type GuideSchedulePeriod = "today" | "week" | "month";

export const guidesApi = {
  mySchedule: (params?: { period?: GuideSchedulePeriod; status?: string }) =>
    api.get<GuideMyScheduleItem[]>("/guides/my/schedule", {
      params: {
        ...(params?.period ? { period: params.period } : {}),
        ...(params?.status ? { status: params.status } : {}),
      },
    }),

  confirmSchedule: (scheduleId: number) =>
    api.post<GuideScheduleDecisionResponse>(
      `/guides/my/confirm/${scheduleId}`,
    ),

  rejectSchedule: (scheduleId: number, reason: string) =>
    api.post<GuideScheduleDecisionResponse>(
      `/guides/my/reject/${scheduleId}`,
      { reason },
    ),

  markCompleted: (scheduleId: number) =>
    api.post<GuideScheduleDecisionResponse>(
      `/guides/my/mark-completed/${scheduleId}`,
    ),

  groupByBooking: (bookingId: number) =>
    api.get<GuideGroupResponse>(`/guides/my/group/${bookingId}`),

  myRating: () => api.get<GuideRatingResponse>("/guides/my/rating"),
};
