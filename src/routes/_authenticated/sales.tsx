import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Trash2, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

import { AppShell, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/Field";

import { listProducts } from "@/lib/inventory";
import { getMyProfile, listStaff } from "@/lib/staff";

import {
  createSale,
  deleteSale,
  listCustomers,
  listSales,
  KES,
  PAYMENT_METHODS,
  paymentLabel,
  type CartLine,
  type PaymentMethod,
} from "@/lib/shop";

export const Route = createFileRoute("/_authenticated/sales")({
  head: () => ({
    meta: [
      { title: "Sales — Bosslady Inventory" },
      {
        name: "description",
        content:
          "Record shop sales, take payments by cash, M-Pesa, bank or credit, and update stock instantly.",
      },
      {
        property: "og:title",
        content: "Sales — Bosslady Inventory",
      },
      {
        property: "og:description",
        content:
          "Point of sale for your shop: add items to a cart, record payment and reduce stock automatically.",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        name: "twitter:card",
        content: "summary_large_image",
      },
    ],
  }),
  component: Sales,
});

function Sales() {
  const qc = useQueryClient();

  /*
   * PRODUCTS
   *
   * Staff can see Bosslady's products because listProducts()
   * reads from the products table and the Supabase RLS policy
   * allows the whole business to view the owner's catalogue.
   */
  const products = useQuery({
    queryKey: ["products"],
    queryFn: listProducts,
  });

  /*
   * CUSTOMERS
   */
  const customers = useQuery({
    queryKey: ["customers"],
    queryFn: listCustomers,
  });

  /*
   * SALES
   *
   * IMPORTANT:
   * We do NOT filter sales here by user.
   *
   * Supabase RLS handles this:
   *
   * - Bosslady/owner -> receives all business sales
   * - Staff -> receives only their own sales
   */
  const sales = useQuery({
    queryKey: ["sales"],
    queryFn: () => listSales(),
  });

  /*
   * STAFF
   *
   * Bosslady can see all staff.
   * Staff can only see their own profile because of RLS.
   */
  const staff = useQuery({
    queryKey: ["staff"],
    queryFn: listStaff,
  });

  /*
   * CURRENT USER PROFILE
   *
   * Used to determine whether this is Bosslady or a staff member.
   */
  const profile = useQuery({
    queryKey: ["my-profile"],
    queryFn: getMyProfile,
  });

  const isOwner = profile.data?.role === "owner";
  const isStaff = profile.data?.role === "staff";

  const [lines, setLines] = useState<CartLine[]>([]);
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("cash");
  const [customerId, setCustomerId] = useState("");
  const [discount, setDiscount] = useState("0");
  const [amountPaid, setAmountPaid] = useState("");
  const [note, setNote] = useState("");

  /*
   * CART SUBTOTAL
   */
  const subtotal = useMemo(
    () =>
      lines.reduce(
        (sum, line) =>
          sum + line.unit_price * line.quantity,
        0,
      ),
    [lines],
  );

  /*
   * FINAL SALE TOTAL
   */
  const total = Math.max(
    subtotal - (Number(discount) || 0),
    0,
  );

  /*
   * Select product.
   *
   * The selling price is automatically taken from
   * Bosslady's inventory.
   */
  const selectProduct = (id: string) => {
    setProductId(id);

    const product = (products.data ?? []).find(
      (item) => item.id === id,
    );

    setPrice(
      product
        ? String(product.unit_price)
        : "",
    );
  };

  /*
   * ADD PRODUCT TO CART
   */
  const addLine = () => {
    const product = (products.data ?? []).find(
      (item) => item.id === productId,
    );

    if (!product) {
      toast.error("Pick a product first.");
      return;
    }

    const quantity = Number(qty);

    if (!quantity || quantity <= 0) {
      toast.error("Enter a valid quantity.");
      return;
    }

    if (quantity > product.quantity) {
      toast.warning(
        `Only ${product.quantity} ${product.unit} in stock.`,
      );
    }

    setLines((previous) => [
      ...previous,
      {
        product_id: product.id,
        product_name: product.name,
        quantity,
        unit_price:
          Number(price) || Number(product.unit_price),
        unit_cost:
          Number(product.cost_price) || 0,
      },
    ]);

    setProductId("");
    setQty("1");
    setPrice("");
  };

  /*
   * RECORD SALE
   *
   * createSale() automatically uses the currently
   * authenticated user's ID.
   *
   * Therefore:
   *
   * Bosslady sale:
   *    user_id = Bosslady's auth ID
   *
   * Staff sale:
   *    user_id = staff member's auth ID
   *
   * The database trigger then:
   *
   * - determines the business owner
   * - gets the staff commission rate
   * - calculates commission_amount
   */
  const record = useMutation({
    mutationFn: () =>
      createSale({
        lines,
        payment_method: paymentMethod,
        customer_id:
          customerId || null,
        discount:
          Number(discount) || 0,
        amount_paid:
          amountPaid === ""
            ? total
            : Number(amountPaid),
        note:
          note || null,
      }),

    onSuccess: () => {
      toast.success("Sale recorded successfully.");

      setLines([]);
      setProductId("");
      setQty("1");
      setPrice("");
      setDiscount("0");
      setAmountPaid("");
      setNote("");
      setCustomerId("");
      setPaymentMethod("cash");

      /*
       * Refresh sales and inventory.
       */
      qc.invalidateQueries({
        queryKey: ["sales"],
      });

      qc.invalidateQueries({
        queryKey: ["products"],
      });

      qc.invalidateQueries({
        queryKey: ["staff"],
      });
    },

    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  /*
   * DELETE SALE
   *
   * The database RLS policy only permits Bosslady/owner
   * to delete sales.
   *
   * Staff do not get the delete button.
   */
  const remove = useMutation({
    mutationFn: deleteSale,

    onSuccess: () => {
      toast.success("Sale deleted.");

      qc.invalidateQueries({
        queryKey: ["sales"],
      });

      qc.invalidateQueries({
        queryKey: ["products"],
      });
    },

    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  /*
   * Find staff name from the sale's user_id.
   */
  const getStaffName = (userId: string | null) => {
    if (!userId) {
      return "Former staff / deleted account";
    }

    /*
     * Bosslady's own sales
     */
    if (
      profile.data?.role === "owner" &&
      userId === profile.data.id
    ) {
      return "Bosslady";
    }

    return (
      staff.data?.find(
        (member) => member.id === userId,
      )?.display_name ??
      "Staff member"
    );
  };

  return (
    <AppShell>
      <PageHeader
        title="Sales"
        subtitle={
          isOwner
            ? "View and manage all sales made by Bosslady and staff."
            : "Record your daily sales."
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">

        {/* =========================================================
            NEW SALE
        ========================================================= */}
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <ShoppingCart className="size-4 text-primary" />
            New sale
          </h2>

          {isStaff && (
            <div className="mb-4 rounded-md border border-border bg-secondary p-3 text-sm">
              <p className="font-medium">
                Staff sale
              </p>

              <p className="text-muted-foreground">
                This sale will automatically be recorded
                under{" "}
                <span className="font-medium text-foreground">
                  {profile.data?.display_name ??
                    "your account"}
                </span>
                .
              </p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-[2fr_0.8fr_1fr_auto] sm:items-end">

            {/* PRODUCT */}
            <div>
              <Label className="mb-1 block">
                Product
              </Label>

              <NativeSelect
                value={productId}
                onChange={(event) =>
                  selectProduct(
                    event.target.value,
                  )
                }
              >
                <option value="">
                  Select product…
                </option>

                {(products.data ?? []).map(
                  (product) => (
                    <option
                      key={product.id}
                      value={product.id}
                    >
                      {product.name} ·{" "}
                      {product.quantity}{" "}
                      {product.unit}
                    </option>
                  ),
                )}
              </NativeSelect>
            </div>

            {/* QUANTITY */}
            <div>
              <Label className="mb-1 block">
                Qty
              </Label>

              <Input
                type="number"
                min="1"
                value={qty}
                onChange={(event) =>
                  setQty(event.target.value)
                }
              />
            </div>

            {/* SELLING PRICE */}
            <div>
              <Label className="mb-1 block">
                Unit price
              </Label>

              <Input
                type="number"
                min="0"
                value={price}
                onChange={(event) =>
                  setPrice(event.target.value)
                }
              />
            </div>

            <Button
              type="button"
              onClick={addLine}
            >
              <Plus className="size-4" />
              Add
            </Button>
          </div>

          {/* CART */}
          <div className="mt-4 divide-y divide-border rounded-md border border-border">
            {lines.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                Cart is empty. Add items above.
              </p>
            ) : (
              lines.map((line, index) => (
                <div
                  key={`${line.product_id}-${index}`}
                  className="flex items-center justify-between gap-3 p-3 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {line.product_name}
                    </p>

                    <p className="text-muted-foreground">
                      {line.quantity} ×{" "}
                      {KES(line.unit_price)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono">
                      {KES(
                        line.quantity *
                          line.unit_price,
                      )}
                    </span>

                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      onClick={() =>
                        setLines((previous) =>
                          previous.filter(
                            (_, itemIndex) =>
                              itemIndex !== index,
                          ),
                        )
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* SALE DETAILS */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">

            {/* PAYMENT METHOD */}
            <div>
              <Label className="mb-1 block">
                Payment method
              </Label>

              <NativeSelect
                value={paymentMethod}
                onChange={(event) =>
                  setPaymentMethod(
                    event.target.value as PaymentMethod,
                  )
                }
              >
                {PAYMENT_METHODS.map(
                  (method) => (
                    <option
                      key={method.value}
                      value={method.value}
                    >
                      {method.label}
                    </option>
                  ),
                )}
              </NativeSelect>
            </div>

            {/* CUSTOMER */}
            <div>
              <Label className="mb-1 block">
                Customer (optional)
              </Label>

              <NativeSelect
                value={customerId}
                onChange={(event) =>
                  setCustomerId(
                    event.target.value,
                  )
                }
              >
                <option value="">
                  Walk-in customer
                </option>

                {(customers.data ?? []).map(
                  (customer) => (
                    <option
                      key={customer.id}
                      value={customer.id}
                    >
                      {customer.name}
                    </option>
                  ),
                )}
              </NativeSelect>
            </div>

            {/* DISCOUNT */}
            <div>
              <Label className="mb-1 block">
                Discount
              </Label>

              <Input
                type="number"
                min="0"
                value={discount}
                onChange={(event) =>
                  setDiscount(
                    event.target.value,
                  )
                }
              />
            </div>

            {/* AMOUNT PAID */}
            <div>
              <Label className="mb-1 block">
                Amount paid
              </Label>

              <Input
                type="number"
                min="0"
                placeholder={String(total)}
                value={amountPaid}
                onChange={(event) =>
                  setAmountPaid(
                    event.target.value,
                  )
                }
              />
            </div>

            {/* NOTE */}
            <div className="sm:col-span-2">
              <Label className="mb-1 block">
                Note
              </Label>

              <Input
                value={note}
                onChange={(event) =>
                  setNote(event.target.value)
                }
                placeholder="Optional"
              />
            </div>
          </div>

          {/* TOTAL */}
          <div className="mt-4 flex items-center justify-between rounded-md bg-secondary p-3">
            <span className="label-caps">
              Total
            </span>

            <span className="font-mono text-lg font-bold">
              {KES(total)}
            </span>
          </div>

          {/* RECORD */}
          <Button
            className="mt-3 w-full"
            disabled={
              lines.length === 0 ||
              record.isPending
            }
            onClick={() =>
              record.mutate()
            }
          >
            {record.isPending
              ? "Saving…"
              : "Record sale"}
          </Button>
        </section>

        {/* =========================================================
            SALES LIST
        ========================================================= */}
        <section className="rounded-lg border border-border bg-card p-4">

          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">
                {isOwner
                  ? "All sales"
                  : "My sales"}
              </h2>

              <p className="text-xs text-muted-foreground">
                {isOwner
                  ? "Sales made by Bosslady and every staff member."
                  : "Sales recorded under your account."}
              </p>
            </div>
          </div>

          <div className="divide-y divide-border">

            {(sales.data ?? []).length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                No sales recorded yet.
              </p>
            ) : (
              (sales.data ?? [])
                .slice(0, 30)
                .map((sale) => {

                  const staffName =
                    getStaffName(
                      sale.user_id,
                    );

                  return (
                    <div
                      key={sale.id}
                      className="py-4 text-sm"
                    >

                      <div className="flex items-start justify-between gap-3">

                        {/* SALE INFORMATION */}
                        <div className="min-w-0">

                          <p className="font-medium">
                            {(sale.sale_items ?? [])
                              .map(
                                (item) =>
                                  `${item.quantity}× ${item.product_name}`,
                              )
                              .join(", ") ||
                              "Sale"}
                          </p>

                          <p className="mt-1 text-xs text-muted-foreground">
                            {new Date(
                              sale.created_at,
                            ).toLocaleString(
                              "en-KE",
                            )}
                          </p>

                          <p className="text-xs text-muted-foreground">
                            Payment:{" "}
                            <span className="font-medium text-foreground">
                              {paymentLabel(
                                sale.payment_method,
                              )}
                            </span>
                          </p>

                          {sale.customers?.name && (
                            <p className="text-xs text-muted-foreground">
                              Customer:{" "}
                              {sale.customers.name}
                            </p>
                          )}

                          {/* BOSS LADY SEES STAFF */}
                          {isOwner && (
                            <div className="mt-2 rounded-md bg-secondary px-2 py-1.5">

                              <p className="text-xs">
                                <span className="font-medium">
                                  Sold by:
                                </span>{" "}
                                {staffName}
                              </p>

                              <p className="text-xs">
                                <span className="font-medium">
                                  Commission:
                                </span>{" "}
                                {KES(
                                  Number(
                                    sale.commission_amount ??
                                      0,
                                  ),
                                )}
                              </p>

                              <p className="text-xs">
                                <span className="font-medium">
                                  Commission rate:
                                </span>{" "}
                                {Number(
                                  sale.commission_rate ??
                                    0,
                                )}
                                %
                              </p>
                            </div>
                          )}

                          {/* STAFF SEES THEIR OWN COMMISSION */}
                          {isStaff && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              Commission earned:{" "}
                              <span className="font-medium text-foreground">
                                {KES(
                                  Number(
                                    sale.commission_amount ??
                                      0,
                                  ),
                                )}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* AMOUNTS */}
                        <div className="shrink-0 text-right">

                          <p className="font-mono font-semibold">
                            {KES(
                              Number(
                                sale.total,
                              ),
                            )}
                          </p>

                          <p className="text-xs text-success">
                            Paid:{" "}
                            {KES(
                              Number(
                                sale.amount_paid,
                              ),
                            )}
                          </p>

                          {/* DELETE ONLY FOR OWNER */}
                          {isOwner && (
                            <Button
                              variant="ghost"
                              size="icon"
                              type="button"
                              className="mt-1"
                              disabled={
                                remove.isPending
                              }
                              onClick={() =>
                                remove.mutate(
                                  sale.id,
                                )
                              }
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}