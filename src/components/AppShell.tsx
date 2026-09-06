import { Link, useNavigate } from "@tanstack/react-router";
import {
  Boxes,
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  Truck,
  Tags,
  BarChart3,
  ShoppingCart,
  LogOut,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import type { ReactNode } from "react";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/sales", label: "Sales", icon: ShoppingCart },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/products", label: "Products", icon: Package },
  { to: "/movements", label: "Movements", icon: ArrowLeftRight },
  { to: "/suppliers", label: "Suppliers", icon: Truck },
  { to: "/categories", label: "Categories", icon: Tags },
] as const;


export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-screen bg-background lg:flex">
      <aside className="border-b border-sidebar-border bg-sidebar lg:h-screen lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r lg:sticky lg:top-0">
        <div className="flex items-center gap-2 px-5 py-5">
          <Boxes className="size-5 text-primary" />
          <span className="font-display text-lg font-bold tracking-tight">StockRoom</span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2 text-sm text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeProps={{
                className:
                  "bg-sidebar-accent text-sidebar-accent-foreground font-medium border-l-2 border-sidebar-primary",
              }}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="hidden border-t border-sidebar-border p-3 lg:block">
          <p className="label-caps mb-1">Signed in</p>
          <p className="truncate text-sm text-sidebar-foreground/80">{user?.email}</p>
          <Button variant="ghost" size="sm" className="mt-2 w-full justify-start" onClick={signOut}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
        <div className="px-4 pb-8 lg:hidden">
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </main>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}
