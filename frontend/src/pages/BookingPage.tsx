import { Alert, Typography } from "antd";
import { useSearchParams } from "react-router-dom";

import { BookingForm, type BookingFormValues } from "../components/BookingForm";

const { Title } = Typography;

/**
 * Черновик страницы бронирования: после сабмита нужно дополнить участников
 * по контракту POST /bookings и редирект на оплату (payment_url).
 */
export default function BookingPage() {
  const [params] = useSearchParams();
  const scheduleId = Number(params.get("scheduleId"));

  const handleSubmit = async (_values: BookingFormValues) => {
    // TODO: собрать participants[], вызвать bookingsApi.create, открыть payment_url
  };

  return (
    <div style={{ padding: 24, maxWidth: 480, margin: "0 auto" }}>
      <Title level={3}>Бронирование</Title>
      {!Number.isFinite(scheduleId) || scheduleId < 1 ? (
        <Alert
          type="warning"
          showIcon
          message="Укажите scheduleId в query (?scheduleId=) со страницы мероприятия"
        />
      ) : (
        <BookingForm defaultScheduleId={scheduleId} onSubmit={handleSubmit} />
      )}
    </div>
  );
}
