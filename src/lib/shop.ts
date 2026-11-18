import { supabase } from "@/integrations/supabase/client";
import { getMyProfile } from "@/lib/staff";
import type { Database } from "@/integrations/supabase/types";

const db = supabase as any;

export type Customer =
  Database["public"]["Tables"]["customers"]["Row"];

export type Sale =
  Database["public"]["Tables"]["sales"]["Row"];

export type SaleItem =
  Database["public"]["Tables"]["sale_items"]["Row"];

export type Expense =
  Database["public"]["Tables"]["expenses"]["Row"];

export type DebtPayment =
  Database["public"]["Tables"]["debt_payments"]["Row"];

export type PaymentMethod =
  Database["public"]["Enums"]["payment_method"];

export type SaleWithDetails = Sale & {
  customers: { name: string } | null;
  sale_items: SaleItem[];
  staff_id: string | null;
  business_owner_id: string;
  commission_rate: number;
  commission_amount: number;
};

export const PAYMENT_METHODS: {
  value: PaymentMethod;
  label: string;
}[] = [
  { value: "cash", label: "Cash" },
  { value: "mpesa", label: "M-Pesa" },
  { value: "credit", label: "Credit (debt)" },
  { value: "bank", label: "Bank" },
];

export const paymentLabel = (
  m: PaymentMethod,
) =>
  PAYMENT_METHODS.find(
    (p) => p.value === m,
  )?.label ?? m;

async function currentUserId() {

  if (!data.user) {
  }

  return data.user.id;
}

function unwrap<T>({
  data,
  error,
}: {
  data: T | null;
  error: { message: string } | null;
}): T {
  if (error) {
    throw new Error(error.message);
  }

  return data as T;
}

/* ============================================================
   CUSTOMERS
   ============================================================ */

  return unwrap(
    await supabase
      .from("customers")
      .select("*")
      .order("name"),
  );
}

export async function createCustomer(input: {
  name: string;
  phone?: string | null;
  note?: string | null;
}) {

  return unwrap(
    await supabase
      .from("customers")
      .insert({
        ...input,
        user_id,
      })
      .select()
      .single(),
  );
}

    .from("customers")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

  return unwrap(
    await supabase
      .from("debt_payments")
      .select("*")
      .order("created_at", {
        ascending: false,
      }),
  );
}

  customer_id: string;
  amount: number;
  payment_method: PaymentMethod;
  note?: string | null;

  return unwrap(
    await supabase
      .from("debt_payments")
      .insert({
        ...input,
        user_id,
      })
      .select()
      .single(),
  );
}

/* ============================================================
   SALES
   ============================================================ */

export type CartLine = {
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
};

export async function listSales(
  limit = 200,
): Promise<SaleWithDetails[]> {
  return unwrap(
    await db
      .from("sales")
        *,
        customers(name),
        sale_items(*)
      .order("created_at", {
        ascending: false,
      })
      .limit(limit),
  );
}


export async function createSale(input: {
  lines: CartLine[];
  payment_method: PaymentMethod;
  customer_id: string | null;
  discount: number;
  amount_paid: number;
  note?: string | null;
}) {

    throw new Error(
      );
    }

    (sum, line) =>
    0,
  );

    (sum, line) =>
    0,
  );

  const commissionRate =
    profile.role === "staff"
      : 0;

  const commissionAmount =

    user_id: profile.id,


    staff_id:
      profile.role === "staff"
        ? profile.id
        : null,



    total,

    cost_total,








  if (error) {
    throw new Error(error.message);
  }

}



  if (profile.role !== "owner") {
  }

    .from("sales")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

/* ============================================================
   EXPENSES
   ============================================================ */

export const EXPENSE_CATEGORIES = [
  "Rent",
  "Transport",
  "Salaries",
  "Electricity",
  "Water",
  "Airtime & Data",
  "Licenses",
  "Restocking",
  "General",
];

export async function listExpenses(
  limit = 300,
): Promise<Expense[]> {
  return unwrap(
    await supabase
      .from("expenses")
      .select("*")
      .order("created_at", {
        ascending: false,
      })
      .limit(limit),
  );
}

  category: string;
  description?: string | null;
  amount: number;
  payment_method: PaymentMethod;

  return unwrap(
    await supabase
      .from("expenses")
      .insert({
        ...input,
        user_id,
      })
      .select()
      .single(),
  );
}

    .from("expenses")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

/* ============================================================
   REPORTING
   ============================================================ */

    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,

export type Range = {
  start: Date;
  end: Date;
  label: string;
};

  new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
  );

  new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate() + n,
  );

  const now = new Date();

  switch (key) {
    case "yesterday":
      return {
        start: addDays(today, -1),
        end: today,
        label: "Yesterday",
      };

    case "last7":
      return {
        start: addDays(today, -6),
        end: addDays(today, 1),
        label: "Last 7 days",
      };

    case "thismonth":
      return {
        start: new Date(
          now.getFullYear(),
          now.getMonth(),
          1,
        ),
        end: addDays(today, 1),
        label: "This month",
      };

    case "lastmonth":
      return {
        start: new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          1,
        ),
        end: new Date(
          now.getFullYear(),
          now.getMonth(),
          1,
        ),
        label: "Last month",
      };

    case "thisyear":
      return {
        start: new Date(
          now.getFullYear(),
          0,
          1,
        ),
        end: addDays(today, 1),
        label: "This year",
      };

    case "all":
      return {
        end: addDays(today, 1),
        label: "All time",
      };

    default:
      return {
        start: today,
        end: addDays(today, 1),
        label: "Today",
      };
  }
}


  return (
    t >= r.start.getTime() &&
    t < r.end.getTime()
  );
}

export type Summary = {
  revenue: number;
  cost: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  saleCount: number;
  itemsSold: number;
  discount: number;
  credit: number;
};

export function summarise(
  sales: SaleWithDetails[],
  expenses: Expense[],
  r: Range,
): Summary {
    inRange(x.created_at, r),
  );

    inRange(x.created_at, r),
  );

    cash: 0,
    mpesa: 0,
    credit: 0,
    bank: 0,
  };

  let revenue = 0;
  let cost = 0;
  let discount = 0;
  let itemsSold = 0;
  let credit = 0;

  for (const sale of s) {


    credit += Math.max(
      0,
    );

      0,
    );
  }

    0,
  );


  return {
    revenue,
    cost,
    grossProfit,
    saleCount: s.length,
    itemsSold,
    discount,
    credit,
    byMethod,
  };
}

export function topProducts(
  sales: SaleWithDetails[],
  r: Range,
  limit = 8,
) {
  const map = new Map<
    string,
    {
      name: string;
      qty: number;
      revenue: number;
      profit: number;
    }
  >();

  )) {

        name: key,
        qty: 0,
        revenue: 0,
        profit: 0,
      };


      entry.revenue +=

      entry.profit +=
        item.quantity;

    }
  }

}

export function dailySeries(
  sales: SaleWithDetails[],
  expenses: Expense[],
  days = 14,
) {

  const out: {
    date: Date;
    label: string;
    revenue: number;
    profit: number;
    expenses: number;
  }[] = [];


    const r: Range = {
      start: day,
      label: "",
    };


    out.push({
      date: day,
        day: "2-digit",
        month: "short",
    });
  }

  return out;
}

export function customerBalances(
  customers: Customer[],
  sales: SaleWithDetails[],
  payments: DebtPayment[],
) {
      .filter(
      )
      .reduce(
          total +
          Math.max(
            0,
          ),
        0,
      );

      .filter(
      )
      .reduce(
        0,
      );

    return {
      ...customer,
    };
}