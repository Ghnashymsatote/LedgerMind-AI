import { z } from "zod";

export const email = z.string().trim().toLowerCase().pipe(z.email().max(254));
export const role = z.enum(["ADMIN", "OPERATOR"]);
export const newPassword = z.string().min(12).max(128).refine((value) => !/[\r\n]/.test(value));

export const login = z.strictObject({
  email,
  password: z.string().min(1).max(128),
});

export type LoginInput = z.infer<typeof login>;
