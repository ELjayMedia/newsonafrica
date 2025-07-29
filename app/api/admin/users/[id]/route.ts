import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { createAdminClient } from "@/utils/supabase/server";

const bodySchema = z.object({
  roles: z.array(z.string()).min(1),
});

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (secret !== process.env.ADMIN_ACTION_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { roles } = bodySchema.parse(await request.json());
  const supabase = createAdminClient(cookies());
  const { data, error } = await supabase.auth.admin.updateUserById(params.id, {
    app_metadata: { roles },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ user: data.user });
}
