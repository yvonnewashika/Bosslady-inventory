import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Package, DollarSign, AlertTriangle, XCircle } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { StatusPill } from "@/components/Field";
import { listProducts, listMovements, money, stockStatus } from "@/lib/inventory";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — StockRoom Inventory" },
      { name: "description", content: "Inventory value, low-stock alerts and recent stock movements." },
      { property: "og:title", content: "Dashboard — StockRoom Inventory" },
      { property: "og:description", content: "Inventory value, low-stock alerts and recent movements." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Stat({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  icon: typeof Package;
  tone?: "default" | "warning" | "destructive";
}) {
  const toneCls =
    tone === "warning" ? "text-warning" : tone === "destructive" ? "text-destructive" : "text-primary";
  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between">
        <p className="label-caps">{label}</p>
        <Icon className={`size-4 ${toneCls}`} />
      </div>
      <p className="stat-value mt-3">{value}</p>
    </div>
  );
}

function Dashboard() {
  const products = useQuery({ queryKey: ["products"], queryFn: listProducts });
  const movements = useQuery({ queryKey: ["movements"], queryFn: () => listMovements(8) });

  const items = products.data ?? [];
  const totalValue = items.reduce((sum, p) => sum + Number(p.unit_price) * p.quantity, 0);
  const low = items.filter((p) => stockStatus(p) === "low");
  const out = items.filter((p) => stockStatus(p) === "out");

  return (
    <AppShell>
      <PageHeader title="Dashboard" subtitle="Live snapshot of your inventory." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Products" value={String(items.length)} icon={Package} />
        <Stat label="Inventory value" value={money(totalValue)} icon={DollarSign} />
        <Stat label="Low stock" value={String(low.length)} icon={AlertTriangle} tone="warning" />
        <Stat label="Out of stock" value={String(out.length)} icon={XCircle} tone="destructive" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="panel p-5">
          <h2 className="text-lg font-semibold">Needs attention</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Items at or below their reorder level.
          </p>
          <ul className="mt-4 space-y-2">
            {[...out, ...low].slice(0, 8).map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-md bg-secondary/60 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{p.sku}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm">
                    {p.quantity} {p.unit}
                  </span>
                  <StatusPill status={stockStatus(p)} />
                </div>
              </li>
            ))}
            {out.length + low.length === 0 ? (
              <li className="text-sm text-muted-foreground">
                Everything is above its reorder level.{" "}
                <Link to="/products" className="text-primary underline-offset-4 hover:underline">
                  Manage products
                </Link>
              </li>
            ) : null}
          </ul>
        </section>

        <section className="panel p-5">
          <h2 className="text-lg font-semibold">Recent movements</h2>
          <p className="mt-1 text-sm text-muted-foreground">Latest stock in, out and adjustments.</p>
          <ul className="mt-4 space-y-2">
            {(movements.data ?? []).map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-3 rounded-md bg-secondary/60 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{m.products?.name ?? "Deleted item"}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(m.created_at).toLocaleString()}
                  </p>
                </div>
                <span
                  className={`font-mono text-sm ${
                    m.type === "in"
                      ? "text-success"
                      : m.type === "out"
                        ? "text-destructive"
                        : "text-muted-foreground"
                  }`}
                >
                  {m.type === "in" ? "+" : m.type === "out" ? "−" : "="}
                  {m.quantity}
                </span>
              </li>
            ))}
            {(movements.data ?? []).length === 0 ? (
              <li className="text-sm text-muted-foreground">
                No movements yet.{" "}
                <Link to="/movements" className="text-primary underline-offset-4 hover:underline">
                  Record one
                </Link>
              </li>
            ) : null}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
