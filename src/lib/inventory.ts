import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Supplier = Database["public"]["Tables"]["suppliers"]["Row"];
export type Product = Database["public"]["Tables"]["products"]["Row"];
export type Movement = Database["public"]["Tables"]["stock_movements"]["Row"];
export type MovementType = Database["public"]["Enums"]["movement_type"];

export type ProductWithRefs = Product & {
  categories: { name: string } | null;
  suppliers: { name: string } | null;
};

export type MovementWithProduct = Movement & {
  products: { name: string; sku: string; unit: string } | null;
};

async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("You need to be signed in.");
  return data.user.id;
}

function unwrap<T>({
  data,
  error,
}: {
  data: T | null;
  error: { message: string } | null;
}): T {
  if (error) throw new Error(error.message);
  return data as T;
}

/* ---------------- products ---------------- */

export async function listProducts(): Promise<ProductWithRefs[]> {
  return unwrap(
    await supabase
      .from("products")
      .select("*, categories(name), suppliers(name)")
      .order("name", { ascending: true }),
  );
}

export type ProductInput = {
  name: string;
  sku: string;
  description?: string | null;
  category_id?: string | null;
  supplier_id?: string | null;

  // What you paid for one unit
  cost_price: number;

  // What you normally charge the customer for one unit
  unit_price: number;

  quantity: number;
  reorder_level: number;
  unit: string;
  location?: string | null;
};

export function autoSku(name: string) {
  const base =
    name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "")
      .slice(0, 6) || "ITEM";

  return `${base}-${Date.now().toString(36).toUpperCase().slice(-4)}`;
}

export async function createProduct(input: ProductInput) {
  const user_id = await currentUserId();

  const sku = input.sku?.trim()
    ? input.sku.trim()
    : autoSku(input.name);

  return unwrap(
    await supabase
      .from("products")
      .insert({
        ...input,
        sku,
        user_id,
      })
      .select()
      .single(),
  );
}

export async function updateProduct(
  id: string,
  input: Partial<ProductInput>,
) {
  return unwrap(
    await supabase
      .from("products")
      .update(input)
      .eq("id", id)
      .select()
      .single(),
  );
}

export async function deleteProduct(id: string) {
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}

/* ---------------- categories ---------------- */

export async function listCategories(): Promise<Category[]> {
  return unwrap(
    await supabase
      .from("categories")
      .select("*")
      .order("name"),
  );
}

export async function createCategory(input: {
  name: string;
  description?: string | null;
}) {
  const user_id = await currentUserId();

  return unwrap(
    await supabase
      .from("categories")
      .insert({
        ...input,
        user_id,
      })
      .select()
      .single(),
  );
}

export async function deleteCategory(id: string) {
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}

/* ---------------- suppliers ---------------- */

export type SupplierInput = {
  name: string;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
};

export async function listSuppliers(): Promise<Supplier[]> {
  return unwrap(
    await supabase
      .from("suppliers")
      .select("*")
      .order("name"),
  );
}

export async function createSupplier(input: SupplierInput) {
  const user_id = await currentUserId();

  return unwrap(
    await supabase
      .from("suppliers")
      .insert({
        ...input,
        user_id,
      })
      .select()
      .single(),
  );
}

export async function deleteSupplier(id: string) {
  const { error } = await supabase
    .from("suppliers")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}

/* ---------------- stock movements ---------------- */

export async function listMovements(
  limit = 100,
): Promise<MovementWithProduct[]> {
  return unwrap(
    await supabase
      .from("stock_movements")
      .select("*, products(name, sku, unit)")
      .order("created_at", { ascending: false })
      .limit(limit),
  );
}

export async function createMovement(input: {
  product_id: string;
  type: MovementType;
  quantity: number;
  note?: string | null;
}) {
  const user_id = await currentUserId();

  return unwrap(
    await supabase
      .from("stock_movements")
      .insert({
        ...input,
        user_id,
      })
      .select()
      .single(),
  );
}

/* ---------------- derived ---------------- */

export function stockStatus(
  p: Pick<Product, "quantity" | "reorder_level">,
) {
  if (p.quantity <= 0) return "out" as const;
  if (p.quantity <= p.reorder_level) return "low" as const;
  return "ok" as const;
}

export const money = (value: number) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(value);