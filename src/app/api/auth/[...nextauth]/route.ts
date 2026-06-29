import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");

  if (!email) return NextResponse.json({ isPro: false });

  // On vérifie dans ta table users classique (schéma public)
  const { data } = await supabase
    .from("users")
    .select("is_pro")
    .eq("email", email)
    .single();

  return NextResponse.json({ isPro: !!data?.is_pro });
}