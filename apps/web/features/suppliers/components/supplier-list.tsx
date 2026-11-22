import { cn } from "@/lib/utils";
import type { Supplier } from "../types/supplier.types";

export function SupplierList({ suppliers, editing, disabled, onEdit }: {
  suppliers: Supplier[];
  editing: string | null;
  disabled: boolean;
  onEdit?: (id: string) => void;
}) {
  return (
    <section className="panel overflow-x-auto" aria-label="Supplier records">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-muted text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">Supplier</th>
            <th scope="col" className="px-4 py-3 font-medium">Tax ID</th>
            <th scope="col" className="px-4 py-3 font-medium">Tally ledger</th>
            <th scope="col" className="px-4 py-3 font-medium">Status</th>
            {onEdit && <th scope="col" className="px-4 py-3 font-medium">Action</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {suppliers.length === 0 && (
            <tr><td className="px-4 py-6 text-muted-foreground" colSpan={onEdit ? 5 : 4}>No suppliers have been added.</td></tr>
          )}
          {suppliers.map((supplier) => (
            <tr key={supplier.id} className={cn(editing === supplier.id && "bg-muted")}>
              <th scope="row" className="px-4 py-3 font-medium break-words">{supplier.name}</th>
              <td className="px-4 py-3">{supplier.taxId ?? "—"}</td>
              <td className="px-4 py-3 break-words">{supplier.tallyLedgerName}</td>
              <td className="px-4 py-3">{supplier.status === "ACTIVE" ? "Active" : "Inactive"}</td>
              {onEdit && (
                <td className="px-4 py-3">
                  <button className="button button-secondary" type="button" aria-label={`Edit ${supplier.name}`}
                    disabled={disabled} onClick={() => onEdit(supplier.id)}>
                    Edit
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
