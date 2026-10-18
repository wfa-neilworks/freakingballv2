import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, email, fullName, clubName, clubLocation, contactPhone } = body;

  if (!userId || !email || !clubName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Use service role to bypass RLS — registration happens before email confirmation
  const supabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Upsert profile with full_name (trigger may have already created it)
  await supabase
    .from("profiles")
    .upsert({ id: userId, email, full_name: fullName, role: "club_admin" });

  const { error: clubError } = await supabase.from("clubs").insert({
    name: clubName,
    location: clubLocation || null,
    contact_email: email,
    contact_phone: contactPhone || null,
    admin_id: userId,
    status: "pending",
  });

  if (clubError) {
    return NextResponse.json({ error: clubError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
