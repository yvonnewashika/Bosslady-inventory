-- ============================================================
-- BOSSLADY INVENTORY
-- STAFF MANAGEMENT + STAFF SALES + COMMISSIONS
-- ============================================================

-- ------------------------------------------------------------
-- 1. Extend profiles
-- ------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'owner'
    CHECK (role IN ('owner', 'staff'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS address TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2) NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;


-- ------------------------------------------------------------
-- 2. Existing users are Bosslady owners
-- ------------------------------------------------------------

UPDATE public.profiles
SET role = 'owner'
WHERE role IS NULL OR role NOT IN ('owner', 'staff');


-- ------------------------------------------------------------
-- 3. Function: find the business owner for the logged-in user
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_business_owner_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN p.role = 'staff' THEN p.owner_id
      ELSE p.id
    END
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_business_owner_id()
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.current_business_owner_id()
TO authenticated;


-- ------------------------------------------------------------
-- 4. Function: get current user's role
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_user_role()
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.current_user_role()
TO authenticated;


-- ------------------------------------------------------------
-- 5. Make sure profile RLS allows owner to see their staff
-- ------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;

CREATE POLICY "profiles_select"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR owner_id = auth.uid()
);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;

CREATE POLICY "profiles_update"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  id = auth.uid()
  OR owner_id = auth.uid()
)
WITH CHECK (
  id = auth.uid()
  OR owner_id = auth.uid()
);


-- ------------------------------------------------------------
-- 6. Add business owner + staff member to sales
-- ------------------------------------------------------------

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS business_owner_id UUID
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS staff_id UUID
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2) NOT NULL DEFAULT 0;

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(12,2) NOT NULL DEFAULT 0;


-- Existing sales belong to their original owner
UPDATE public.sales
SET business_owner_id = user_id
WHERE business_owner_id IS NULL;


-- ------------------------------------------------------------
-- 7. Add business owner to sale items
-- ------------------------------------------------------------

ALTER TABLE public.sale_items
  ADD COLUMN IF NOT EXISTS business_owner_id UUID
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

UPDATE public.sale_items si
SET business_owner_id = s.business_owner_id
FROM public.sales s
WHERE si.sale_id = s.id
  AND si.business_owner_id IS NULL;


-- ------------------------------------------------------------
-- 8. Commission payments
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.commission_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  business_owner_id UUID NOT NULL
    REFERENCES public.profiles(id)
    ON DELETE CASCADE,

  staff_id UUID NOT NULL
    REFERENCES public.profiles(id)
    ON DELETE CASCADE,

  amount NUMERIC(12,2) NOT NULL DEFAULT 0
    CHECK (amount >= 0),

  payment_method public.payment_method NOT NULL DEFAULT 'mpesa',

  reference TEXT,

  note TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS commission_payments_staff_idx
ON public.commission_payments(staff_id, created_at DESC);

CREATE INDEX IF NOT EXISTS commission_payments_owner_idx
ON public.commission_payments(business_owner_id, created_at DESC);

ALTER TABLE public.commission_payments ENABLE ROW LEVEL SECURITY;


-- ------------------------------------------------------------
-- 9. Commission payment security
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "commission_payments_select"
ON public.commission_payments;

CREATE POLICY "commission_payments_select"
ON public.commission_payments
FOR SELECT
TO authenticated
USING (
  business_owner_id = public.current_business_owner_id()
  AND (
    public.current_user_role() = 'owner'
    OR staff_id = auth.uid()
  )
);


DROP POLICY IF EXISTS "commission_payments_insert"
ON public.commission_payments;

CREATE POLICY "commission_payments_insert"
ON public.commission_payments
FOR INSERT
TO authenticated
WITH CHECK (
  public.current_user_role() = 'owner'
  AND business_owner_id = auth.uid()
);


DROP POLICY IF EXISTS "commission_payments_update"
ON public.commission_payments;

CREATE POLICY "commission_payments_update"
ON public.commission_payments
FOR UPDATE
TO authenticated
USING (
  public.current_user_role() = 'owner'
  AND business_owner_id = auth.uid()
)
WITH CHECK (
  public.current_user_role() = 'owner'
  AND business_owner_id = auth.uid()
);


DROP POLICY IF EXISTS "commission_payments_delete"
ON public.commission_payments;

CREATE POLICY "commission_payments_delete"
ON public.commission_payments
FOR DELETE
TO authenticated
USING (
  public.current_user_role() = 'owner'
  AND business_owner_id = auth.uid()
);


GRANT SELECT, INSERT, UPDATE, DELETE
ON public.commission_payments
TO authenticated;

GRANT ALL
ON public.commission_payments
TO service_role;


-- ------------------------------------------------------------
-- 10. SALES RLS
-- ------------------------------------------------------------

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own sales" ON public.sales;
DROP POLICY IF EXISTS "sales_select" ON public.sales;
DROP POLICY IF EXISTS "sales_insert" ON public.sales;
DROP POLICY IF EXISTS "sales_update" ON public.sales;
DROP POLICY IF EXISTS "sales_delete" ON public.sales;


CREATE POLICY "sales_select"
ON public.sales
FOR SELECT
TO authenticated
USING (
  business_owner_id = public.current_business_owner_id()
  AND (
    public.current_user_role() = 'owner'
    OR staff_id = auth.uid()
  )
);


CREATE POLICY "sales_insert"
ON public.sales
FOR INSERT
TO authenticated
WITH CHECK (
  business_owner_id = public.current_business_owner_id()
  AND (
    (
      public.current_user_role() = 'owner'
      AND staff_id IS NULL
      AND user_id = auth.uid()
    )
    OR
    (
      public.current_user_role() = 'staff'
      AND staff_id = auth.uid()
      AND user_id = auth.uid()
    )
  )
);


CREATE POLICY "sales_update"
ON public.sales
FOR UPDATE
TO authenticated
USING (
  business_owner_id = public.current_business_owner_id()
  AND (
    public.current_user_role() = 'owner'
    OR staff_id = auth.uid()
  )
)
WITH CHECK (
  business_owner_id = public.current_business_owner_id()
  AND (
    public.current_user_role() = 'owner'
    OR staff_id = auth.uid()
  )
);


CREATE POLICY "sales_delete"
ON public.sales
FOR DELETE
TO authenticated
USING (
  business_owner_id = public.current_business_owner_id()
  AND public.current_user_role() = 'owner'
);


-- ------------------------------------------------------------
-- 11. SALE ITEMS RLS
-- ------------------------------------------------------------

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own sale items" ON public.sale_items;
DROP POLICY IF EXISTS "sale_items_select" ON public.sale_items;
DROP POLICY IF EXISTS "sale_items_insert" ON public.sale_items;
DROP POLICY IF EXISTS "sale_items_update" ON public.sale_items;
DROP POLICY IF EXISTS "sale_items_delete" ON public.sale_items;


CREATE POLICY "sale_items_select"
ON public.sale_items
FOR SELECT
TO authenticated
USING (
  business_owner_id = public.current_business_owner_id()
  AND (
    public.current_user_role() = 'owner'
    OR user_id = auth.uid()
  )
);


CREATE POLICY "sale_items_insert"
ON public.sale_items
FOR INSERT
TO authenticated
WITH CHECK (
  business_owner_id = public.current_business_owner_id()
  AND user_id = auth.uid()
);


CREATE POLICY "sale_items_update"
ON public.sale_items
FOR UPDATE
TO authenticated
USING (
  business_owner_id = public.current_business_owner_id()
  AND (
    public.current_user_role() = 'owner'
    OR user_id = auth.uid()
  )
)
WITH CHECK (
  business_owner_id = public.current_business_owner_id()
  AND (
    public.current_user_role() = 'owner'
    OR user_id = auth.uid()
  )
);


CREATE POLICY "sale_items_delete"
ON public.sale_items
FOR DELETE
TO authenticated
USING (
  business_owner_id = public.current_business_owner_id()
  AND public.current_user_role() = 'owner'
);


-- ------------------------------------------------------------
-- 12. PRODUCTS
-- Staff can SEE Bosslady's products.
-- Only Bosslady can create/edit/delete products.
-- ------------------------------------------------------------

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own products" ON public.products;
DROP POLICY IF EXISTS "products_select" ON public.products;
DROP POLICY IF EXISTS "products_owner_insert" ON public.products;
DROP POLICY IF EXISTS "products_owner_update" ON public.products;
DROP POLICY IF EXISTS "products_owner_delete" ON public.products;


CREATE POLICY "products_select"
ON public.products
FOR SELECT
TO authenticated
USING (
  user_id = public.current_business_owner_id()
);


CREATE POLICY "products_owner_insert"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (
  public.current_user_role() = 'owner'
  AND user_id = auth.uid()
);


CREATE POLICY "products_owner_update"
ON public.products
FOR UPDATE
TO authenticated
USING (
  public.current_user_role() = 'owner'
  AND user_id = auth.uid()
)
WITH CHECK (
  public.current_user_role() = 'owner'
  AND user_id = auth.uid()
);


CREATE POLICY "products_owner_delete"
ON public.products
FOR DELETE
TO authenticated
USING (
  public.current_user_role() = 'owner'
  AND user_id = auth.uid()
);


-- ------------------------------------------------------------
-- 13. STAFF INDEXES
-- ------------------------------------------------------------

CREATE INDEX IF NOT EXISTS profiles_owner_idx
ON public.profiles(owner_id);

CREATE INDEX IF NOT EXISTS profiles_role_idx
ON public.profiles(role);

CREATE INDEX IF NOT EXISTS sales_business_owner_idx
ON public.sales(business_owner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS sales_staff_idx
ON public.sales(staff_id, created_at DESC);

CREATE INDEX IF NOT EXISTS sale_items_business_owner_idx
ON public.sale_items(business_owner_id);


-- ------------------------------------------------------------
-- 14. Grants
-- ------------------------------------------------------------

GRANT SELECT, UPDATE
ON public.profiles
TO authenticated;

GRANT ALL
ON public.commission_payments
TO service_role;