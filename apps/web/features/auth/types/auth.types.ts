import type { z } from "zod";
import type { loginSchema } from "../schemas/login.schema";

export type CurrentUser = { id: string; email: string; role: "ADMIN" | "OPERATOR" };
export type LoginInput = z.infer<typeof loginSchema>;
