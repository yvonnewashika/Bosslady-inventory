import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Action = "create" | "update" | "delete";

type StaffRequest = {
  action: Action;
  staff_id?: string;
  email?: string;
  password?: string;
  display_name?: string;
  phone?: string;
  address?: string;
  commission_rate?: number;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json(
        {
          error:
            "Supabase server environment variables are not configured.",
        },
        500,
      );
    }

    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return json({ error: "Missing authorization." }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user: currentUser },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !currentUser) {
      return json({ error: "You must be signed in." }, 401);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: ownerProfile, error: ownerError } = await admin
      .from("profiles")
      .select("id, role")
      .eq("id", currentUser.id)
      .single();

    if (ownerError || !ownerProfile) {
      return json({ error: "Owner profile was not found." }, 403);
    }

    if (ownerProfile.role !== "owner") {
      return json(
        { error: "Only the business owner can manage staff." },
        403,
      );
    }

    const body = (await req.json()) as StaffRequest;

    if (!body.action) {
      return json({ error: "Action is required." }, 400);
    }

    // ----------------------------------------------------------
    // CREATE STAFF
    // ----------------------------------------------------------

    if (body.action === "create") {
      if (!body.email || !body.password || !body.display_name) {
        return json(
          {
            error:
              "Name, email and password are required.",
          },
          400,
        );
      }

      if (body.password.length < 6) {
        return json(
          {
            error: "Password must contain at least 6 characters.",
          },
          400,
        );
      }

      const { data: created, error: createError } =
        await admin.auth.admin.createUser({
          email: body.email.trim().toLowerCase(),
          password: body.password,
          email_confirm: true,
          user_metadata: {
            display_name: body.display_name.trim(),
          },
        });

      if (createError || !created.user) {
        return json(
          {
            error:
              createError?.message ??
              "Unable to create staff account.",
          },
          400,
        );
      }

      const staffId = created.user.id;

      const { error: profileError } = await admin
        .from("profiles")
        .upsert({
          id: staffId,
          display_name: body.display_name.trim(),
          email: body.email.trim().toLowerCase(),
          phone: body.phone?.trim() || null,
          address: body.address?.trim() || null,
          commission_rate: Number(body.commission_rate ?? 0),
          role: "staff",
          owner_id: currentUser.id,
          active: true,
        });

      if (profileError) {
        await admin.auth.admin.deleteUser(staffId);

        return json(
          {
            error:
              "Staff account was created but the staff profile could not be saved: " +
              profileError.message,
          },
          500,
        );
      }

      return json({
        success: true,
        staff_id: staffId,
      });
    }

    // ----------------------------------------------------------
    // UPDATE STAFF
    // ----------------------------------------------------------

    if (body.action === "update") {
      if (!body.staff_id) {
        return json(
          { error: "Staff ID is required." },
          400,
        );
      }

      const { data: staff, error: staffError } = await admin
        .from("profiles")
        .select("id, owner_id, role")
        .eq("id", body.staff_id)
        .single();

      if (
        staffError ||
        !staff ||
        staff.owner_id !== currentUser.id ||
        staff.role !== "staff"
      ) {
        return json(
          { error: "Staff member was not found." },
          404,
        );
      }

      const profileUpdate: Record<string, unknown> = {};

      if (body.display_name !== undefined) {
        profileUpdate.display_name =
          body.display_name.trim();
      }

      if (body.email !== undefined) {
        profileUpdate.email =
          body.email.trim().toLowerCase();
      }

      if (body.phone !== undefined) {
        profileUpdate.phone =
          body.phone.trim() || null;
      }

      if (body.address !== undefined) {
        profileUpdate.address =
          body.address.trim() || null;
      }

      if (body.commission_rate !== undefined) {
        profileUpdate.commission_rate = Number(
          body.commission_rate,
        );
      }

      const { error: updateProfileError } =
        await admin
          .from("profiles")
          .update(profileUpdate)
          .eq("id", body.staff_id);

      if (updateProfileError) {
        return json(
          {
            error: updateProfileError.message,
          },
          400,
        );
      }

      const authUpdate: {
        email?: string;
        password?: string;
        user_metadata?: Record<string, unknown>;
      } = {};

      if (body.email !== undefined) {
        authUpdate.email = body.email
          .trim()
          .toLowerCase();
      }

      if (body.password) {
        if (body.password.length < 6) {
          return json(
            {
              error:
                "Password must contain at least 6 characters.",
            },
            400,
          );
        }

        authUpdate.password = body.password;
      }

      if (body.display_name !== undefined) {
        authUpdate.user_metadata = {
          display_name: body.display_name.trim(),
        };
      }

      if (Object.keys(authUpdate).length > 0) {
        const { error: authUpdateError } =
          await admin.auth.admin.updateUserById(
            body.staff_id,
            authUpdate,
          );

        if (authUpdateError) {
          return json(
            {
              error: authUpdateError.message,
            },
            400,
          );
        }
      }

      return json({
        success: true,
      });
    }

    // ----------------------------------------------------------
    // DELETE STAFF
    // ----------------------------------------------------------

    if (body.action === "delete") {
      if (!body.staff_id) {
        return json(
          { error: "Staff ID is required." },
          400,
        );
      }

      const { data: staff, error: staffError } = await admin
        .from("profiles")
        .select("id, owner_id, role")
        .eq("id", body.staff_id)
        .single();

      if (
        staffError ||
        !staff ||
        staff.owner_id !== currentUser.id ||
        staff.role !== "staff"
      ) {
        return json(
          { error: "Staff member was not found." },
          404,
        );
      }

      /*
       * Historical sales remain because sales.staff_id
       * uses ON DELETE SET NULL.
       */
      const { error: deleteError } =
        await admin.auth.admin.deleteUser(body.staff_id);

      if (deleteError) {
        return json(
          {
            error: deleteError.message,
          },
          400,
        );
      }

      return json({
        success: true,
      });
    }

    return json({ error: "Unknown action." }, 400);
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected server error.",
      },
      500,
    );
  }
});