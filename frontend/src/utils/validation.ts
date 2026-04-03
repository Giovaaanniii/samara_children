import { z } from "zod";

export const loginSchema = z.object({
  login: z.string().min(1, "Введите логин или email"),
  password: z.string().min(1, "Введите пароль"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    login: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(8, "Минимум 8 символов"),
    password2: z.string(),
  })
  .refine((d) => d.password === d.password2, {
    message: "Пароли не совпадают",
    path: ["password2"],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
