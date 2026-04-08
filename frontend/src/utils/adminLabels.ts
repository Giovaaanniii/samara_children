import type { BookingStatus, EventCategory, EventStatus, ScheduleStatus } from "../types";

/** Подписи значений для админ-панели (на русском). */
export const eventCategoryLabels: Record<EventCategory, string> = {
  excursion: "Экскурсия",
  quest: "Квест",
  workshop: "Мастер-класс",
};

export const eventStatusLabels: Record<EventStatus, string> = {
  active: "Активно",
  suspended: "Приостановлено",
  archived: "В архиве",
};

export const scheduleStatusLabels: Record<ScheduleStatus, string> = {
  open: "Открыт для записи",
  closed: "Закрыт",
  cancelled: "Отменён",
  completed: "Завершён",
};

export const bookingStatusLabels: Record<BookingStatus, string> = {
  pending: "Ожидает оплаты",
  confirmed: "Подтверждено",
  cancelled: "Отменено",
  completed: "Завершено",
};

export const eventCategoryOptions = (Object.entries(eventCategoryLabels) as [EventCategory, string][]).map(
  ([value, label]) => ({ value, label }),
);

export const eventStatusOptions = (Object.entries(eventStatusLabels) as [EventStatus, string][]).map(
  ([value, label]) => ({ value, label }),
);

export const scheduleStatusOptions = (Object.entries(scheduleStatusLabels) as [ScheduleStatus, string][]).map(
  ([value, label]) => ({ value, label }),
);

export const bookingStatusOptions = (Object.entries(bookingStatusLabels) as [BookingStatus, string][]).map(
  ([value, label]) => ({ value, label }),
);
