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
  const { data } =
    await supabase.auth.getUser();

  if (!data.user) {
    throw new Error(
      "You need to be signed in.",
    );
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

export async function listCustomers(): Promise<
  Customer[]
> {
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
  const user_id =
    await currentUserId();

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


export async function deleteCustomer(
  id: string,
) {
  const { error } =
    await supabase
      .from("customers")
      .delete()
      .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}


export async function listDebtPayments(): Promise<
  DebtPayment[]
> {
  return unwrap(
    await supabase
      .from("debt_payments")
      .select("*")
      .order("created_at", {
        ascending: false,
      }),
  );
}


export async function recordDebtPayment(
  input: {
    customer_id: string;
    amount: number;
    payment_method: PaymentMethod;
    note?: string | null;
  },
) {
  const user_id =
    await currentUserId();

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
      .select(
        `
        *,
        customers(name),
        sale_items(*)
      `,
      )
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
  const profile =
    await getMyProfile();

  if (input.lines.length === 0) {
    throw new Error(
      "Add at least one item to the sale.",
    );
  }

  const total = Math.max(
    input.lines.reduce(
      (sum, line) =>
        sum +
        line.unit_price *
          line.quantity,
      0,
    ) - input.discount,
    0,
  );

  const cost_total =
    input.lines.reduce(
      (sum, line) =>
        sum +
        line.unit_cost *
          line.quantity,
      0,
    );

  const commissionRate =
    profile.role === "staff"
      ? Number(
          profile.commission_rate || 0,
        )
      : 0;

  const commissionAmount =
    profile.role === "staff"
      ? (total * commissionRate) / 100
      : 0;

  const sale = unwrap<SaleWithDetails>(
    await db
      .from("sales")
      .insert({
        user_id: profile.id,

        business_owner_id:
          profile.role === "staff"
            ? profile.owner_id
            : profile.id,

        staff_id:
          profile.role === "staff"
            ? profile.id
            : null,

        customer_id:
          input.customer_id,

        payment_method:
          input.payment_method,

        total,

        cost_total,

        discount:
          input.discount,

        amount_paid:
          input.amount_paid,

        commission_rate:
          commissionRate,

        commission_amount:
          commissionAmount,

        note:
          input.note ?? null,
      })
      .select()
      .single(),
  );

  const { error } =
    await db
      .from("sale_items")
      .insert(
        input.lines.map((line) => ({
          user_id: profile.id,

          business_owner_id:
            profile.role === "staff"
              ? profile.owner_id
              : profile.id,

          sale_id: sale.id,

          product_id:
            line.product_id,

          product_name:
            line.product_name,

          quantity:
            line.quantity,

          unit_price:
            line.unit_price,

          unit_cost:
            line.unit_cost,
        })),
      );

  if (error) {
    throw new Error(error.message);
  }

  return sale;
}


export async function deleteSale(
  id: string,
) {
  const profile =
    await getMyProfile();

  if (profile.role !== "owner") {
    throw new Error(
      "Only Bosslady can delete sales.",
    );
  }

  const { error } =
    await db
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


export async function createExpense(
  input: {
    category: string;
    description?: string | null;
    amount: number;
    payment_method: PaymentMethod;
  },
) {
  const user_id =
    await currentUserId();

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


export async function deleteExpense(
  id: string,
) {
  const { error } =
    await supabase
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

export const KES = (
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


export type Range = {
  start: Date;
  end: Date;
  label: string;
};


const startOfDay = (
  d: Date,
) =>
  new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
  );


const addDays = (
  d: Date,
  n: number,
) =>
  new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate() + n,
  );


export function presetRange(
  key: string,
): Range {
  const now = new Date();

  const today =
    startOfDay(now);

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
        start: new Date(
          2000,
          0,
          1,
        ),
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


export function inRange(
  iso: string,
  r: Range,
) {
  const t =
    new Date(iso).getTime();

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
  byMethod: Record<
    PaymentMethod,
    number
  >;
};


export function summarise(
  sales: SaleWithDetails[],
  expenses: Expense[],
  r: Range,
): Summary {
  const s =
    sales.filter((x) =>
      inRange(x.created_at, r),
    );

  const e =
    expenses.filter((x) =>
      inRange(x.created_at, r),
    );

  const byMethod: Record<
    PaymentMethod,
    number
  > = {
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
    revenue += Number(
      sale.total,
    );

    cost += Number(
      sale.cost_total,
    );

    discount += Number(
      sale.discount,
    );

    byMethod[
      sale.payment_method
    ] += Number(
      sale.total,
    );

    credit += Math.max(
      Number(sale.total) -
        Number(
          sale.amount_paid,
        ),
      0,
    );

    itemsSold +=
      (sale.sale_items ?? [])
        .reduce(
          (n, item) =>
            n + item.quantity,
          0,
        );
  }

  const expenseTotal =
    e.reduce(
      (n, x) =>
        n + Number(x.amount),
      0,
    );

  const grossProfit =
    revenue - cost;

  return {
    revenue,
    cost,
    grossProfit,
    expenses:
      expenseTotal,
    netProfit:
      grossProfit -
      expenseTotal,
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

  for (const sale of sales.filter(
    (x) =>
      inRange(
        x.created_at,
        r,
      ),
  )) {
    for (const item of
      sale.sale_items ?? []) {
      const key =
        item.product_name;

      const entry =
        map.get(key) ??
        {
          name: key,
          qty: 0,
          revenue: 0,
          profit: 0,
        };

      entry.qty +=
        item.quantity;

      entry.revenue +=
        Number(
          item.unit_price,
        ) *
        item.quantity;

      entry.profit +=
        (Number(
          item.unit_price,
        ) -
          Number(
            item.unit_cost,
          )) *
        item.quantity;

      map.set(
        key,
        entry,
      );
    }
  }

  return [
    ...map.values(),
  ]
    .sort(
      (a, b) =>
        b.revenue -
        a.revenue,
    )
    .slice(
      0,
      limit,
    );
}


export function dailySeries(
  sales: SaleWithDetails[],
  expenses: Expense[],
  days = 14,
) {
  const today =
    startOfDay(
      new Date(),
    );

  const out: {
    date: Date;
    label: string;
    revenue: number;
    profit: number;
    expenses: number;
  }[] = [];

  for (
    let i = days - 1;
    i >= 0;
    i--
  ) {
    const day =
      addDays(
        today,
        -i,
      );

    const r: Range = {
      start: day,
      end: addDays(
        day,
        1,
      ),
      label: "",
    };

    const s =
      summarise(
        sales,
        expenses,
        r,
      );

    out.push({
      date: day,
      label:
        day.toLocaleDateString(
          "en-KE",
          {
            day: "2-digit",
            month: "short",
          },
        ),
      revenue:
        s.revenue,
      profit:
        s.netProfit,
      expenses:
        s.expenses,
    });
  }

  return out;
}


export function customerBalances(
  customers: Customer[],
  sales: SaleWithDetails[],
  payments: DebtPayment[],
) {
  return customers.map(
    (customer) => {
      const owed =
        sales
          .filter(
            (sale) =>
              sale.customer_id ===
              customer.id,
          )
          .reduce(
            (
              total,
              sale,
            ) =>
              total +
              Math.max(
                Number(
                  sale.total,
                ) -
                  Number(
                    sale.amount_paid,
                  ),
                0,
              ),
            0,
          );

      const paid =
        payments
          .filter(
            (payment) =>
              payment.customer_id ===
              customer.id,
          )
          .reduce(
            (
              total,
              payment,
            ) =>
              total +
              Number(
                payment.amount,
              ),
            0,
          );

      return {
        ...customer,
        balance:
          Math.max(
            owed - paid,
            0,
          ),
      };
    },
  );
}