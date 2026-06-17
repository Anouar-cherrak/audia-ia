import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "Email requis" }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", email)
      .maybeSingle(); // Utilisation de maybeSingle pour éviter les erreurs strictes

    if (error) throw error;

    if (!data) {
      // Si l'utilisateur n'existe pas encore, on renvoie les valeurs par défaut proprement
      return NextResponse.json({ isSubscribed: false, messageCount: 0, lastAnalysisTimestamp: 0 });
    }

    return NextResponse.json({
      isSubscribed: data.is_pro || false,
      messageCount: data.credits !== undefined ? 15 - data.credits : 0,
      lastAnalysisTimestamp: data.updated_at ? new Date(data.updated_at).getTime() : 0,
    });
  } catch (err: any) {
    console.error("Erreur API user-status GET:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, messageCount, isSubscribed, lastAnalysisTimestamp } = body;

    if (!email) {
      return NextResponse.json({ error: "Email requis" }, { status: 400 });
    }

    // 1. On cherche si le profil existe
    const { data: profile, error: fetchError } = await supabase
      .from("profiles")
      .select("id, is_pro")
      .eq("email", email)
      .maybeSingle();

    if (fetchError) throw fetchError;

    // 2. On prépare l'objet de données avec les colonnes exactes de ta table Supabase
    const dataToSave: any = {};

    if (isSubscribed !== undefined) {
      dataToSave.is_pro = profile?.is_pro ? true : false;
    }
    if (messageCount !== undefined) {
      dataToSave.credits = 15 - messageCount;
    }
    if (lastAnalysisTimestamp !== undefined) {
      dataToSave.updated_at = new Date(lastAnalysisTimestamp).toISOString();
    }

    let queryError;

    // 3. Sauvegarde sans upsert conflictuel
    if (profile) {
      // Si le profil existe, on fait une mise à jour via son ID unique
      const { error } = await supabase
        .from("profiles")
        .update(dataToSave)
        .eq("id", profile.id);
      queryError = error;
    } else {
      // S'il n'existe pas, on ajoute l'email et on l'insère
      dataToSave.email = email;
      const { error } = await supabase
        .from("profiles")
        .insert(dataToSave);
      queryError = error;
    }

    if (queryError) {
      console.error("Détail de l'erreur Supabase SQL:", queryError);
      throw queryError;
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error("Erreur API user-status POST générale:", err.message || err);
    return NextResponse.json({ error: "Erreur serveur lors de la mise à jour" }, { status: 500 });
  }
}