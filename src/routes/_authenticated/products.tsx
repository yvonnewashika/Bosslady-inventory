import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/AppShell";
import { StatusPill } from "@/components/Field";
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
import {
  createProduct,
  deleteProduct,
  listProducts,
  money,
  stockStatus,
  type ProductInput,
} from "@/lib/inventory";

export const Route = createFileRoute("/_authenticated/products")({
  head: () => ({
    meta: [
      { title: "Products — StockRoom Inventory" },
      {
        name: "description",
        content:
          "Add products with cost price, selling price, quantity and live stock levels.",
      },
      { property: "og:title", content: "Products — StockRoom Inventory" },
      {
        property: "og:description",
        content:
          "Manage products, buying costs, selling prices and stock levels.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Products,
});

const emptyForm: ProductInput = {
  name: "",
  sku: "",
  description: null,
  category_id: null,
  supplier_id: null,
  cost_price: 0,
  unit_price: 0,
  quantity: 0,
  reorder_level: 5,
  unit: "pcs",
  location: null,
};

function Products() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [form, setForm] = useState<ProductInput>(emptyForm);

  const products = useQuery({
    queryKey: ["products"],
    queryFn: listProducts,
  });

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
    p.name.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <AppShell>
      <PageHeader
        title="Products"
        subtitle="Manage your products, buying costs, selling prices and live stock levels."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" /> New product
              </Button>
            </DialogTrigger>

            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
              <DialogHeader>
                <DialogTitle>New product</DialogTitle>
              </DialogHeader>

              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();

                  if (Number(form.cost_price) < 0) {
                    toast.error("Cost price cannot be negative.");
                    return;
                  }

                  if (Number(form.unit_price) < 0) {
                    toast.error("Selling price cannot be negative.");
                    return;
                  }

                  if (Number(form.unit_price) < Number(form.cost_price)) {
                    toast.warning(
                      "Selling price is below the cost price. This will result in a loss.",
                    );
                  }

                  create.mutate();
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="name">Product</Label>
                  <Input
                    id="name"
                    required
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                    placeholder="e.g. Braids"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="qty">Quantity</Label>
                    <Input
                      id="qty"
                      type="number"
                      min="0"
                      value={form.quantity}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          quantity: Number(e.target.value),
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cost_price">
                      Cost Price (KSh)
                    </Label>
                    <Input
                      id="cost_price"
                      type="number"
                      step="1"
                      min="0"
                      value={form.cost_price}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          cost_price: Number(e.target.value),
                        })
                      }
                      placeholder="e.g. 50"
                    />
                    <p className="text-xs text-muted-foreground">
                      What you paid for one item.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit_price">
                    Selling Price (KSh)
                  </Label>
                  <Input
                    id="unit_price"
                    type="number"
                    step="1"
                    min="0"
                    value={form.unit_price}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        unit_price: Number(e.target.value),
                      })
                    }
                    placeholder="e.g. 75"
                  />
                  <p className="text-xs text-muted-foreground">
                    What you normally charge the customer for one item.
                  </p>
                </div>

                <div className="rounded-md bg-secondary/60 px-3 py-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Stock cost:
                    </span>
                    <span className="font-mono">
                      {money(
                        Number(form.cost_price) *
                          Number(form.quantity),
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Potential sales value:
                    </span>
                    <span className="font-mono">
                      {money(
                        Number(form.unit_price) *
                          Number(form.quantity),
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between border-t border-border pt-1">
                    <span className="text-muted-foreground">
                      Potential gross profit:
                    </span>
                    <span className="font-mono font-semibold">
                      {money(
                        (Number(form.unit_price) -
                          Number(form.cost_price)) *
                          Number(form.quantity),
                      )}
                    </span>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={create.isPending}
                >
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
          placeholder="Search products"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              {[
                "Product",
                "Qty",
                "Cost",
                "Selling Price",
                "Stock Value",
                "Status",
                "",
              ].map((h) => (
                <th
                  key={h}
                  className="label-caps px-4 py-3 font-normal"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((p) => (
              <tr
                key={p.id}
                className="border-b border-border/60 last:border-0 hover:bg-secondary/40"
              >
                <td className="px-4 py-3">
                  <p className="font-medium">{p.name}</p>
                  {p.sku ? (
                    <p className="text-xs text-muted-foreground">
                      {p.sku}
                    </p>
                  ) : null}
                </td>

                <td className="px-4 py-3 font-mono">
                  {p.quantity}
                </td>

                <td className="px-4 py-3 font-mono">
                  {money(Number(p.cost_price))}
                </td>

                <td className="px-4 py-3 font-mono font-medium">
                  {money(Number(p.unit_price))}
                </td>

                <td className="px-4 py-3 font-mono">
                  {money(
                    Number(p.cost_price) * Number(p.quantity),
                  )}
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
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  {products.isLoading
                    ? "Loading…"
                    : "No products yet — add your first one."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}