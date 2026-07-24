import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const filePath = searchParams.get("path")

  if (!filePath) {
    return NextResponse.json({ error: "Missing path parameter" }, { status: 400 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const { data, error } = await supabase.storage
    .from("payment-receipts")
    .createSignedUrl(filePath, 3600)

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "Failed to generate signed URL" }, { status: 500 })
  }

  return NextResponse.redirect(data.signedUrl)
}
