import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bosslady Beauty & Cosmetics — Inventory System" },
      {
        name: "description",
        content:
          "Track cosmetics, beauty products, hair supplies and sales for Bosslady Beauty & Cosmetics in one simple inventory system.",
      },
      { property: "og:title", content: "Bosslady Beauty & Cosmetics — Inventory System" },
      {
        property: "og:description",
        content:
          "Track cosmetics, beauty products, hair supplies and sales for Bosslady Beauty & Cosmetics in one simple inventory system.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="grid-backdrop min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-primary" />
          <span className="font-display text-lg font-bold">Bosslady Beauty & Cosmetics</span>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-12 pb-8 sm:pt-20">
        <p className="label-caps">Inventory & sales tracking</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-[1.05] sm:text-6xl">
          Manage your beauty stock
          <span className="text-primary"> with confidence.</span>
        </h1>
        <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
          Products, sales, expenses and daily reports — all tailored for cosmetics and hairdressing supplies.
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

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="panel overflow-hidden p-0">
          <img
            src={`${import.meta.env.BASE_URL}hero-beauty.jpg`}
            alt="Cosmetics and beauty hairdressing products arranged in a modern salon"
            width={1344}
            height={768}
            className="h-auto w-full object-cover"
          />
        </div>
      </section>
    </div>
  );
}
