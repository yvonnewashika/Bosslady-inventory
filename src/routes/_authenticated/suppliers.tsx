import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createSupplier, deleteSupplier, listSuppliers, type SupplierInput } from "@/lib/inventory";

export const Route = createFileRoute("/_authenticated/suppliers")({
  head: () => ({
    meta: [
      { title: "Suppliers — StockRoom Inventory" },
      { name: "description", content: "Keep supplier contacts, emails and phone numbers next to your stock." },
      { property: "og:title", content: "Suppliers — StockRoom Inventory" },
      { property: "og:description", content: "Manage the suppliers behind every product you stock." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Suppliers,
});


const empty: SupplierInput = { name: "", contact_person: "", email: "", phone: "", address: "" };

function Suppliers() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<SupplierInput>(empty);
  const suppliers = useQuery({ queryKey: ["suppliers"], queryFn: listSuppliers });

  const create = useMutation({
    mutationFn: () => createSupplier(form),
    onSuccess: () => {
      toast.success("Supplier added");
      setForm(empty);
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["suppliers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: deleteSupplier,
    onSuccess: () => {
      toast.success("Supplier removed");
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell>
      <PageHeader
        title="Suppliers"
        subtitle="Who you buy from, and how to reach them."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" /> New supplier
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>New supplier</DialogTitle>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  create.mutate();
                }}
              >
                {(
                  [
                    ["name", "Company name", true],
                    ["contact_person", "Contact person", false],
                    ["email", "Email", false],
                    ["phone", "Phone", false],
                    ["address", "Address", false],
                  ] as const
                ).map(([key, label, required]) => (
                  <div className="space-y-2" key={key}>
                    <Label htmlFor={key}>{label}</Label>
                    <Input
                      id={key}
                      required={required}
                      value={form[key] ?? ""}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    />
                  </div>
                ))}
                <Button type="submit" className="w-full" disabled={create.isPending}>
                  {create.isPending ? "Saving…" : "Save supplier"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {(suppliers.data ?? []).map((s) => (
          <article key={s.id} className="panel p-5">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-base font-semibold">{s.name}</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => remove.mutate(s.id)}
                aria-label={`Delete ${s.name}`}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
            <dl className="mt-3 space-y-1.5 text-sm text-muted-foreground">
              {s.contact_person ? <dd>{s.contact_person}</dd> : null}
              {s.email ? <dd className="font-mono text-xs">{s.email}</dd> : null}
              {s.phone ? <dd className="font-mono text-xs">{s.phone}</dd> : null}
              {s.address ? <dd>{s.address}</dd> : null}
            </dl>
          </article>
        ))}
        {(suppliers.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No suppliers yet.</p>
        ) : null}
      </div>
    </AppShell>
  );
}
