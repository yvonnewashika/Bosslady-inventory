import { createFileRoute } from "@tanstack/react-router";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Plus,
  Eye,
  Pencil,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Percent,
  Wallet,
  ShoppingBag,
} from "lucide-react";
import { toast } from "sonner";

import {
  AppShell,
  PageHeader,
} from "@/components/AppShell";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  NativeSelect,
} from "@/components/Field";

import {
  createStaff,
  updateStaff,
  deleteStaff,
  listStaff,
  listStaffSales,
  listCommissionPayments,
  recordCommissionPayment,
  calculateStaffSummary,
  type StaffMember,
  type StaffSale,
  type CommissionPayment,
} from "@/lib/staff";

import {
  KES,
  paymentLabel,
} from "@/lib/shop";


export const Route =
  createFileRoute(
    "/_authenticated/staff",
  )({
    head: () => ({
      meta: [
        {
          title:
            "Staff — Bosslady Inventory",
        },
        {
          name: "description",
          content:
            "Manage staff accounts, sales, commissions and payment history.",
        },
      ],
    }),

    component:
      StaffPage,
  });


type FormState = {
  display_name: string;
  email: string;
  phone: string;
  address: string;
  password: string;
  commission_rate: string;
};


const emptyForm: FormState = {
  display_name: "",
  email: "",
  phone: "",
  address: "",
  password: "",
  commission_rate: "0",
};


function StaffPage() {
  const qc =
    useQueryClient();

  const [form, setForm] =
    useState<FormState>(
      emptyForm,
    );

  const [openForm, setOpenForm] =
    useState(false);

  const [editing, setEditing] =
    useState<StaffMember | null>(
      null,
    );

  const [viewing, setViewing] =
    useState<StaffMember | null>(
      null,
    );


  const staff =
    useQuery({
      queryKey: ["staff"],
      queryFn: listStaff,
    });


  const openCreate =
    () => {
      setEditing(null);
      setForm(
        emptyForm,
      );
      setOpenForm(true);
    };


  const openEdit =
    (member: StaffMember) => {
      setEditing(member);

      setForm({
        display_name:
          member.display_name ??
          "",
        email:
          member.email ??
          "",
        phone:
          member.phone ??
          "",
        address:
          member.address ??
          "",
        password: "",
        commission_rate:
          String(
            member.commission_rate ??
              0,
          ),
      });

      setOpenForm(true);
    };


  const save =
    useMutation({
      mutationFn:
        async () => {
          if (
            !form.display_name.trim()
          ) {
            throw new Error(
              "Enter the staff member's name.",
            );
          }

          if (
            !form.email.trim()
          ) {
            throw new Error(
              "Enter the staff member's email.",
            );
          }

          if (
            Number(
              form.commission_rate,
            ) < 0
          ) {
            throw new Error(
              "Commission cannot be negative.",
            );
          }

          if (editing) {
            return updateStaff({
              staff_id:
                editing.id,

              display_name:
                form.display_name,

              email:
                form.email,

              phone:
                form.phone,

              address:
                form.address,

              password:
                form.password ||
                undefined,

              commission_rate:
                Number(
                  form.commission_rate,
                ),
            });
          }

          if (
            !form.password
          ) {
            throw new Error(
              "Enter a password for the staff member.",
            );
          }

          return createStaff({
            display_name:
              form.display_name,

            email:
              form.email,

            phone:
              form.phone,

            address:
              form.address,

            password:
              form.password,

            commission_rate:
              Number(
                form.commission_rate,
              ),
          });
        },

      onSuccess:
        () => {
          toast.success(
            editing
              ? "Staff details updated."
              : "Staff account created.",
          );

          setOpenForm(
            false,
          );

          setEditing(
            null,
          );

          setForm(
            emptyForm,
          );

          qc.invalidateQueries({
            queryKey: [
              "staff",
            ],
          });
        },

      onError:
        (error: Error) =>
          toast.error(
            error.message,
          ),
    });


  const remove =
    useMutation({
      mutationFn:
        deleteStaff,

      onSuccess:
        () => {
          toast.success(
            "Staff member deleted.",
          );

          qc.invalidateQueries({
            queryKey: [
              "staff",
            ],
          });

          setViewing(null);
        },

      onError:
        (error: Error) =>
          toast.error(
            error.message,
          ),
    });


  const handleDelete =
    (member: StaffMember) => {
      const confirmed =
        window.confirm(
          `Delete ${member.display_name ?? "this staff member"}?\n\nTheir historical sales will remain in Bosslady's records.`,
        );

      if (
        confirmed
      ) {
        remove.mutate(
          member.id,
        );
      }
    };


  return (
    <AppShell>
      <PageHeader
        title="Staff"
        subtitle="Manage your staff accounts, sales and commissions."
        action={
          <Button
            onClick={
              openCreate
            }
          >
            <Plus className="size-4" />
            Add staff
          </Button>
        }
      />

      <div className="grid gap-4">
        {(staff.data ?? []).map(
          (member) => (
            <div
              key={
                member.id
              }
              className="rounded-lg border border-border bg-card p-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">
                    {member.display_name ||
                      "Unnamed staff"}
                  </h2>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {member.email}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span>
                      {member.phone ||
                        "No phone"}
                    </span>

                    <span>
                      Commission:{" "}
                      <strong>
                        {member.commission_rate}%
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setViewing(
                        member,
                      )
                    }
                  >
                    <Eye className="size-4" />
                    View
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() =>
                      openEdit(
                        member,
                      )
                    }
                  >
                    <Pencil className="size-4" />
                    Edit
                  </Button>

                  <Button
                    variant="destructive"
                    onClick={() =>
                      handleDelete(
                        member,
                      )
                    }
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ),
        )}

        {staff.isLoading ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
            Loading staff...
          </div>
        ) : null}

        {!staff.isLoading &&
        (staff.data ?? []).length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-10 text-center">
            <h2 className="font-semibold">
              No staff members yet
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Add your first staff member
              and create their login account.
            </p>

            <Button
              className="mt-4"
              onClick={
                openCreate
              }
            >
              <Plus className="size-4" />
              Add staff
            </Button>
          </div>
        ) : null}
      </div>


      {/* ======================================================
          CREATE / EDIT STAFF
          ====================================================== */}

      <Dialog
        open={openForm}
        onOpenChange={
          setOpenForm
        }
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? "Edit Staff Member"
                : "Add Staff Member"}
            </DialogTitle>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              save.mutate();
            }}
          >
            <div className="space-y-2">
              <Label>
                Full Name
              </Label>

              <Input
                required
                value={
                  form.display_name
                }
                onChange={(event) =>
                  setForm({
                    ...form,
                    display_name:
                      event.target
                        .value,
                  })
                }
               /* placeholder="e.g. Purity Kimondo"*/
              />
            </div>


            <div className="space-y-2">
              <Label>
                Email
              </Label>

              <Input
                required
                type="email"
                value={
                  form.email
                }
                onChange={(event) =>
                  setForm({
                    ...form,
                    email:
                      event.target
                        .value,
                  })
                }
               /* placeholder="purity@gmail.com"*/
              />
            </div>


            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>
                  Phone Number
                </Label>

                <Input
                  value={
                    form.phone
                  }
                  onChange={(event) =>
                    setForm({
                      ...form,
                      phone:
                        event.target
                          .value,
                    })
                  }
                 /* placeholder="0751204593"*/
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Commission Rate (%)
                </Label>

                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    form.commission_rate
                  }
                  onChange={(event) =>
                    setForm({
                      ...form,
                      commission_rate:
                        event.target
                          .value,
                    })
                  }
                />
              </div>
            </div>


            <div className="space-y-2">
              <Label>
                Address
              </Label>

              <Input
                value={
                  form.address
                }
                onChange={(event) =>
                  setForm({
                    ...form,
                    address:
                      event.target
                        .value,
                  })
                }
                placeholder="P.O. Box 657-10100, Nyeri"
              />
            </div>


            <div className="space-y-2">
              <Label>
                {editing
                  ? "New Password (optional)"
                  : "Password"}
              </Label>

              <Input
                required={
                  !editing
                }
                type="password"
                minLength={6}
                value={
                  form.password
                }
                onChange={(event) =>
                  setForm({
                    ...form,
                    password:
                      event.target
                        .value,
                  })
                }
                placeholder={
                  editing
                    ? "Leave blank to keep current password"
                    : "Create staff password"
                }
              />

              {editing ? (
                <p className="text-xs text-muted-foreground">
                  Leave this blank if Bosslady
                  does not want to change the
                  current password.
                </p>
              ) : null}
            </div>


            <Button
              type="submit"
              className="w-full"
              disabled={
                save.isPending
              }
            >
              {save.isPending
                ? "Saving..."
                : editing
                  ? "Save Changes"
                  : "Create Staff Account"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>


      {/* ======================================================
          STAFF VIEW
          ====================================================== */}

      <StaffDetailsDialog
        staff={viewing}
        onClose={() =>
          setViewing(null)
        }
      />
    </AppShell>
  );
}


function StaffDetailsDialog({
  staff,
  onClose,
}: {
  staff: StaffMember | null;
  onClose: () => void;
}) {
  const [payOpen, setPayOpen] =
    useState(false);

  const sales =
    useQuery({
      queryKey: [
        "staff-sales",
        staff?.id,
      ],
      queryFn: () =>
        listStaffSales(
          staff!.id,
        ),
      enabled:
        !!staff,
    });

  const payments =
    useQuery({
      queryKey: [
        "staff-payments",
        staff?.id,
      ],
      queryFn: () =>
        listCommissionPayments(
          staff!.id,
        ),
      enabled:
        !!staff,
    });


  const summary =
    useMemo(() => {
      if (!staff) {
        return null;
      }

      return calculateStaffSummary(
        staff,
        sales.data ?? [],
        payments.data ?? [],
      );
    }, [
      staff,
      sales.data,
      payments.data,
    ]);


  return (
    <>
      <Dialog
        open={!!staff}
        onOpenChange={(open) => {
          if (!open) {
            onClose();
          }
        }}
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
          {staff ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {staff.display_name}
                </DialogTitle>
              </DialogHeader>

              {/* CONTACT INFORMATION */}

              <section>
                <h3 className="mb-2 text-lg font-semibold">
                  Contact Information
                </h3>

                <div className="rounded-lg bg-secondary/50 p-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Info
                      icon={
                        Mail
                      }
                      label="Email"
                      value={
                        staff.email ||
                        "-"
                      }
                    />

                    <Info
                      icon={
                        Phone
                      }
                      label="Phone"
                      value={
                        staff.phone ||
                        "-"
                      }
                    />

                    <Info
                      icon={
                        MapPin
                      }
                      label="Address"
                      value={
                        staff.address ||
                        "-"
                      }
                    />

                    <Info
                      icon={
                        Percent
                      }
                      label="Commission Rate"
                      value={`${staff.commission_rate}%`}
                    />
                  </div>

                  <div className="mt-4 rounded-md border border-border bg-background p-3">
                    <p className="text-sm font-medium">
                      Password
                    </p>

                    <p className="mt-1 font-mono text-sm text-muted-foreground">
                      ••••••••••••••
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      Passwords are securely stored
                      by Supabase Authentication and
                      cannot be displayed in plain text.
                      Bosslady can change it using Edit.
                    </p>
                  </div>
                </div>
              </section>


              {/* PERFORMANCE */}

              {summary ? (
                <section>
                  <h3 className="mb-2 text-lg font-semibold">
                    Performance Information
                  </h3>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <Metric
                      icon={
                        ShoppingBag
                      }
                      label="Total Sales"
                      value={String(
                        summary.totalSales,
                      )}
                    />

                    <Metric
                      icon={
                        Wallet
                      }
                      label="Total Revenue"
                      value={KES(
                        summary.totalRevenue,
                      )}
                    />

                    <Metric
                      icon={
                        Wallet
                      }
                      label="Amount Paid"
                      value={KES(
                        summary.totalPaid,
                      )}
                    />

                    <Metric
                      icon={
                        Percent
                      }
                      label="Commission Earned"
                      value={KES(
                        summary.commissionEarned,
                      )}
                    />

                    <Metric
                      icon={
                        Wallet
                      }
                      label="Commission Paid"
                      value={KES(
                        summary.commissionPaid,
                      )}
                    />

                    <Metric
                      icon={
                        Wallet
                      }
                      label="Commission Due"
                      value={KES(
                        summary.commissionDue,
                      )}
                    />
                  </div>
                </section>
              ) : null}


              {/* EMPLOYEE SALES */}

              <section>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">
                      Employee Sales
                    </h3>

                    <p className="text-sm text-muted-foreground">
                      Every sale made by{" "}
                      {staff.display_name}.
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    onClick={() =>
                      setPayOpen(
                        true,
                      )
                    }
                  >
                    Pay Commission
                  </Button>
                </div>


                <div className="overflow-hidden rounded-lg border border-border">
                  {(sales.data ?? []).length ===
                  0 ? (
                    <p className="p-8 text-center text-sm text-muted-foreground">
                      No sales recorded yet.
                    </p>
                  ) : (
                    <div className="divide-y divide-border">
                      {(sales.data ?? []).map(
                        (sale) => (
                          <SaleRow
                            key={
                              sale.id
                            }
                            sale={
                              sale
                            }
                          />
                        ),
                      )}
                    </div>
                  )}
                </div>
              </section>


              {/* PAYMENT HISTORY */}

              <section>
                <h3 className="mb-3 text-lg font-semibold">
                  Commission Payment History
                </h3>

                <div className="overflow-hidden rounded-lg border border-border">
                  {(payments.data ?? []).length ===
                  0 ? (
                    <p className="p-6 text-center text-sm text-muted-foreground">
                      No commission payments recorded.
                    </p>
                  ) : (
                    <div className="divide-y divide-border">
                      {(
                        payments.data ?? []
                      ).map(
                        (
                          payment,
                        ) => (
                          <div
                            key={
                              payment.id
                            }
                            className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div>
                              <p className="font-medium">
                                {KES(
                                  Number(
                                    payment.amount,
                                  ),
                                )}
                              </p>

                              <p className="text-xs text-muted-foreground">
                                {new Date(
                                  payment.created_at,
                                ).toLocaleString(
                                  "en-KE",
                                )}{" "}
                                ·{" "}
                                {paymentLabel(
                                  payment.payment_method as any,
                                )}

                                {payment.reference
                                  ? ` · ${payment.reference}`
                                  : ""}
                              </p>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>
              </section>
            </>
          ) : null}
        </DialogContent>
      </Dialog>


      <CommissionPaymentDialog
        staff={staff}
        open={payOpen}
        onClose={() =>
          setPayOpen(false)
        }
        commissionDue={
          summary?.commissionDue ??
          0
        }
        onSaved={() => {
          payments.refetch();
        }}
      />
    </>
  );
}


function SaleRow({
  sale,
}: {
  sale: StaffSale;
}) {
  const items =
    sale.sale_items ?? [];

  return (
    <details className="group">
      <summary className="cursor-pointer list-none p-4 hover:bg-secondary/40">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">
              {items.length}{" "}
              {items.length ===
              1
                ? "item"
                : "items"}{" "}
              sold
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              {new Date(
                sale.created_at,
              ).toLocaleString(
                "en-KE",
              )}{" "}
              ·{" "}
              {paymentLabel(
                sale.payment_method as any,
              )}
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              {items
                .map(
                  (item) =>
                    `${item.product_name} × ${item.quantity}`,
                )
                .join(", ")}
            </p>
          </div>

          <div className="text-left sm:text-right">
            <p className="font-mono text-lg font-semibold">
              {KES(
                Number(
                  sale.total,
                ),
              )}
            </p>

            <p className="text-xs text-success">
              ●{" "}
              {Number(
                sale.amount_paid,
              ) >=
              Number(
                sale.total,
              )
                ? "PAID"
                : `Paid ${KES(
                    Number(
                      sale.amount_paid,
                    ),
                  )}`}
            </p>
          </div>
        </div>
      </summary>

      <div className="border-t border-border bg-secondary/30 p-4">
        <div className="grid gap-3">
          {items.map(
            (item) => (
              <div
                key={
                  item.id
                }
                className="flex items-center justify-between rounded-md bg-background p-3"
              >
                <div>
                  <p className="font-medium">
                    {
                      item.product_name
                    }
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {item.quantity} ×{" "}
                    {KES(
                      Number(
                        item.unit_price,
                      ),
                    )}
                  </p>
                </div>

                <p className="font-mono font-semibold">
                  {KES(
                    Number(
                      item.unit_price,
                    ) *
                      item.quantity,
                  )}
                </p>
              </div>
            ),
          )}

          <div className="grid gap-2 border-t border-border pt-3 text-sm sm:grid-cols-3">
            <div>
              <p className="text-muted-foreground">
                Amount paid
              </p>
              <p className="font-semibold">
                {KES(
                  Number(
                    sale.amount_paid,
                  ),
                )}
              </p>
            </div>

            <div>
              <p className="text-muted-foreground">
                Payment method
              </p>
              <p className="font-semibold">
                {paymentLabel(
                  sale.payment_method as any,
                )}
              </p>
            </div>

            <div>
              <p className="text-muted-foreground">
                Commission
              </p>
              <p className="font-semibold">
                {KES(
                  Number(
                    sale.commission_amount,
                  ),
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </details>
  );
}


function Info({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 text-muted-foreground" />

      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">
          {label}
        </p>

        <p className="break-words text-sm font-medium">
          {value}
        </p>
      </div>
    </div>
  );
}


function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="size-4" />
        {label}
      </div>

      <p className="mt-2 text-2xl font-bold">
        {value}
      </p>
    </div>
  );
}


function CommissionPaymentDialog({
  staff,
  open,
  onClose,
  commissionDue,
  onSaved,
}: {
  staff: StaffMember | null;
  open: boolean;
  onClose: () => void;
  commissionDue: number;
  onSaved: () => void;
}) {
  const [amount, setAmount] =
    useState(
      String(
        commissionDue,
      ),
    );

  const [method, setMethod] =
    useState<
      "cash" |
      "mpesa" |
      "bank"
    >("mpesa");

  const [reference, setReference] =
    useState("");

  const [note, setNote] =
    useState("");

  const mutation =
    useMutation({
      mutationFn:
        () =>
          recordCommissionPayment({
            staff_id:
              staff!.id,

            amount:
              Number(
                amount,
              ),

            payment_method:
              method,

            reference:
              reference ||
              null,

            note:
              note ||
              null,
          }),

      onSuccess:
        () => {
          toast.success(
            "Commission payment recorded.",
          );

          onSaved();
          onClose();
        },

      onError:
        (error: Error) =>
          toast.error(
            error.message,
          ),
    });


  return (
    <Dialog
      open={open}
      onOpenChange={
        (value) => {
          if (!value) {
            onClose();
          }
        }
      }
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Pay Commission
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md bg-secondary p-3 text-sm">
            Commission due:{" "}
            <strong>
              {KES(
                commissionDue,
              )}
            </strong>
          </div>

          <div className="space-y-2">
            <Label>
              Amount
            </Label>

            <Input
              type="number"
              min="0"
              step="0.01"
              value={
                amount
              }
              onChange={(event) =>
                setAmount(
                  event.target
                    .value,
                )
              }
            />
          </div>

          <div className="space-y-2">
            <Label>
              Payment Method
            </Label>

            <NativeSelect
              value={
                method
              }
              onChange={(event) =>
                setMethod(
                  event.target
                    .value as
                    | "cash"
                    | "mpesa"
                    | "bank",
                )
              }
            >
              <option value="mpesa">
                M-Pesa
              </option>
              <option value="cash">
                Cash
              </option>
              <option value="bank">
                Bank
              </option>
            </NativeSelect>
          </div>

          <div className="space-y-2">
            <Label>
              Reference
            </Label>

            <Input
              value={
                reference
              }
              onChange={(event) =>
                setReference(
                  event.target
                    .value,
                )
              }
              placeholder="e.g. M-Pesa reference"
            />
          </div>

          <div className="space-y-2">
            <Label>
              Note
            </Label>

            <Input
              value={note}
              onChange={(event) =>
                setNote(
                  event.target
                    .value,
                )
              }
              placeholder="Optional"
            />
          </div>

          <Button
            className="w-full"
            disabled={
              mutation.isPending ||
              !staff
            }
            onClick={() =>
              mutation.mutate()
            }
          >
            {mutation.isPending
              ? "Saving..."
              : "Confirm Payment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
