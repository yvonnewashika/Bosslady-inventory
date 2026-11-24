
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

export const paymentLabel = (method: PaymentMethod) =>
  PAYMENT_METHODS.find(
    (item) => item.value === method,
  )?.label ?? method;

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

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error("You need to be signed in.");
  }

  return data.user.id;
}

/* ============================================================
   CUSTOMERS
   ============================================================ */

export async function listCustomers(): Promise<Customer[]> {
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
}): Promise<Customer> {
  const user_id = await currentUserId();

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

export async function deleteCustomer(id: string): Promise<void> {
  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

/* ============================================================
   DEBT PAYMENTS
   ============================================================ */

export async function listDebtPayments(): Promise<DebtPayment[]> {
  return unwrap(
    await supabase
      .from("debt_payments")
      .select("*")
      .order("created_at", {
        ascending: false,
      }),
  );
}

export async function createDebtPayment(input: {
  customer_id: string;
  amount: number;
  payment_method: PaymentMethod;
  note?: string | null;
}): Promise<DebtPayment> {
  const user_id = await currentUserId();

  if (input.amount <= 0) {
    throw new Error("Payment amount must be greater than zero.");
  }

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
      .select(`
        *,
        customers(name),
        sale_items(*)
      `)
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
  if (!input.lines.length) {
    throw new Error("Add at least one product to the sale.");
  }

  const profile = await getMyProfile();

  const user_id = profile.id;

  const business_owner_id =
    profile.role === "owner"
      ? profile.id
      : profile.owner_id;

  if (!business_owner_id) {
    throw new Error("Could not identify the shop owner.");
  }

  const subtotal = input.lines.reduce(
    (sum, line) =>
      sum + line.quantity * line.unit_price,
    0,
  );

  const total = Math.max(
    subtotal - Math.max(input.discount, 0),
    0,
  );

  const cost_total = input.lines.reduce(
    (sum, line) =>
      sum + line.quantity * line.unit_cost,
    0,
  );

  const commissionRate =
    profile.role === "staff"
      ? Number(profile.commission_rate || 0)
      : 0;

  const commissionAmount =
    (total * commissionRate) / 100;

  for (const line of input.lines) {
    if (
      !Number.isInteger(line.quantity) ||
      line.quantity <= 0
    ) {
      throw new Error(
        `Invalid quantity for ${line.product_name}.`,
      );
    }

    if (
      line.unit_price < 0 ||
      line.unit_cost < 0
    ) {
      throw new Error(
        `Invalid price for ${line.product_name}.`,
      );
    }
  }

  const saleData = {
    user_id,
    business_owner_id,
    staff_id:
      profile.role === "staff"
        ? profile.id
        : null,
    customer_id: input.customer_id,
    payment_method: input.payment_method,
    total,
    cost_total,
    discount: Math.max(input.discount, 0),
    amount_paid: Math.max(input.amount_paid, 0),
    commission_rate: commissionRate,
    commission_amount: commissionAmount,
    note: input.note ?? null,
  };

  const itemsData = input.lines.map((line) => ({
    product_id: line.product_id,
    product_name: line.product_name,
    quantity: line.quantity,
    unit_price: line.unit_price,
    unit_cost: line.unit_cost,
  }));

  const { data, error } = await db.rpc("record_sale", {
    p_sale: saleData,
    p_items: itemsData,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function deleteSale(id: string): Promise<void> {
  const profile = await getMyProfile();

  if (profile.role !== "owner") {
    throw new Error("Only the shop owner can delete sales.");
  }

  // Delete sale items first.
  // The database trigger automatically restores stock.

  const { error: itemsError } = await db
    .from("sale_items")
    .delete()
    .eq("sale_id", id);

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  const { error: saleError } = await db
    .from("sales")
    .delete()
    .eq("id", id);

  if (saleError) {
    throw new Error(saleError.message);
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

export async function createExpense(input: {
  category: string;
  description?: string | null;
  amount: number;
  payment_method: PaymentMethod;
}): Promise<Expense> {
  const user_id = await currentUserId();

  if (input.amount <= 0) {
    throw new Error("Expense amount must be greater than zero.");
  }

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

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase
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

export const KES = (amount: number): string =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);

export type Range = {
  start: Date;
  end: Date;
  label: string;
};

function startOfDay(d: Date): Date {
  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
  );
}

function addDays(d: Date, n: number): Date {
  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate() + n,
  );
}

export function presetRange(key: string): Range {
  const today = startOfDay(new Date());
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
        start: new Date(0),
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

function inRange(
  value: string,
  range: Range,
): boolean {
  const time = new Date(value).getTime();

  return (
    time >= range.start.getTime() &&
    time < range.end.getTime()
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
  byMethod: Record<PaymentMethod, number>;
};

export function summarise(
  sales: SaleWithDetails[],
  expenses: Expense[],
  range: Range,
): Summary {
  const filteredSales = sales.filter(
    (sale) => inRange(sale.created_at, range),
  );

  const filteredExpenses = expenses.filter(
    (expense) => inRange(expense.created_at, range),
  );

  const byMethod: Record<PaymentMethod, number> = {
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

  for (const sale of filteredSales) {
    revenue += Number(sale.total || 0);

    cost += Number(sale.cost_total || 0);

    discount += Number(sale.discount || 0);

    credit += Math.max(
      Number(sale.total || 0) -
        Number(sale.amount_paid || 0),
      0,
    );

    byMethod[sale.payment_method] +=
      Number(sale.amount_paid || 0);

    for (const item of sale.sale_items ?? []) {
      itemsSold += Number(item.quantity || 0);
    }
  }

  const totalExpenses = filteredExpenses.reduce(
    (sum, expense) =>
      sum + Number(expense.amount || 0),
    0,
  );

  const grossProfit = revenue - cost;

  return {
    revenue,
    cost,
    grossProfit,
    expenses: totalExpenses,
    netProfit: grossProfit - totalExpenses,
    saleCount: filteredSales.length,
    itemsSold,
    discount,
    credit,
    byMethod,
  };
}

/* ============================================================
   TOP PRODUCTS
   ============================================================ */

export function topProducts(
  sales: SaleWithDetails[],
  range: Range,
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

  const filteredSales = sales.filter(
    (sale) => inRange(sale.created_at, range),
  );

  for (const sale of filteredSales) {
    for (const item of sale.sale_items ?? []) {
      const key = item.product_name;

      if (!map.has(key)) {
        map.set(key, {
          name: key,
          qty: 0,
          revenue: 0,
          profit: 0,
        });
      }

      const entry = map.get(key)!;

      const quantity = Number(item.quantity || 0);
      const price = Number(item.unit_price || 0);
      const cost = Number(item.unit_cost || 0);

      entry.qty += quantity;
      entry.revenue += quantity * price;
      entry.profit += quantity * (price - cost);
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

/* ============================================================
   DAILY SALES SERIES
   ============================================================ */

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

  const today = startOfDay(new Date());

  for (let i = days - 1; i >= 0; i--) {
    const day = addDays(today, -i);
    const nextDay = addDays(day, 1);

    const range: Range = {
      start: day,
      end: nextDay,
      label: "",
    };

    const dailySales = sales.filter(
      (sale) => inRange(sale.created_at, range),
    );

    const dailyExpenses = expenses.filter(
      (expense) => inRange(expense.created_at, range),
    );

    const revenue = dailySales.reduce(
      (sum, sale) =>
        sum + Number(sale.total || 0),
      0,
    );

    const cost = dailySales.reduce(
      (sum, sale) =>
        sum + Number(sale.cost_total || 0),
      0,
    );

    const expenseTotal = dailyExpenses.reduce(
      (sum, expense) =>
        sum + Number(expense.amount || 0),
      0,
    );

    out.push({
      date: day,
      label: day.toLocaleDateString("en-KE", {
        day: "2-digit",
        month: "short",
      }),
      revenue,
      profit: revenue - cost - expenseTotal,
      expenses: expenseTotal,
    });
  }

  return out;
}

/* ============================================================
   CUSTOMER BALANCES
   ============================================================ */

export function customerBalances(
  customers: Customer[],
  sales: SaleWithDetails[],
  payments: DebtPayment[],
) {
  return customers.map((customer) => {
    const customerSales = sales.filter(
      (sale) => sale.customer_id === customer.id,
    );

    const customerPayments = payments.filter(
      (payment) => payment.customer_id === customer.id,
    );

    const totalSales = customerSales.reduce(
      (total, sale) =>
        total + Number(sale.total || 0),
      0,
    );

    const totalPaid = customerSales.reduce(
      (total, sale) =>
        total + Number(sale.amount_paid || 0),
      0,
    );

    const debtPayments = customerPayments.reduce(
      (total, payment) =>
        total + Number(payment.amount || 0),
      0,
    );

    const balance = Math.max(
      totalSales - totalPaid - debtPayments,
      0,
    );

    return {
      ...customer,
      totalSales,
      totalPaid: totalPaid + debtPayments,
      balance,
    };
  });
}
