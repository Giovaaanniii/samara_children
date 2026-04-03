import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Form, Input, InputNumber } from "antd";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

const schema = z.object({
  schedule_id: z.number().int().positive(),
  participants_count: z.number().int().min(1),
  customer_notes: z.string().optional(),
});

export type BookingFormValues = z.infer<typeof schema>;

type Props = {
  defaultScheduleId?: number;
  onSubmit: (values: BookingFormValues) => Promise<void> | void;
  loading?: boolean;
};

/**
 * Заготовка формы бронирования (участников и оплату добавите по API бэкенда).
 */
export function BookingForm({
  defaultScheduleId,
  onSubmit,
  loading,
}: Props) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<BookingFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      schedule_id: defaultScheduleId ?? 1,
      participants_count: 1,
      customer_notes: "",
    },
  });

  return (
    <Form layout="vertical">
      <Form.Item
        label="ID сеанса (schedule_id)"
        validateStatus={errors.schedule_id ? "error" : undefined}
        help={errors.schedule_id?.message}
      >
        <Controller
          name="schedule_id"
          control={control}
          render={({ field }) => (
            <InputNumber style={{ width: "100%" }} min={1} {...field} />
          )}
        />
      </Form.Item>
      <Form.Item
        label="Число участников"
        validateStatus={errors.participants_count ? "error" : undefined}
        help={errors.participants_count?.message}
      >
        <Controller
          name="participants_count"
          control={control}
          render={({ field }) => (
            <InputNumber style={{ width: "100%" }} min={1} {...field} />
          )}
        />
      </Form.Item>
      <Form.Item label="Комментарий">
        <Controller
          name="customer_notes"
          control={control}
          render={({ field }) => <Input.TextArea rows={3} {...field} />}
        />
      </Form.Item>
      <Button
        type="primary"
        htmlType="button"
        loading={loading}
        block
        onClick={handleSubmit(onSubmit)}
      >
        Перейти к оплате
      </Button>
    </Form>
  );
}
