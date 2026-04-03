import { create } from "zustand";

/** Черновик бронирования на UI (выбранный сеанс и т.д.) */
interface BookingUiState {
  selectedScheduleId: number | null;
  selectedEventId: number | null;
  setSelectedSchedule: (eventId: number | null, scheduleId: number | null) => void;
  reset: () => void;
}

export const useBookingStore = create<BookingUiState>((set) => ({
  selectedScheduleId: null,
  selectedEventId: null,
  setSelectedSchedule: (eventId, scheduleId) =>
    set({ selectedEventId: eventId, selectedScheduleId: scheduleId }),
  reset: () => set({ selectedEventId: null, selectedScheduleId: null }),
}));
