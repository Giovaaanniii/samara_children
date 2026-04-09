import type {
  EligibleBookingReviewItem,
  Review,
  ReviewAdminItem,
  ReviewCreatePayload,
} from "../types";

import { api } from "./api";

export const reviewsApi = {
  listForEvent: (eventId: number) =>
    api.get<Review[]>("/reviews", { params: { event_id: eventId } }),

  eligibleBookings: (eventId: number) =>
    api.get<EligibleBookingReviewItem[]>("/reviews/eligible-bookings", {
      params: { event_id: eventId },
    }),

  create: (body: ReviewCreatePayload) =>
    api.post<Review>("/reviews", body),

  remove: (id: number) => api.delete<void>(`/reviews/${id}`),

  adminListAll: (eventId?: number) =>
    api.get<ReviewAdminItem[]>("/reviews/admin/all", {
      params: eventId ? { event_id: eventId } : undefined,
    }),
};
