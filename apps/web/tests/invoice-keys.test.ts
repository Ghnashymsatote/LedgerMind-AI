import { expect, test } from "vitest";
import { invoiceKeys } from "../features/invoices/invoice.keys";

test("invoice list keys isolate users and collect every filter variant under one prefix", () => {
  const filters = { page: 1, pageSize: 20, search: "", supplierId: "", status: "" as const };
  const first = invoiceKeys.list("one", filters);
  const second = invoiceKeys.list("one", { ...filters, page: 2 });
  expect(first).not.toEqual(second);
  expect(first.slice(0, -1)).toEqual(invoiceKeys.lists("one"));
  expect(second.slice(0, -1)).toEqual(invoiceKeys.lists("one"));
  expect(invoiceKeys.list("two", filters)).not.toEqual(first);
  expect(invoiceKeys.detail("one", "invoice")).not.toEqual(first);
});
