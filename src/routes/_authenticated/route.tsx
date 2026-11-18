import {
  createFileRoute,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getMyProfile } from "@/lib/staff";

export const Route =
  createFileRoute(
    "/_authenticated",
  )({
    ssr: false,

    beforeLoad:
      async ({
        location,
      }) => {
        const {
          data,
          error,
        } =
          await supabase.auth.getUser();

        if (
          error ||
          !data.user
        ) {
          throw redirect({
            to: "/auth",
          });
        }

        const profile =
          await getMyProfile();

        /*
         * Staff members are only allowed
         * into the sales/POS area.
         */
        if (
          profile.role ===
            "staff" &&
          location.pathname !==
            "/sales"
        ) {
          throw redirect({
            to: "/sales",
          });
        }

        return {
          user: data.user,
          profile,
        };
      },

    component:
      () => (
        <Outlet />
      ),
  });