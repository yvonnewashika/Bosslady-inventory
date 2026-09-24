import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/AppShell";
import { NativeSelect } from "@/components/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createMovement,
  listMovements,
  listProducts,
  type MovementType,
} from "@/lib/inventory";

export const Route = createFileRoute("/_authenticated/movements")({
  head: () => ({
    meta: [
      { title: "Stock movements — StockRoom Inventory" },
      { name: "description", content: "Record stock in, stock out and adjustments with a full history." },
      { property: "og:title", content: "Stock movements — StockRoom Inventory" },
      { property: "og:description", content: "Record and audit every stock in, out and adjustment." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Movements,
});

function Movements() {
  const qc = useQueryClient();
  const products = useQuery({ queryKey: ["products"], queryFn: listProducts });
  const movements = useQuery({ queryKey: ["movements"], queryFn: () => listMovements(200) });

  const [productId, setProductId] = useState("");
  const [type, setType] = useState<MovementType>("in");
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");

  const record = useMutation({
    mutationFn: () =>
      createMovement({ product_id: productId, type, quantity, note: note || null }),
    onSuccess: () => {
      toast.success("Movement recorded");
      setQuantity(1);
      setNote("");
      qc.invalidateQueries({ queryKey: ["movements"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell>
      <PageHeader
        title="Stock movements"
        subtitle="Every stock in, stock out and adjustment — quantities update automatically."
      />

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <form
          className="panel h-fit space-y-4 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!productId) {
              toast.error("Pick a product first");
              return;
            }
            record.mutate();
          }}
        >
          <h2 className="text-lg font-semibold">Record movement</h2>
          <div className="space-y-2">
            <Label htmlFor="prod">Product</Label>
            <NativeSelect
              id="prod"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              required
            >
              <option value="">Select a product…</option>
              {(products.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.quantity} {p.unit})
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <NativeSelect
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value as MovementType)}
            >
              <option value="in">Stock in</option>
              <option value="out">Stock out</option>
              <option value="adjustment">Adjustment (set exact quantity)</option>
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="qty">Quantity</Label>
            <Input
              id="qty"
              type="number"
              min="0"
              required
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">Note</Label>
            <Input
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="PO #1042, damaged goods…"
            />
          </div>
          <Button type="submit" className="w-full" disabled={record.isPending}>
            {record.isPending ? "Recording…" : "Record movement"}
          </Button>
        </form>

        <div className="panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                {["Date", "Product", "Type", "Qty", "Note"].map((h) => (
                  <th key={h} className="label-caps px-4 py-3 font-normal">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(movements.data ?? []).map((m) => (
                <tr key={m.id} className="border-b border-border/60 last:border-0">
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {new Date(m.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{m.products?.name ?? "Deleted item"}</p>
                    <p className="font-mono text-xs text-muted-foreground">{m.products?.sku}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        m.type === "in"
                          ? "text-success"
                          : m.type === "out"
                            ? "text-destructive"
                            : "text-muted-foreground"
                      }
                    >
                      {m.type === "in" ? "Stock in" : m.type === "out" ? "Stock out" : "Adjustment"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono">{m.quantity}</td>
                  <td className="px-4 py-3 text-muted-foreground">{m.note ?? "—"}</td>
                </tr>
              ))}
              {(movements.data ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    No movements recorded yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
