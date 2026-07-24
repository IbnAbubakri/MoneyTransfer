import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("email", email.toLowerCase().trim())
      .single();

    if (profile?.role === "admin") {
      return NextResponse.json({ blocked: true, error: "Admin accounts must use the admin portal." });
    }

    return NextResponse.json({ blocked: false });
  } catch {
    return NextResponse.json({ blocked: false });
  }
}
