import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Trash2, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/Field";
import { listProducts } from "@/lib/inventory";
import {
  createSale,
  deleteSale,
  listCustomers,
  listSales,
  KES,
  PAYMENT_METHODS,
  paymentLabel,
  type CartLine,
  type PaymentMethod,
} from "@/lib/shop";

export const Route = createFileRoute("/_authenticated/sales")({
  head: () => ({
    meta: [
      { title: "Sales — StockRoom Inventory" },
      {
        name: "description",
        content: "Record shop sales, take payments by cash, M-Pesa, bank or credit, and update stock instantly.",
      },
      { property: "og:title", content: "Sales — StockRoom Inventory" },
      {
        property: "og:description",
        content: "Point of sale for your shop: add items to a cart, record payment and reduce stock automatically.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Sales,
});

function Sales() {
  const qc = useQueryClient();
  const products = useQuery({ queryKey: ["products"], queryFn: listProducts });
  const customers = useQuery({ queryKey: ["customers"], queryFn: listCustomers });
  const sales = useQuery({ queryKey: ["sales"], queryFn: () => listSales() });

  const [lines, setLines] = useState<CartLine[]>([]);
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [customerId, setCustomerId] = useState("");
  const [discount, setDiscount] = useState("0");
  const [amountPaid, setAmountPaid] = useState("");
  const [note, setNote] = useState("");

  const subtotal = useMemo(
    () => lines.reduce((s, l) => s + l.unit_price * l.quantity, 0),
    [lines],
  );
  const total = Math.max(subtotal - (Number(discount) || 0), 0);

  const selectProduct = (id: string) => {
    setProductId(id);
    const p = (products.data ?? []).find((x) => x.id === id);
    setPrice(p ? String(p.unit_price) : "");
  };

  const addLine = () => {
    const p = (products.data ?? []).find((x) => x.id === productId);
    if (!p) return toast.error("Pick a product first.");
    const quantity = Number(qty);
    if (!quantity || quantity <= 0) return toast.error("Enter a valid quantity.");
    if (quantity > p.quantity) toast.warning(`Only ${p.quantity} ${p.unit} in stock.`);
    setLines((prev) => [
      ...prev,
      {
        product_id: p.id,
        product_name: p.name,
        quantity,
        unit_price: Number(price) || Number(p.unit_price),
        unit_cost: Number(p.cost_price) || 0,
      },
    ]);
    setProductId("");
    setQty("1");
    setPrice("");
  };

  const record = useMutation({
    mutationFn: () =>
      createSale({
        lines,
        payment_method: paymentMethod,
        customer_id: customerId || null,
        discount: Number(discount) || 0,
        amount_paid: amountPaid === "" ? total : Number(amountPaid),
        note: note || null,
      }),
    onSuccess: () => {
      toast.success("Sale recorded");
      setLines([]);
      setDiscount("0");
      setAmountPaid("");
      setNote("");
      setCustomerId("");
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: deleteSale,
    onSuccess: () => {
      toast.success("Sale deleted");
      qc.invalidateQueries({ queryKey: ["sales"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell>
      <PageHeader title="Sales" subtitle="Record every sale so your reports stay accurate." />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <ShoppingCart className="size-4 text-primary" /> New sale
          </h2>

          <div className="grid gap-3 sm:grid-cols-[2fr_0.8fr_1fr_auto] sm:items-end">
            <div>
              <Label className="mb-1 block">Product</Label>
              <NativeSelect value={productId} onChange={(e) => selectProduct(e.target.value)}>
                <option value="">Select product…</option>
                {(products.data ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.quantity} {p.unit}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div>
              <Label className="mb-1 block">Qty</Label>
              <Input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1 block">Unit price</Label>
              <Input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <Button type="button" onClick={addLine}>
              <Plus className="size-4" /> Add
            </Button>
          </div>

          <div className="mt-4 divide-y divide-border rounded-md border border-border">
            {lines.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Cart is empty. Add items above.</p>
            ) : (
              lines.map((l, i) => (
                <div key={i} className="flex items-center justify-between gap-3 p-3 text-sm">
                  <div>
                    <p className="font-medium">{l.product_name}</p>
                    <p className="text-muted-foreground">
                      {l.quantity} × {KES(l.unit_price)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono">{KES(l.quantity * l.unit_price)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setLines((p) => p.filter((_, idx) => idx !== i))}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1 block">Payment method</Label>
              <NativeSelect
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div>
              <Label className="mb-1 block">Customer (optional)</Label>
              <NativeSelect value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">Walk-in customer</option>
                {(customers.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div>
              <Label className="mb-1 block">Discount</Label>
              <Input
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-1 block">Amount paid</Label>
              <Input
                type="number"
                min="0"
                placeholder={String(total)}
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="mb-1 block">Note</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-md bg-secondary p-3">
            <span className="label-caps">Total</span>
            <span className="font-mono text-lg font-bold">{KES(total)}</span>
          </div>

          <Button
            className="mt-3 w-full"
            disabled={lines.length === 0 || record.isPending}
            onClick={() => record.mutate()}
          >
            {record.isPending ? "Saving…" : "Record sale"}
          </Button>
        </section>

        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 font-semibold">Recent sales</h2>
          <div className="divide-y divide-border">
            {(sales.data ?? []).length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">No sales recorded yet.</p>
            ) : (
              (sales.data ?? []).slice(0, 30).map((s) => (
                <div key={s.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                  <div>
                    <p className="font-medium">
                      {(s.sale_items ?? []).map((i) => `${i.quantity}× ${i.product_name}`).join(", ") ||
                        "Sale"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(s.created_at).toLocaleString("en-KE")} · {paymentLabel(s.payment_method)}
                      {s.customers?.name ? ` · ${s.customers.name}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{KES(Number(s.total))}</span>
                    <Button variant="ghost" size="icon" onClick={() => remove.mutate(s.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
