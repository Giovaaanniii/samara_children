import { z } from "zod";

export const loginSchema = z.object({
  login: z.string().min(1, "Введите логин или email"),
  password: z.string().min(1, "Введите пароль"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    login: z.string().min(1, "Укажите логин"),
    email: z.string().email("Некорректный email"),
    password: z.string().min(8, "Минимум 8 символов"),
    password2: z.string(),
    first_name: z.string().min(1, "Укажите имя"),
    last_name: z.string().min(1, "Укажите фамилию"),
  })
  .refine((d) => d.password === d.password2, {
    message: "Пароли не совпадают",
    path: ["password2"],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

const participantRowSchema = z.object({
  first_name: z.string().trim().min(1, "Имя"),
  last_name: z.string().trim().min(1, "Фамилия"),
  patronymic: z.string().trim().optional(),
  age: z.union([z.number().int().min(0).max(120), z.null()]).optional(),
  is_child: z.boolean(),
  special_notes: z.string().optional(),
});

export const bookingFormSchema = z.object({
  customer_notes: z.string().optional(),
  participants: z.array(participantRowSchema).min(1, "Добавьте хотя бы одного участника"),
});

export type BookingFormValues = z.infer<typeof bookingFormSchema>;
export type ParticipantFormRow = z.infer<typeof participantRowSchema>;
