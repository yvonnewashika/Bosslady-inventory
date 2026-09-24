import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  KES,
  listExpenses,
  listSales,
  paymentLabel,
  presetRange,
  summarise,
  topProducts,
  dailySeries,
  PAYMENT_METHODS,
} from "@/lib/shop";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Sales Reports — StockRoom" },
      {
        name: "description",
        content:
          "Daily, weekly, monthly and yearly sales reports with revenue, profit, expenses and top products in KES.",
      },
      { property: "og:title", content: "Sales Reports — StockRoom" },
      {
        property: "og:description",
        content: "Track today's, yesterday's, weekly, monthly and yearly sales performance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Reports,
});

const PRESETS = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "last7", label: "This week (7 days)" },
  { key: "thismonth", label: "This month" },
  { key: "lastmonth", label: "Last month" },
  { key: "thisyear", label: "This year" },
  { key: "all", label: "All time" },
] as const;

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="panel p-5">
      <p className="label-caps">{label}</p>
      <p className={`stat-value mt-3 ${tone ?? ""}`}>{value}</p>
    </div>
  );
}

function Reports() {
  const [preset, setPreset] = useState<string>("today");
  const sales = useQuery({ queryKey: ["sales"], queryFn: () => listSales() });
  const expenses = useQuery({ queryKey: ["expenses"], queryFn: () => listExpenses() });

  const allSales = sales.data ?? [];
  const allExpenses = expenses.data ?? [];
  const range = presetRange(preset);
  const s = summarise(allSales, allExpenses, range);
  const top = topProducts(allSales, range);
  const series = dailySeries(allSales, allExpenses, 14);
  const maxRevenue = Math.max(...series.map((d) => d.revenue), 1);

  const loading = sales.isLoading || expenses.isLoading;

  return (
    <AppShell>
      <PageHeader
        title="Reports"
        subtitle="Sales, profit and expenses across any period."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <Button
            key={p.key}
            size="sm"
            variant={preset === p.key ? "default" : "outline"}
            onClick={() => setPreset(p.key)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading report…</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label={`${range.label} sales`} value={KES(s.revenue)} />
            <Stat label="Gross profit" value={KES(s.grossProfit)} tone="text-success" />
            <Stat label="Expenses" value={KES(s.expenses)} tone="text-warning" />
            <Stat
              label="Net profit"
              value={KES(s.netProfit)}
              tone={s.netProfit < 0 ? "text-destructive" : "text-success"}
            />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Sales count" value={String(s.saleCount)} />
            <Stat label="Items sold" value={String(s.itemsSold)} />
            <Stat label="Discounts given" value={KES(s.discount)} />
            <Stat label="Unpaid (credit)" value={KES(s.credit)} tone="text-destructive" />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <section className="panel p-5">
              <h2 className="text-lg font-semibold">Sales by payment method</h2>
              <ul className="mt-4 space-y-2">
                {PAYMENT_METHODS.map((m) => (
                  <li
                    key={m.value}
                    className="flex items-center justify-between rounded-md bg-secondary/60 px-3 py-2 text-sm"
                  >
                    <span>{paymentLabel(m.value)}</span>
                    <span className="font-mono">{KES(s.byMethod[m.value])}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="panel p-5">
              <h2 className="text-lg font-semibold">Top products</h2>
              <ul className="mt-4 space-y-2">
                {top.map((p) => (
                  <li
                    key={p.name}
                    className="flex items-center justify-between gap-3 rounded-md bg-secondary/60 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.qty} sold</p>
                    </div>
                    <span className="font-mono text-sm">{KES(p.revenue)}</span>
                  </li>
                ))}
                {top.length === 0 ? (
                  <li className="text-sm text-muted-foreground">No sales in this period.</li>
                ) : null}
              </ul>
            </section>
          </div>

          <section className="panel mt-4 p-5">
            <h2 className="text-lg font-semibold">Last 14 days</h2>
            <ul className="mt-4 space-y-2">
              {series.map((d) => (
                <li key={d.label} className="flex items-center gap-3">
                  <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">
                    {d.label}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(d.revenue / maxRevenue) * 100}%` }}
                    />
                  </div>
                  <span className="w-24 shrink-0 text-right font-mono text-xs">
                    {KES(d.revenue)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </AppShell>
  );
}
