
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Plus,
  Pencil,
  Search,
  Download,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { AppShell, PageHeader } from "@/components/AppShell";
import { StatusPill } from "@/components/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  createProduct,
  listProducts,
  updateProduct,
  deleteProduct,
  money,
  stockStatus,
  type ProductInput,
  type ProductWithRefs,
} from "@/lib/inventory";

export const Route = createFileRoute("/_authenticated/products")({
  head: () => ({
    meta: [
      { title: "Products — StockRoom Inventory" },
      {
        name: "description",
        content:
          "Add products with cost price, selling price, quantity and live stock levels.",
      },
      {
        property: "og:title",
        content: "Products — StockRoom Inventory",
      },
      {
        property: "og:description",
        content:
          "Manage products, buying costs, selling prices and stock levels.",
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

  component: Products,
});

const emptyForm: ProductInput = {
  name: "",
  sku: "",
  description: null,
  category_id: null,
  supplier_id: null,
  cost_price: 0,
  unit_price: 0,
  quantity: 0,
  reorder_level: 5,
  unit: "pcs",
  location: null,
};

function Products() {
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const [form, setForm] =
    useState<ProductInput>(emptyForm);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [downloadingCatalogue, setDownloadingCatalogue] =
    useState(false);

  /*
   * ============================
   * LOAD PRODUCTS
   * ============================
   */

  const products = useQuery({
    queryKey: ["products"],
    queryFn: listProducts,
  });

  /*
   * ============================
   * DOWNLOAD CATALOGUE
   * ============================
   */

  const downloadCatalogue = () => {
    const catalogueProducts = products.data ?? [];

    if (catalogueProducts.length === 0) {
      toast.info(
        "There are no products to include in the catalogue.",
      );
      return;
    }

    try {
      setDownloadingCatalogue(true);

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const generatedOn =
        new Date().toLocaleDateString("en-KE");

      /*
       * ESTIMATED STOCK VALUE
       *
       * Quantity × Cost Price
       */

      const estimatedStockValue =
        catalogueProducts.reduce(
          (total, product) => {
            const quantity =
              Number(product.quantity ?? 0);

            const costPrice =
              Number(product.cost_price ?? 0);

            return (
              total +
              quantity * costPrice
            );
          },
          0,
        );

      /*
       * TOTAL INVENTORY VALUE
       *
       * Quantity × Selling Price
       */

      const totalInventoryValue =
        catalogueProducts.reduce(
          (total, product) => {
            const quantity =
              Number(product.quantity ?? 0);

            const sellingPrice =
              Number(product.unit_price ?? 0);

            return (
              total +
              quantity * sellingPrice
            );
          },
          0,
        );

      const formatMoney = (
        value: number,
      ) =>
        `KSh ${value.toLocaleString("en-KE", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;

      /*
       * ============================
       * CATALOGUE HEADER
       * ============================
       */

      doc.setFont(
        "helvetica",
        "bold",
      );

      doc.setFontSize(18);

      doc.text(
        "PRODUCT CATALOGUE",
        14,
        15,
      );

      doc.setFont(
        "helvetica",
        "normal",
      );

      doc.setFontSize(9);

      doc.text(
        `Generated: ${generatedOn}`,
        14,
        22,
      );

      doc.text(
        `Products: ${catalogueProducts.length}`,
        14,
        27,
      );

      /*
       * BOTH VALUES AT THE TOP
       */

      doc.setFont(
        "helvetica",
        "bold",
      );

      doc.setFontSize(11);

      doc.text(
        `ESTIMATED STOCK VALUE: ${formatMoney(
          estimatedStockValue,
        )}`,
        14,
        34,
      );

      doc.text(
        `TOTAL INVENTORY VALUE: ${formatMoney(
          totalInventoryValue,
        )}`,
        14,
        41,
      );

      /*
       * ============================
       * PRODUCT TABLE
       * ============================
       *
       * Product
       * Qty
       * Cost Price
       * Selling Price
       * Stock Value
       * Inventory Value
       * SKU
       */

      autoTable(doc, {
        startY: 48,

        head: [
          [
            "Product",
            "Qty",
            "Cost Price",
            "Selling Price",
            "Stock Value",
            "Inventory Value",
            "SKU",
          ],
        ],

        body: catalogueProducts.map(
          (product) => {
            const quantity =
              Number(
                product.quantity ?? 0,
              );

            const costPrice =
              Number(
                product.cost_price ?? 0,
              );

            const sellingPrice =
              Number(
                product.unit_price ?? 0,
              );

            const stockValue =
              quantity * costPrice;

            const inventoryValue =
              quantity *
              sellingPrice;

            return [
              product.name ?? "",
              quantity.toString(),
              formatMoney(costPrice),
              formatMoney(
                sellingPrice,
              ),
              formatMoney(
                stockValue,
              ),
              formatMoney(
                inventoryValue,
              ),
              product.sku ?? "",
            ];
          },
        ),

        /*
         * TOTALS AT THE BOTTOM
         */

        foot: [
          [
            "TOTALS",
            "",
            "",
            "",
            formatMoney(
              estimatedStockValue,
            ),
            formatMoney(
              totalInventoryValue,
            ),
            "",
          ],
        ],

        styles: {
          fontSize: 7.5,
          cellPadding: 2.2,
          valign: "middle",
        },

        headStyles: {
          fontSize: 7.5,
          fontStyle: "bold",
        },

        footStyles: {
          fontSize: 8,
          fontStyle: "bold",
        },

        columnStyles: {
          /*
           * Product
           */

          0: {
            cellWidth: 65,
          },

          /*
           * Quantity
           */

          1: {
            cellWidth: 18,
            halign: "right",
          },

          /*
           * Cost Price
           */

          2: {
            cellWidth: 32,
            halign: "right",
          },

          /*
           * Selling Price
           */

          3: {
            cellWidth: 34,
            halign: "right",
          },

          /*
           * Stock Value
           */

          4: {
            cellWidth: 38,
            halign: "right",
          },

          /*
           * Inventory Value
           */

          5: {
            cellWidth: 42,
            halign: "right",
          },

          /*
           * SKU
           */

          6: {
            cellWidth: 45,
          },
        },

        margin: {
          left: 8,
          right: 8,
        },

        didDrawPage: () => {
          const pageNumber =
            doc.getNumberOfPages();

          doc.setFontSize(8);

          doc.setFont(
            "helvetica",
            "normal",
          );

          doc.text(
            "Product Catalogue",
            10,
            200,
          );

          doc.text(
            `Page ${pageNumber}`,
            287,
            200,
            {
              align: "right",
            },
          );
        },
      });

      /*
       * SAVE PDF
       */

      doc.save(
        "Bosslady-Product-Catalogue.pdf",
      );

      toast.success(
        "Product catalogue downloaded successfully.",
      );
    } catch (error) {
      console.error(
        "Catalogue download error:",
        error,
      );

      toast.error(
        "Failed to generate the product catalogue.",
      );
    } finally {
      setDownloadingCatalogue(false);
    }
  };

  /*
   * ============================
   * SAVE / UPDATE PRODUCT
   * ============================
   */

  const save = useMutation({
    mutationFn: () =>
      editingId
        ? updateProduct(
            editingId,
            form,
          )
        : createProduct(form),

    onSuccess: () => {
      toast.success(
        editingId
          ? "Product updated"
          : "Product added",
      );

      setForm(emptyForm);

      setEditingId(null);

      setOpen(false);

      qc.invalidateQueries({
        queryKey: ["products"],
      });
    },

    onError: (error: Error) => {
      toast.error(
        error.message,
      );
    },
  });

  /*
   * ============================
   * DELETE PRODUCT
   * ============================
   */

  const deleteMutation =
    useMutation({
      mutationFn: (
        id: string,
      ) => deleteProduct(id),

      onSuccess: () => {
        toast.success(
          "Product deleted successfully.",
        );

        qc.invalidateQueries({
          queryKey: ["products"],
        });
      },

      onError: (
        error: Error,
      ) => {
        toast.error(
          error.message ||
            "Failed to delete product.",
        );
      },
    });

  /*
   * ============================
   * OPEN EDIT PRODUCT
   * ============================
   */

  const openEditProduct = (
    p: ProductWithRefs,
  ) => {
    setForm({
      name: p.name,
      sku: p.sku ?? "",
      description:
        p.description ?? null,
      category_id:
        p.category_id ?? null,
      supplier_id:
        p.supplier_id ?? null,
      cost_price:
        Number(p.cost_price),
      unit_price:
        Number(p.unit_price),
      quantity:
        Number(p.quantity),
      reorder_level:
        Number(p.reorder_level),
      unit: p.unit,
      location:
        p.location ?? null,
    });

    setEditingId(p.id);

    setOpen(true);
  };

  /*
   * ============================
   * FILTER PRODUCTS
   * ============================
   */

  const rows =
    (products.data ?? []).filter(
      (p) =>
        p.name
          .toLowerCase()
          .includes(
            q.toLowerCase(),
          ),
    );

  /*
   * ============================
   * PAGE
   * ============================
   */

  return (
    <AppShell>

      <PageHeader
        title="Products"
        subtitle="Manage your products, buying costs, selling prices and live stock levels."
        action={

          <div className="flex flex-col items-end gap-2">

            {/* =========================
                NEW PRODUCT
            ========================== */}

            <Dialog
              open={open}
              onOpenChange={setOpen}
            >

              <DialogTrigger asChild>

                <Button>

                  <Plus className="size-4" />

                  New product

                </Button>

              </DialogTrigger>

              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">

                <DialogHeader>

                  <DialogTitle>

                    {editingId
                      ? "Edit product"
                      : "New product"}

                  </DialogTitle>

                </DialogHeader>

                <form
                  className="space-y-4"
                  onSubmit={(e) => {

                    e.preventDefault();

                    if (
                      Number(
                        form.cost_price,
                      ) < 0
                    ) {
                      toast.error(
                        "Cost price cannot be negative.",
                      );

                      return;
                    }

                    if (
                      Number(
                        form.unit_price,
                      ) < 0
                    ) {
                      toast.error(
                        "Selling price cannot be negative.",
                      );

                      return;
                    }

                    if (
                      Number(
                        form.unit_price,
                      ) <
                      Number(
                        form.cost_price,
                      )
                    ) {
                      toast.warning(
                        "Selling price is below the cost price. This will result in a loss.",
                      );
                    }

                    save.mutate();

                  }}
                >

                  {/* PRODUCT NAME */}

                  <div className="space-y-2">

                    <Label htmlFor="name">
                      Product
                    </Label>

                    <Input
                      id="name"
                      required
                      value={form.name}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          name:
                            e.target.value,
                        })
                      }
                      placeholder="e.g. Braids"
                    />

                  </div>

                  {/* QUANTITY + COST */}

                  <div className="grid gap-4 sm:grid-cols-2">

                    <div className="space-y-2">

                      <Label htmlFor="qty">
                        Quantity
                      </Label>

                      <Input
                        id="qty"
                        type="number"
                        min="0"
                        value={
                          form.quantity
                        }
                        onChange={(e) =>
                          setForm({
                            ...form,
                            quantity:
                              Number(
                                e.target.value,
                              ),
                          })
                        }
                      />

                    </div>

                    <div className="space-y-2">

                      <Label htmlFor="cost_price">
                        Cost Price (KSh)
                      </Label>

                      <Input
                        id="cost_price"
                        type="number"
                        step="1"
                        min="0"
                        value={
                          form.cost_price
                        }
                        onChange={(e) =>
                          setForm({
                            ...form,
                            cost_price:
                              Number(
                                e.target.value,
                              ),
                          })
                        }
                      />

                      <p className="text-xs text-muted-foreground">
                        What you paid for one item.
                      </p>

                    </div>

                  </div>

                  {/* SELLING PRICE */}

                  <div className="space-y-2">

                    <Label htmlFor="unit_price">
                      Selling Price (KSh)
                    </Label>

                    <Input
                      id="unit_price"
                      type="number"
                      step="1"
                      min="0"
                      value={
                        form.unit_price
                      }
                      onChange={(e) =>
                        setForm({
                          ...form,
                          unit_price:
                            Number(
                              e.target.value,
                            ),
                        })
                      }
                      placeholder="e.g. 75"
                    />

                    <p className="text-xs text-muted-foreground">
                      What you normally charge the customer for one item.
                    </p>

                  </div>

                  {/* VALUE SUMMARY */}

                  <div className="rounded-md bg-secondary/60 px-3 py-3 text-sm space-y-1">

                    <div className="flex justify-between">

                      <span className="text-muted-foreground">
                        Stock cost:
                      </span>

                      <span className="font-mono">

                        {money(
                          Number(
                            form.cost_price,
                          ) *
                            Number(
                              form.quantity,
                            ),
                        )}

                      </span>

                    </div>

                    <div className="flex justify-between">

                      <span className="text-muted-foreground">
                        Potential sales value:
                      </span>

                      <span className="font-mono">

                        {money(
                          Number(
                            form.unit_price,
                          ) *
                            Number(
                              form.quantity,
                            ),
                        )}

                      </span>

                    </div>

                    <div className="flex justify-between border-t border-border pt-1">

                      <span className="text-muted-foreground">
                        Potential gross profit:
                      </span>

                      <span className="font-mono font-semibold">

                        {money(
                          (
                            Number(
                              form.unit_price,
                            ) -
                            Number(
                              form.cost_price,
                            )
                          ) *
                            Number(
                              form.quantity,
                            ),
                        )}

                      </span>

                    </div>

                  </div>

                  {/* SAVE */}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={
                      save.isPending
                    }
                  >

                    {save.isPending
                      ? editingId
                        ? "Updating…"
                        : "Saving…"
                      : editingId
                        ? "Update product"
                        : "Save product"}

                  </Button>

                </form>

              </DialogContent>

            </Dialog>

            {/* =========================
                DOWNLOAD CATALOGUE
            ========================== */}

            <Button
              variant="outline"
              onClick={
                downloadCatalogue
              }
              disabled={
                downloadingCatalogue ||
                products.isLoading
              }
            >

              <Download className="size-4" />

              {downloadingCatalogue
                ? "Preparing catalogue..."
                : "Download Catalogue"}

            </Button>

          </div>
        }
      />

      {/* =========================
          SEARCH
      ========================== */}

      <div className="relative mb-4 max-w-sm">

        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

        <Input
          className="pl-9"
          placeholder="Search products"
          value={q}
          onChange={(e) =>
            setQ(
              e.target.value,
            )
          }
        />

      </div>

      {/* =========================
          PRODUCT TABLE
      ========================== */}

      <div className="panel overflow-x-auto">

        <table className="w-full text-sm">

          <thead>

            <tr className="border-b border-border text-left">

              {[
                "Product",
                "Qty",
                "Cost",
                "Selling Price",
                "Stock Value",
                "Status",
                "",
              ].map((h) => (

                <th
                  key={h}
                  className="label-caps px-4 py-3 font-normal"
                >
                  {h}
                </th>

              ))}

            </tr>

          </thead>

          <tbody>

            {rows.map((p) => (

              <tr
                key={p.id}
                className="border-b border-border/60 last:border-0 hover:bg-secondary/40"
              >

                {/* PRODUCT */}

                <td className="px-4 py-3">

                  <p className="font-medium">
                    {p.name}
                  </p>

                  {p.sku ? (
                    <p className="text-xs text-muted-foreground">
                      {p.sku}
                    </p>
                  ) : null}

                </td>

                {/* QUANTITY */}

                <td className="px-4 py-3 font-mono">
                  {p.quantity}
                </td>

                {/* COST */}

                <td className="px-4 py-3 font-mono">
                  {money(
                    Number(
                      p.cost_price,
                    ),
                  )}
                </td>

                {/* SELLING PRICE */}

                <td className="px-4 py-3 font-mono font-medium">
                  {money(
                    Number(
                      p.unit_price,
                    ),
                  )}
                </td>

                {/* STOCK VALUE */}

                <td className="px-4 py-3 font-mono">
                  {money(
                    Number(
                      p.cost_price,
                    ) *
                      Number(
                        p.quantity,
                      ),
                  )}
                </td>

                {/* STATUS */}

                <td className="px-4 py-3">

                  <StatusPill
                    status={stockStatus(
                      p,
                    )}
                  />

                </td>

                {/* EDIT + DELETE */}

                <td className="px-4 py-3 text-right">

                  <div className="flex items-center justify-end gap-1">

                    {/* EDIT */}

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        openEditProduct(
                          p,
                        )
                      }
                      aria-label={`Edit ${p.name}`}
                      title={`Edit ${p.name}`}
                    >

                      <Pencil className="size-4" />

                    </Button>

                    {/* DELETE */}

                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={
                        deleteMutation.isPending
                      }
                      onClick={() => {

                        const confirmed =
                          window.confirm(
                            `Are you sure you want to delete "${p.name}"?\n\nThis action cannot be undone.`,
                          );

                        if (
                          !confirmed
                        ) {
                          return;
                        }

                        deleteMutation.mutate(
                          p.id,
                        );

                      }}
                      aria-label={`Delete ${p.name}`}
                      title={`Delete ${p.name}`}
                    >

                      <Trash2 className="size-4" />

                    </Button>

                  </div>

                </td>

              </tr>

            ))}

            {/* NO PRODUCTS */}

            {rows.length === 0 ? (

              <tr>

                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-muted-foreground"
                >

                  {products.isLoading
                    ? "Loading…"
                    : "No products yet — add your first one."}

                </td>

              </tr>

            ) : null}

          </tbody>

        </table>

      </div>

    </AppShell>
  );
}


