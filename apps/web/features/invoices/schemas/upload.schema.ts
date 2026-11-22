import { z } from "zod";

export function uploadSchema(maxBytes: number) {
  return z.object({
    supplierId: z.uuid("Select a supplier."),
    file: z.custom<FileList>((value) => typeof FileList !== "undefined" && value instanceof FileList && value.length === 1,
      "Select one PDF, PNG, or JPEG file.")
      .transform((files) => files[0])
      .refine((file) => file.size > 0, "Select a nonempty file.")
      .refine((file) => file.size <= maxBytes, "The invoice file exceeds the upload size limit."),
  });
}
