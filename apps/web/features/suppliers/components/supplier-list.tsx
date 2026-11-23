import { MoreHorizontal, PackageOpen, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Supplier } from "../types/supplier.types";

export function SupplierList({ suppliers, disabled, onEdit }: { suppliers: Supplier[]; disabled: boolean; onEdit?: (id: string) => void }) {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="border-b px-5 py-5 sm:px-6"><CardTitle>Supplier directory</CardTitle><CardDescription>{suppliers.length} {suppliers.length === 1 ? "supplier" : "suppliers"}</CardDescription></CardHeader>
      {suppliers.length === 0 ? (
        <CardContent className="grid min-h-64 place-items-center px-6 py-12 text-center"><div className="max-w-sm"><span className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-muted text-muted-foreground"><PackageOpen className="size-5" aria-hidden="true" /></span><h2 className="font-semibold">No suppliers yet</h2><p className="mt-1 text-sm text-muted-foreground">Supplier records and their accounting ledger mappings will appear here.</p></div></CardContent>
      ) : (
        <Table aria-label="Supplier records">
          <TableHeader className="bg-muted/40"><TableRow className="hover:bg-transparent"><TableHead>Supplier</TableHead><TableHead>Tax ID</TableHead><TableHead>Tally ledger mapping</TableHead><TableHead>Status</TableHead>{onEdit && <TableHead className="w-16 text-right"><span className="sr-only">Actions</span></TableHead>}</TableRow></TableHeader>
          <TableBody>
            {suppliers.map((supplier) => (
              <TableRow key={supplier.id}>
                <TableCell className="max-w-64 whitespace-normal font-medium text-foreground">{supplier.name}</TableCell>
                <TableCell className="text-muted-foreground">{supplier.taxId ?? "—"}</TableCell>
                <TableCell className="max-w-72 whitespace-normal">{supplier.tallyLedgerName}</TableCell>
                <TableCell><Badge variant={supplier.status === "ACTIVE" ? "secondary" : "outline"} className={supplier.status === "ACTIVE" ? "border-emerald-600/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}><span className={supplier.status === "ACTIVE" ? "size-1.5 rounded-full bg-emerald-500" : "size-1.5 rounded-full bg-muted-foreground/60"} aria-hidden="true" />{supplier.status === "ACTIVE" ? "Active" : "Inactive"}</Badge></TableCell>
                {onEdit && (
                  <TableCell className="text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="icon-sm" disabled={disabled} aria-label={`Open actions for ${supplier.name}`}><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => onEdit(supplier.id)}><Pencil />Edit supplier</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
