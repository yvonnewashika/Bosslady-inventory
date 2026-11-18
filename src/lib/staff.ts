import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export type UserRole = "owner" | "staff";

export type StaffMember = {
  id: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  commission_rate: number;
  role: UserRole;
  owner_id: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type StaffSaleItem = {
  id: string;
  sale_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
};

export type StaffSale = {
  id: string;
  user_id: string;
  staff_id: string | null;
  business_owner_id: string;
  payment_method: string;
  total: number;
  amount_paid: number;
  cost_total: number;
  discount: number;
  commission_rate: number;
  commission_amount: number;
  note: string | null;
  created_at: string;
  sale_items: StaffSaleItem[];
};

export type CommissionPayment = {
  id: string;
  business_owner_id: string;
  staff_id: string;
  amount: number;
  payment_method: string;
  reference: string | null;
  note: string | null;
  created_at: string;
};

async function currentUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error("You need to be signed in.");
  }

  return data.user;
}

function unwrap<T>({
  data,
  error,
}: {
  data: T | null;
  error: { message: string } | null;
}) {
  if (error) {
    throw new Error(error.message);
  }

  return data as T;
}


// ============================================================
// CURRENT USER PROFILE
// ============================================================

export async function getMyProfile(): Promise<StaffMember> {
  const user = await currentUser();

  return unwrap(
    await db
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single(),
  );
}


// ============================================================
// STAFF LIST
// ============================================================

export async function listStaff(): Promise<StaffMember[]> {
  const profile = await getMyProfile();

  if (profile.role !== "owner") {
    return [];
  }

  return unwrap(
    await db
      .from("profiles")
      .select("*")
      .eq("owner_id", profile.id)
      .eq("role", "staff")
      .eq("active", true)
      .order("display_name"),
  );
}


// ============================================================
// CREATE STAFF
// ============================================================

export async function createStaff(input: {
  display_name: string;
  email: string;
  phone: string;
  address: string;
  password: string;
  commission_rate: number;
}) {
  const { data, error } =
    await supabase.functions.invoke(
      "manage-staff",
      {
        body: {
          action: "create",
          ...input,
        },
      },
    );

  if (error) {
    throw new Error(error.message);
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
}


// ============================================================
// UPDATE STAFF
// ============================================================

export async function updateStaff(input: {
  staff_id: string;
  display_name: string;
  email: string;
  phone: string;
  address: string;
  password?: string;
  commission_rate: number;
}) {
  const { data, error } =
    await supabase.functions.invoke(
      "manage-staff",
      {
        body: {
          action: "update",
          ...input,
        },
      },
    );

  if (error) {
    throw new Error(error.message);
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
}


// ============================================================
// DELETE STAFF
// ============================================================

export async function deleteStaff(
  staff_id: string,
) {
  const { data, error } =
    await supabase.functions.invoke(
      "manage-staff",
      {
        body: {
          action: "delete",
          staff_id,
        },
      },
    );

  if (error) {
    throw new Error(error.message);
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
}


// ============================================================
// STAFF SALES
// ============================================================

export async function listStaffSales(
  staffId: string,
  limit = 300,
): Promise<StaffSale[]> {
  return unwrap(
    await db
      .from("sales")
      .select(
        `
        *,
        sale_items(*)
      `,
      )
      .eq("staff_id", staffId)
      .order("created_at", {
        ascending: false,
      })
      .limit(limit),
  );
}


// ============================================================
// COMMISSION PAYMENTS
// ============================================================

export async function listCommissionPayments(
  staffId: string,
): Promise<CommissionPayment[]> {
  return unwrap(
    await db
      .from("commission_payments")
      .select("*")
      .eq("staff_id", staffId)
      .order("created_at", {
        ascending: false,
      }),
  );
}


export async function recordCommissionPayment(input: {
  staff_id: string;
  amount: number;
  payment_method:
    | "cash"
    | "mpesa"
    | "credit"
    | "bank";
  reference?: string | null;
  note?: string | null;
}) {
  const owner = await getMyProfile();

  if (owner.role !== "owner") {
    throw new Error(
      "Only Bosslady can record commission payments.",
    );
  }

  return unwrap(
    await db
      .from("commission_payments")
      .insert({
        business_owner_id: owner.id,
        staff_id: input.staff_id,
        amount: input.amount,
        payment_method: input.payment_method,
        reference: input.reference ?? null,
        note: input.note ?? null,
      })
      .select()
      .single(),
  );
}


// ============================================================
// STAFF SUMMARY
// ============================================================

export function calculateStaffSummary(
  staff: StaffMember,
  sales: StaffSale[],
  payments: CommissionPayment[],
) {
  const totalRevenue = sales.reduce(
    (sum, sale) =>
      sum + Number(sale.total),
    0,
  );

  const totalPaid = sales.reduce(
    (sum, sale) =>
      sum + Number(sale.amount_paid),
    0,
  );

  const commissionEarned = sales.reduce(
    (sum, sale) =>
      sum + Number(sale.commission_amount),
    0,
  );

  const commissionPaid = payments.reduce(
    (sum, payment) =>
      sum + Number(payment.amount),
    0,
  );

  const commissionDue = Math.max(
    commissionEarned - commissionPaid,
    0,
  );

  return {
    totalSales: sales.length,
    totalRevenue,
    totalPaid,
    commissionEarned,
    commissionPaid,
    commissionDue,
    commissionRate: Number(
      staff.commission_rate || 0,
    ),
  };
}