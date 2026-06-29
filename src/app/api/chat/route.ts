import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialisation de Supabase côté serveur
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    // 1. SÉCURITÉ : Vérification de la session
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: "Non autorisé. Veuillez vous connecter." }, { status: 401 });
    }

    const email = session.user.email;
    const body = await req.json();
    const { messages, tiktokContext } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Structure de messages invalide." },
        { status: 400 }
      );
    }

    // 2. SÉCURITÉ : Vérification du quota et du statut Pro dans Supabase
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, is_pro, credits")
      .eq("email", email)
      .maybeSingle();

    if (profileError) {
      console.error("Erreur de récupération du profil Supabase :", profileError);
      return NextResponse.json({ error: "Erreur de vérification des quotas" }, { status: 500 });
    }

    const isPro = profile?.is_pro || false;
    const currentCredits = profile?.credits ?? 15;

    // Si l'utilisateur n'est pas PRO, on vérifie s'il lui reste des messages
    if (!isPro && currentCredits <= 0) {
      return NextResponse.json(
        { error: "Quota de messages gratuit atteint pour aujourd'hui. Passez au plan Pro pour un accès illimité !" },
        { status: 403 }
      );
    }

    // Le prompt élite reste inchangé
    let systemInstruction = `Tu es Audia, une IA de pointe et un ingénieur de croissance spécialisé exclusivement sur l'algorithme TikTok. Tu es le moteur principal d'un outil SaaS Premium destiné aux créateurs professionnels et aux marques. Ton but est de transformer des données brutes en scripts viraux et en stratégies de rétention explosives.

LIGNE ÉDITORIALE & DIRECTIVES PARTICULIÈRES :
- Style : Professionnel, percutant, confiant et ultra-stratégique. Pas de blabla, pas de salutations inutiles ("Bonjour !", "En tant qu'IA..."). Entre directement dans le vif du sujet.
- Clarté : Évite le spam d'émojis. Utilise-les uniquement pour structurer (ex: un émoji par section max). Le rendu doit être propre, haut de gamme et digne d'un rapport de consultant.
- Copywriting : Maîtrise absolue des biais psychologiques, des structures de Hooks (les 3 premières secondes) et de la relance de rétention au milieu de la vidéo.
- Format des scripts : Quand on te demande un script, structure-le TOUJOURS ainsi :
  * [CONCEPT & ANGLE] : L'idée forte en une phrase.
  * [HOOK] : La phrase d'accroche exacte (visuelle + textuelle).
  * [CORPS] : Le déroulé avec des indications de rythme/visuels.
  * [CTA STRATÉGIQUE] : Un appel à l'action qui force le partage ou le commentaire (pas juste "abonne-toi").`;

    if (tiktokContext && typeof tiktokContext === "object" && tiktokContext.username) {
      const niche = tiktokContext.advancedAnalysis?.creatorType || "Non définie";
      const score = tiktokContext.score || "Non calculé";
      const followers = tiktokContext.followers || "0";
      const viewsAvg = tiktokContext.advancedAnalysis?.averageViews || "Non spécifié";
      const engagement = tiktokContext.advancedAnalysis?.engagementRate || "Non spécifié";
      
      const pointsForts = tiktokContext.advancedAnalysis?.strengths?.length 
        ? tiktokContext.advancedAnalysis.strengths.join(", ") 
        : "Bonne base générale";
        
      const axesAmelioration = tiktokContext.advancedAnalysis?.weaknesses?.length 
        ? tiktokContext.advancedAnalysis.weaknesses.join(", ") 
        : "Optimisation du hook et du watchtime";

      systemInstruction += `\n\n[RESSOURCE CRUCIALE : DONNÉES TEMPS RÉEL API TIKTOK]
Tu pas un accès direct aux statistiques du compte de l'utilisateur. Tu dois IMPÉRATIVEMENT personnaliser tes scripts, conseils et concepts en fonction de ces metrics réelles pour maximiser ses chances de percer :
- @Username : ${tiktokContext.username}
- Taille de l'audience : ${followers} abonnés
- Thématique principale (Niche) : ${niche}
- Score de performance Algorithmique : ${score}/100
- Moyenne de vues constatée : ${viewsAvg}
- Taux d'engagement moyen : ${engagement}

[DIAGNOSTIC DU COMPTE] :
- Points forts à exploiter : ${pointsForts}
- Faiblesses critiques à corriger d'urgence dans tes propositions : ${axesAmelioration}

Instruction secrète : Agis comme si tu connaissais par cœur l'historique de ses vidéos grâce à ces données. Si ses faiblesses mentionnent une mauvaise rétention, redouble d'efforts sur la puissance de tes Hooks.`;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemInstruction },
        ...messages
      ],
      temperature: 0.65,
    });

    const reply = response.choices[0]?.message?.content || "Désolé, je n'ai pas pu générer de réponse.";

    // 3. MISE À JOUR DU QUOTA (Uniquement pour les utilisateurs non Pro)
    if (!isPro && profile) {
      const newCredits = Math.max(0, currentCredits - 1);
      await supabase
        .from("profiles")
        .update({ credits: newCredits })
        .eq("id", profile.id);
    }

    return NextResponse.json({ reply }, { status: 200 });

  } catch (error: any) {
    console.error("Erreur API Chat:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}