import type {
  BookingCreate,
  BookingResponse,
  BookingStatus,
} from "../types/api";

import { api } from "./client";

export const bookingsApi = {
  create: (body: BookingCreate) =>
    api.post<BookingResponse>("/bookings", body),

  my: (status?: BookingStatus) =>
    api.get<BookingResponse[]>("/bookings/my", {
      params: status ? { status } : undefined,
    }),
};
