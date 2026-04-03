import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Card,
  Checkbox,
  Input,
  InputNumber,
  Space,
  Typography,
} from "antd";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";

import type { ScheduleBookingInfo } from "../types";
import type { BookingFormValues, ParticipantFormRow } from "../utils/validation";
import { bookingFormSchema } from "../utils/validation";

const { Text } = Typography;

function emptyParticipant(): ParticipantFormRow {
  return {
    first_name: "",
    last_name: "",
    patronymic: "",
    age: null,
    is_child: true,
    special_notes: "",
  };
}

type Props = {
  schedule: ScheduleBookingInfo;
  submitting?: boolean;
  onPay: (values: BookingFormValues) => Promise<void>;
};

export function BookingForm({ schedule, submitting, onPay }: Props) {
  const maxSlots = Math.max(1, schedule.available_slots);

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      customer_notes: "",
      participants: [emptyParticipant()],
    },
  });

  const { fields, replace } = useFieldArray({ control, name: "participants" });

  const participantsWatch = useWatch({ control, name: "participants" });
  const count = participantsWatch?.length ?? 1;
  const unit = Number(schedule.base_price);
  const total = Number.isFinite(unit) ? unit * count : 0;

  const setParticipantCount = (raw: number | null) => {
    const n = Math.min(Math.max(1, raw ?? 1), maxSlots);
    const rows = getValues("participants") ?? [];
    const next: ParticipantFormRow[] = [...rows];
    while (next.length < n) next.push(emptyParticipant());
    if (next.length > n) next.length = n;
    replace(next);
  };

  return (
    <form onSubmit={handleSubmit(onPay)} noValidate style={{ maxWidth: 720 }}>
      <Card size="small" style={{ marginBottom: 16, background: "#fffbfb" }}>
        <Text strong>{schedule.event_title}</Text>
        <br />
        <Text type="secondary">
          Цена за человека: {schedule.base_price} ₽ · свободно мест:{" "}
          {schedule.available_slots}
        </Text>
      </Card>

      <div style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 8 }}>Количество участников</div>
        <InputNumber
          min={1}
          max={maxSlots}
          value={count}
          onChange={(v) => setParticipantCount(typeof v === "number" ? v : null)}
          style={{ width: "100%" }}
        />
        {errors.participants?.message && (
          <Text type="danger" style={{ display: "block", marginTop: 4 }}>
            {errors.participants.message}
          </Text>
        )}
      </div>

      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        {fields.map((field, index) => (
          <Card key={field.id} size="small" title={`Участник ${index + 1}`}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ marginBottom: 6 }}>Фамилия</div>
              <Controller
                name={`participants.${index}.last_name`}
                control={control}
                render={({ field: f }) => <Input {...f} autoComplete="family-name" />}
              />
              {errors.participants?.[index]?.last_name && (
                <Text type="danger" style={{ fontSize: 12 }}>
                  {errors.participants[index]?.last_name?.message}
                </Text>
              )}
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ marginBottom: 6 }}>Имя</div>
              <Controller
                name={`participants.${index}.first_name`}
                control={control}
                render={({ field: f }) => <Input {...f} autoComplete="given-name" />}
              />
              {errors.participants?.[index]?.first_name && (
                <Text type="danger" style={{ fontSize: 12 }}>
                  {errors.participants[index]?.first_name?.message}
                </Text>
              )}
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ marginBottom: 6 }}>Отчество</div>
              <Controller
                name={`participants.${index}.patronymic`}
                control={control}
                render={({ field: f }) => <Input {...f} />}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ marginBottom: 6 }}>Возраст</div>
              <Controller
                name={`participants.${index}.age`}
                control={control}
                render={({ field: f }) => (
                  <InputNumber
                    min={0}
                    max={120}
                    style={{ width: "100%" }}
                    placeholder="Необязательно"
                    value={f.value ?? null}
                    onChange={(v) =>
                      f.onChange(v === null || v === undefined ? null : v)
                    }
                  />
                )}
              />
              {errors.participants?.[index]?.age && (
                <Text type="danger" style={{ fontSize: 12 }}>
                  {String(errors.participants[index]?.age?.message ?? "")}
                </Text>
              )}
            </div>
            <div style={{ marginBottom: 12 }}>
              <Controller
                name={`participants.${index}.is_child`}
                control={control}
                render={({ field: f }) => (
                  <Checkbox
                    checked={f.value}
                    onChange={(e) => f.onChange(e.target.checked)}
                  >
                    Ребёнок
                  </Checkbox>
                )}
              />
            </div>
            <div>
              <div style={{ marginBottom: 6 }}>Особые отметки</div>
              <Controller
                name={`participants.${index}.special_notes`}
                control={control}
                render={({ field: f }) => <Input.TextArea rows={2} {...f} />}
              />
            </div>
          </Card>
        ))}
      </Space>

      <div style={{ marginTop: 16, marginBottom: 16 }}>
        <div style={{ marginBottom: 6 }}>Комментарий к бронированию</div>
        <Controller
          name="customer_notes"
          control={control}
          render={({ field }) => <Input.TextArea rows={2} {...field} />}
        />
      </div>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Text strong style={{ fontSize: 18 }}>
          Итого: {total.toFixed(2)} ₽
        </Text>
      </Card>

      <Button type="primary" htmlType="submit" loading={submitting} block size="large">
        Оплатить
      </Button>
    </form>
  );
}
