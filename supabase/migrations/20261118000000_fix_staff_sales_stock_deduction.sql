-- ============================================================
-- BOSS LADY INVENTORY
-- AUTOMATIC STOCK DEDUCTION FOR STAFF SALES
-- ============================================================

-- Deduct stock from the business owner's inventory.
CREATE OR REPLACE FUNCTION public.apply_sale_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_remaining INTEGER;
BEGIN

    IF NEW.product_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.quantity IS NULL OR NEW.quantity <= 0 THEN
        RAISE EXCEPTION
            'Sale quantity must be greater than zero.';
    END IF;

    UPDATE public.products
    SET quantity = quantity - NEW.quantity
    WHERE id = NEW.product_id
      AND user_id = NEW.business_owner_id
      AND quantity >= NEW.quantity
    RETURNING quantity INTO v_remaining;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Insufficient stock for %. The product may not belong to this shop or the available quantity is lower than requested.',
            NEW.product_name;
    END IF;

    RETURN NEW;

END;
$$;


-- ============================================================
-- RESTORE STOCK WHEN A SALE IS DELETED
-- ============================================================

CREATE OR REPLACE FUNCTION
public.restore_stock_after_sale_item_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

    IF OLD.product_id IS NOT NULL AND OLD.quantity > 0 THEN

        UPDATE public.products
        SET quantity = quantity + OLD.quantity
        WHERE id = OLD.product_id
          AND user_id = OLD.business_owner_id;

    END IF;

    RETURN OLD;

END;
$$;


DROP TRIGGER IF EXISTS sale_items_restore_stock
ON public.sale_items;

CREATE TRIGGER sale_items_restore_stock
AFTER DELETE ON public.sale_items
FOR EACH ROW
EXECUTE FUNCTION
public.restore_stock_after_sale_item_delete();


-- ============================================================
-- RECORD SALE AND SALE ITEMS IN ONE TRANSACTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.record_sale(
    p_sale JSONB,
    p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE

    v_sale public.sales%ROWTYPE;
    v_item RECORD;

BEGIN

    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION
            'You need to be signed in.';
    END IF;

    IF p_items IS NULL
       OR jsonb_typeof(p_items) <> 'array' THEN

        RAISE EXCEPTION
            'Sale items must be provided as a list.';

    END IF;

    IF jsonb_array_length(p_items) = 0 THEN

        RAISE EXCEPTION
            'Add at least one item to the sale.';

    END IF;


    -- Create the sale record.

    INSERT INTO public.sales (
        user_id,
        business_owner_id,
        staff_id,
        customer_id,
        payment_method,
        total,
        cost_total,
        discount,
        amount_paid,
        commission_rate,
        commission_amount,
        note
    )

    VALUES (

        (p_sale->>'user_id')::uuid,

        (p_sale->>'business_owner_id')::uuid,

        NULLIF(p_sale->>'staff_id', '')::uuid,

        NULLIF(p_sale->>'customer_id', '')::uuid,

        (p_sale->>'payment_method')::public.payment_method,

        COALESCE(
            (p_sale->>'total')::numeric,
            0
        ),

        COALESCE(
            (p_sale->>'cost_total')::numeric,
            0
        ),

        COALESCE(
            (p_sale->>'discount')::numeric,
            0
        ),

        COALESCE(
            (p_sale->>'amount_paid')::numeric,
            0
        ),

        COALESCE(
            (p_sale->>'commission_rate')::numeric,
            0
        ),

        COALESCE(
            (p_sale->>'commission_amount')::numeric,
            0
        ),

        NULLIF(p_sale->>'note', '')

    )

    RETURNING * INTO v_sale;


    -- Insert each sold product.
    -- The existing sale_items_apply trigger will deduct stock.

    FOR v_item IN

        SELECT *

        FROM jsonb_to_recordset(p_items)
        AS x(
            product_id UUID,
            product_name TEXT,
            quantity INTEGER,
            unit_price NUMERIC,
            unit_cost NUMERIC
        )

    LOOP

        IF v_item.quantity IS NULL
           OR v_item.quantity <= 0 THEN

            RAISE EXCEPTION
                'Sale quantity must be greater than zero.';

        END IF;


        INSERT INTO public.sale_items (

            user_id,
            business_owner_id,
            sale_id,
            product_id,
            product_name,
            quantity,
            unit_price,
            unit_cost

        )

        VALUES (

            (p_sale->>'user_id')::uuid,

            (p_sale->>'business_owner_id')::uuid,

            v_sale.id,

            v_item.product_id,

            v_item.product_name,

            v_item.quantity,

            COALESCE(v_item.unit_price, 0),

            COALESCE(v_item.unit_cost, 0)

        );

    END LOOP;


    RETURN to_jsonb(v_sale);

END;
$$;


-- Allow authenticated users to record sales through this function.

REVOKE ALL ON FUNCTION public.record_sale(JSONB, JSONB)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.record_sale(JSONB, JSONB)
TO authenticated;