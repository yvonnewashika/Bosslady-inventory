import { createFileRoute, Link } from "@tanstack/react-router";
import { Boxes, BarChart3, ArrowLeftRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StockRoom — Inventory Management System" },
      {
        name: "description",
        content:
          "StockRoom is a warehouse-grade inventory system: track products, stock levels, suppliers, categories and every stock movement in real time.",
      },
      { property: "og:title", content: "StockRoom — Inventory Management System" },
      {
        property: "og:description",
        content: "Track products, stock levels, suppliers and every stock movement in real time.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const features = [
  {
    icon: Boxes,
    title: "Product catalogue",
    body: "SKUs, unit prices, storage locations, reorder levels and live quantities in one dense table.",
  },
  {
    icon: ArrowLeftRight,
    title: "Stock movements",
    body: "Log stock in, stock out and adjustments. Quantities update automatically and stay auditable.",
  },
  {
    icon: BarChart3,
    title: "Live dashboard",
    body: "Inventory value, low-stock and out-of-stock signals surfaced the moment they happen.",
  },
  {
    icon: ShieldCheck,
    title: "Private by default",
    body: "Every record is scoped to your account with row-level security on the database itself.",
  },
];

function Index() {
  return (
    <div className="grid-backdrop min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <Boxes className="size-5 text-primary" />
          <span className="font-display text-lg font-bold">StockRoom</span>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-12 pb-16 sm:pt-20">
        <p className="label-caps">Inventory management system</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-[1.05] sm:text-6xl">
          Know exactly what is on the shelf,
          <span className="text-primary"> at any moment.</span>
        </h1>
        <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
          Products, suppliers, categories and every stock movement — tracked in one fast,
          warehouse-grade workspace.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/auth">Get started free</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/auth">I already have an account</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-24 sm:grid-cols-2">
        {features.map(({ icon: Icon, title, body }) => (
          <article key={title} className="panel p-6">
            <Icon className="size-5 text-primary" />
            <h2 className="mt-4 text-lg font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{body}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
