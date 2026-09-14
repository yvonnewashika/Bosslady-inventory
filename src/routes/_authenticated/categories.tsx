import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCategory, deleteCategory, listCategories, listProducts } from "@/lib/inventory";

export const Route = createFileRoute("/_authenticated/categories")({
  head: () => ({
    meta: [
      { title: "Categories — StockRoom Inventory" },
      { name: "description", content: "Group your products into categories for faster reporting." },
      { property: "og:title", content: "Categories — StockRoom Inventory" },
      { property: "og:description", content: "Organise your catalogue into product categories." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Categories,
});

function Categories() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const categories = useQuery({ queryKey: ["categories"], queryFn: listCategories });
  const products = useQuery({ queryKey: ["products"], queryFn: listProducts });

  const create = useMutation({
    mutationFn: () => createCategory({ name, description: description || null }),
    onSuccess: () => {
      toast.success("Category added");
      setName("");
      setDescription("");
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      toast.success("Category removed");
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const countFor = (id: string) =>
    (products.data ?? []).filter((p) => p.category_id === id).length;

  return (
    <AppShell>
      <PageHeader title="Categories" subtitle="Group products for faster filtering and reporting." />

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <form
          className="panel h-fit space-y-4 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <h2 className="text-lg font-semibold">New category</h2>
          <div className="space-y-2">
            <Label htmlFor="cname">Name</Label>
            <Input
              id="cname"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}

            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cdesc">Description</Label>
            <Input
              id="cdesc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={create.isPending}>
            {create.isPending ? "Saving…" : "Add category"}
          </Button>
        </form>

        <ul className="grid gap-3 sm:grid-cols-2">
          {(categories.data ?? []).map((c) => (
            <li key={c.id} className="panel flex items-start justify-between gap-2 p-5">
              <div className="min-w-0">
                <h3 className="text-base font-semibold">{c.name}</h3>
                {c.description ? (
                  <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
                ) : null}
                <p className="label-caps mt-2">{countFor(c.id)} products</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => remove.mutate(c.id)}
                aria-label={`Delete ${c.name}`}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </li>
          ))}
          {(categories.data ?? []).length === 0 ? (
            <li className="text-sm text-muted-foreground">No categories yet.</li>
          ) : null}
        </ul>
      </div>
    </AppShell>
  );
}
