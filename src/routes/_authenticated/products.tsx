import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/AppShell";
import { NativeSelect, StatusPill } from "@/components/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  createProduct,
  deleteProduct,
  listCategories,
  listProducts,
  listSuppliers,
  money,
  stockStatus,
  type ProductInput,
} from "@/lib/inventory";

export const Route = createFileRoute("/_authenticated/products")({
  head: () => ({
    meta: [
      { title: "Products — StockRoom Inventory" },
      { name: "description", content: "Add, search and manage every product, SKU and stock level." },
      { property: "og:title", content: "Products — StockRoom Inventory" },
      { property: "og:description", content: "Manage products, SKUs, prices and stock levels." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Products,
});

const emptyForm: ProductInput = {
  name: "",
  sku: "",
  description: "",
  category_id: null,
  supplier_id: null,
  unit_price: 0,
  quantity: 0,
  reorder_level: 5,
  unit: "pcs",
  location: "",
};

function Products() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [form, setForm] = useState<ProductInput>(emptyForm);

  const products = useQuery({ queryKey: ["products"], queryFn: listProducts });
  const categories = useQuery({ queryKey: ["categories"], queryFn: listCategories });
  const suppliers = useQuery({ queryKey: ["suppliers"], queryFn: listSuppliers });

  const create = useMutation({
    mutationFn: () => createProduct(form),
    onSuccess: () => {
      toast.success("Product added");
      setForm(emptyForm);
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      toast.success("Product deleted");
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = (products.data ?? []).filter((p) =>
    `${p.name} ${p.sku} ${p.location ?? ""}`.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <AppShell>
      <PageHeader
        title="Products"
        subtitle="Your full catalogue with live stock levels."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" /> New product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>New product</DialogTitle>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  create.mutate();
                }}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sku">SKU</Label>
                    <Input
                      id="sku"
                      required
                      value={form.sku}
                      onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cat">Category</Label>
                    <NativeSelect
                      id="cat"
                      value={form.category_id ?? ""}
                      onChange={(e) => setForm({ ...form, category_id: e.target.value || null })}
                    >
                      <option value="">—</option>
                      {(categories.data ?? []).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sup">Supplier</Label>
                    <NativeSelect
                      id="sup"
                      value={form.supplier_id ?? ""}
                      onChange={(e) => setForm({ ...form, supplier_id: e.target.value || null })}
                    >
                      <option value="">—</option>
                      {(suppliers.data ?? []).map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Unit price</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.unit_price}
                      onChange={(e) => setForm({ ...form, unit_price: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="qty">Quantity</Label>
                    <Input
                      id="qty"
                      type="number"
                      min="0"
                      value={form.quantity}
                      onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reorder">Reorder level</Label>
                    <Input
                      id="reorder"
                      type="number"
                      min="0"
                      value={form.reorder_level}
                      onChange={(e) => setForm({ ...form, reorder_level: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unit</Label>
                    <Input
                      id="unit"
                      value={form.unit}
                      onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="loc">Storage location</Label>
                    <Input
                      id="loc"
                      value={form.location ?? ""}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                      placeholder="Aisle B · Rack 4"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="desc">Description</Label>
                    <Textarea
                      id="desc"
                      value={form.description ?? ""}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={create.isPending}>
                  {create.isPending ? "Saving…" : "Save product"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search name, SKU or location"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              {["Product", "SKU", "Category", "Supplier", "Qty", "Price", "Value", "Status", ""].map(
                (h) => (
                  <th key={h} className="label-caps px-4 py-3 font-normal">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
                <td className="px-4 py-3">
                  <p className="font-medium">{p.name}</p>
                  {p.location ? (
                    <p className="text-xs text-muted-foreground">{p.location}</p>
                  ) : null}
                </td>
                <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.categories?.name ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.suppliers?.name ?? "—"}</td>
                <td className="px-4 py-3 font-mono">
                  {p.quantity} {p.unit}
                </td>
                <td className="px-4 py-3 font-mono">{money(Number(p.unit_price))}</td>
                <td className="px-4 py-3 font-mono">
                  {money(Number(p.unit_price) * p.quantity)}
                </td>
                <td className="px-4 py-3">
                  <StatusPill status={stockStatus(p)} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove.mutate(p.id)}
                    aria-label={`Delete ${p.name}`}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                  {products.isLoading ? "Loading…" : "No products yet — add your first one."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
