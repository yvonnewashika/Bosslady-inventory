import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Category =
  Database["public"]["Tables"]["categories"]["Row"];

export type Supplier =
  Database["public"]["Tables"]["suppliers"]["Row"];

export type Product =
  Database["public"]["Tables"]["products"]["Row"];

export type Movement =
  Database["public"]["Tables"]["stock_movements"]["Row"];

export type MovementType =
  Database["public"]["Enums"]["movement_type"];

export type ProductWithRefs = Product & {
  categories: { name: string } | null;
  suppliers: { name: string } | null;
};

export type MovementWithProduct = Movement & {
  products: {
    name: string;
    sku: string;
    unit: string;
  } | null;
};

/*
 * Supabase's generated Database type may not yet contain
 * the profiles table if the database types were generated
 * before the staff migration.
 *
 * We therefore use a small typed wrapper for profile queries.
 */
const db = supabase as any;

/* =========================================================
   CURRENT USER
   ========================================================= */

async function currentUserId() {
  const { data } =
    await supabase.auth.getUser();

  if (!data.user) {
    throw new Error(
      "You need to be signed in.",
    );
  }

  return data.user.id;
}

/* =========================================================
   OWNER CHECK
   ========================================================= */

async function requireOwner() {
  const userId =
    await currentUserId();

  const { data, error } =
    await db
      .from("profiles")
      .select("role, active")
      .eq("id", userId)
      .single();

  if (error) {
    throw new Error(
      error.message,
    );
  }

  if (data?.role !== "owner") {
    throw new Error(
      "Only Bosslady can manage inventory.",
    );
  }

  if (data?.active === false) {
    throw new Error(
      "Your account is inactive.",
    );
  }

  return userId;
}

/* =========================================================
   HELPER
   ========================================================= */

function unwrap<T>({
  data,
  error,
}: {
  data: T | null;
  error: { message: string } | null;
}): T {
  if (error) {
    throw new Error(
      error.message,
    );
  }

  return data as T;
}

/* =========================================================
   PRODUCTS
   ========================================================= */

/*
 * IMPORTANT:
 *
 * Both Bosslady and staff can call listProducts().
 *
 * The Supabase RLS policy determines which products
 * they can see.
 *
 * For staff:
 *
 *     products.user_id = Bosslady's ID
 *
 * For Bosslady:
 *
 *     products.user_id = Bosslady's ID
 *
 * Therefore staff can see Bosslady's catalogue without
 * being allowed to modify it.
 */
export async function listProducts(): Promise<
  ProductWithRefs[]
> {
  return unwrap(
    await supabase
      .from("products")
      .select(
        "*, categories(name), suppliers(name)",
      )
      .order("name", {
        ascending: true,
      }),
  );
}

/* =========================================================
   PRODUCT INPUT
   ========================================================= */

export type ProductInput = {
  name: string;
  sku: string;
  description?: string | null;

  category_id?: string | null;

  supplier_id?: string | null;

  /*
   * What Bosslady paid for one unit.
   */
  cost_price: number;

  /*
   * Normal selling price.
   */
  unit_price: number;

  quantity: number;

  reorder_level: number;

  unit: string;

  location?: string | null;
};

/* =========================================================
   AUTO SKU
   ========================================================= */

export function autoSku(
  name: string,
) {
  const base =
    name
      .trim()
      .toUpperCase()
      .replace(
        /[^A-Z0-9]+/g,
        "",
      )
      .slice(0, 6) ||
    "ITEM";

  return `${base}-${Date.now()
    .toString(36)
    .toUpperCase()
    .slice(-4)}`;
}

/* =========================================================
   CREATE PRODUCT
   ========================================================= */

/*
 * ONLY BOSS LADY CAN CREATE PRODUCTS.
 *
 * We check the role in the frontend AND the database
 * RLS policy also protects the table.
 */
export async function createProduct(
  input: ProductInput,
) {
  const user_id =
    await requireOwner();

  const sku =
    input.sku?.trim()
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

/* =========================================================
   UPDATE PRODUCT
   ========================================================= */

export async function updateProduct(
  id: string,
  input: Partial<ProductInput>,
) {
  await requireOwner();

  return unwrap(
    await supabase
      .from("products")
      .update(input)
      .eq("id", id)
      .select()
      .single(),
  );
}

/* =========================================================
   DELETE PRODUCT
   ========================================================= */

export async function deleteProduct(
  id: string,
) {
  await requireOwner();

  const { error } =
    await supabase
      .from("products")
      .delete()
      .eq("id", id);

  if (error) {
    throw new Error(
      error.message,
    );
  }
}

/* =========================================================
   CATEGORIES
   ========================================================= */

export async function listCategories(): Promise<
  Category[]
> {
  return unwrap(
    await supabase
      .from("categories")
      .select("*")
      .order("name"),
  );
}

export async function createCategory(
  input: {
    name: string;
    description?: string | null;
  },
) {
  const user_id =
    await requireOwner();

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

export async function deleteCategory(
  id: string,
) {
  await requireOwner();

  const { error } =
    await supabase
      .from("categories")
      .delete()
      .eq("id", id);

  if (error) {
    throw new Error(
      error.message,
    );
  }
}

/* =========================================================
   SUPPLIERS
   ========================================================= */

export type SupplierInput = {
  name: string;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
};

export async function listSuppliers(): Promise<
  Supplier[]
> {
  return unwrap(
    await supabase
      .from("suppliers")
      .select("*")
      .order("name"),
  );
}

export async function createSupplier(
  input: SupplierInput,
) {
  const user_id =
    await requireOwner();

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

export async function deleteSupplier(
  id: string,
) {
  await requireOwner();

  const { error } =
    await supabase
      .from("suppliers")
      .delete()
      .eq("id", id);

  if (error) {
    throw new Error(
      error.message,
    );
  }
}

/* =========================================================
   STOCK MOVEMENTS
   ========================================================= */

export async function listMovements(
  limit = 100,
): Promise<
  MovementWithProduct[]
> {
  return unwrap(
    await supabase
      .from("stock_movements")
      .select(
        "*, products(name, sku, unit)",
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(limit),
  );
}

export async function createMovement(
  input: {
    product_id: string;
    type: MovementType;
    quantity: number;
    note?: string | null;
  },
) {
  const user_id =
    await requireOwner();

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

/* =========================================================
   STOCK STATUS
   ========================================================= */

export function stockStatus(
  p: Pick<
    Product,
    "quantity" | "reorder_level"
  >,
) {
  if (p.quantity <= 0) {
    return "out" as const;
  }

  if (
    p.quantity <=
    p.reorder_level
  ) {
    return "low" as const;
  }

  return "ok" as const;
}

/* =========================================================
   MONEY
   ========================================================= */

export const money = (
  value: number,
) =>
  new Intl.NumberFormat(
    "en-KE",
    {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 0,
    },
  ).format(value);