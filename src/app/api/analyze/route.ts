import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { OpenAI } from "openai";
import { createClient } from "@supabase/supabase-js";

// Initialisation de Supabase côté serveur
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const OPENAI_KEY = process.env.OPENAI_API_KEY || "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";

const openai = new OpenAI({
  apiKey: OPENAI_KEY,
});

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ : Vérification de la session de l'utilisateur
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: "Non autorisé. Veuillez vous connecter." }, { status: 401 });
    }

    const email = session.user.email;
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("user");

    if (!username) {
      return NextResponse.json({ error: "Nom d'utilisateur manquant" }, { status: 400 });
    }

    // 2. SÉCURITÉ : Vérification du quota des 7 jours dans Supabase
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, is_pro, updated_at")
      .eq("email", email)
      .maybeSingle();

    if (profileError) {
      console.error("Erreur de récupération du profil Supabase :", profileError);
      return NextResponse.json({ error: "Erreur de vérification des quotas" }, { status: 500 });
    }

    const isPro = profile?.is_pro || false;

    // Si l'utilisateur n'est pas PRO, on vérifie s'il a analysé un compte récemment
    if (!isPro && profile?.updated_at) {
      const lastAnalysis = new Date(profile.updated_at).getTime();
      const now = Date.now();
      const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;

      if (now - lastAnalysis < sevenDaysInMs) {
        const remainingMs = sevenDaysInMs - (now - lastAnalysis);
        const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
        return NextResponse.json(
          { error: `Quota gratuit atteint. Vous devez attendre encore ${remainingDays} jour(s) ou passer à la version Pro !` },
          { status: 403 }
        );
      }
    }

    // Configuration de ton API TikTok Scraper (RapidAPI)
    const apiKey = "803acdc197mshfeee3ce25bab5acp1385b8jsn572539b56858";
    const apiHost = "tiktok-api-fast-reliable-data-scraper.p.rapidapi.com";

    // 3. Extraction des données brutes depuis RapidAPI
    const response = await fetch(`https://${apiHost}/user/${encodeURIComponent(username)}/feed`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-rapidapi-host": apiHost,
        "x-rapidapi-key": apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur API TikTok (${response.status}): ${errorText}`);
    }

    const resData = await response.json();
    const awemeList = resData.data?.aweme_list || [];

    if (awemeList.length === 0) {
      throw new Error("Aucune vidéo trouvée pour ce compte ou compte privé.");
    }

    const firstVideo = awemeList[0];
    const authorInfo = firstVideo.author || {};

    const rawAvatarUrl = authorInfo.avatar_larger?.url_list?.[0] || authorInfo.avatar_medium?.url_list?.[0] || authorInfo.avatar_thumb?.url_list?.[0] || "";
    const proxiedAvatar = rawAvatarUrl ? `/api/proxy-img?url=${encodeURIComponent(rawAvatarUrl)}` : "";

    // Formatage des vidéos pour le rendu sur ton interface
    const videosFormatted = awemeList.slice(0, 6).map((vid: any) => {
      const rawCoverUrl = vid.video?.cover?.url_list?.[0] || vid.video?.origin_cover?.url_list?.[0] || "";
      const proxiedCover = rawCoverUrl ? `/api/proxy-img?url=${encodeURIComponent(rawCoverUrl)}` : "";

      return {
        id: vid.aweme_id || vid.group_id || Math.random().toString(),
        title: vid.desc || "Sans description",
        views: formatNumbers(vid.statistics?.play_count || 0),
        likes: formatNumbers(vid.statistics?.digg_count || 0),
        duration: vid.video?.duration ? Math.round(vid.video.duration / 1000) : 0,
        thumb: proxiedCover
      };
    });

    // Calculs statistiques intermédiaires pour alimenter l'IA
    const totalViews = awemeList.reduce((acc: number, vid: any) => acc + (vid.statistics?.play_count || 0), 0);
    const totalLikes = awemeList.reduce((acc: number, vid: any) => acc + (vid.statistics?.digg_count || 0), 0);
    const totalComments = awemeList.reduce((acc: number, vid: any) => acc + (vid.statistics?.comment_count || 0), 0);
    const totalShares = awemeList.reduce((acc: number, vid: any) => acc + (vid.statistics?.share_count || 0), 0);
    const avgViews = awemeList.length > 0 ? Math.round(totalViews / awemeList.length) : 0;

    const likeRate = totalViews > 0 ? (totalLikes / totalViews * 100).toFixed(1) + "%" : "0%";
    const commentRate = totalViews > 0 ? (totalComments / totalViews * 100).toFixed(1) + "%" : "0%";
    const shareRate = totalViews > 0 ? (totalShares / totalViews * 100).toFixed(1) + "%" : "0%";

    const extractedTags = extractHashtags(awemeList);

    // Rapport de secours par défaut en cas d'échec d'OpenAI
    let aiResult = {
      score: calculateFallbackScore(authorInfo.follower_count || 0, avgViews),
      creatorType: authorInfo.custom_verify || "Créateur de contenu",
      strengths: [
        `Volume de diffusion en place avec une moyenne de ${formatNumbers(avgViews)} vues.`,
        "Utilisation pertinente des tendances visuelles TikTok."
      ],
      weaknesses: [
        "L'accroche textuelle (hook) initiale mérite plus d'impact pour retenir l'attention.",
        "Le taux de conversion en espace commentaires peut être optimisé via des questions ouvertes."
      ]
    };

    // 4. Traitement par l'IA (OpenAI)
    try {
      const summaryVideosForAI = awemeList.slice(0, 5).map((vid: any, index: number) => {
        return `Vidéo ${index + 1}: "${vid.desc || 'Sans titre'}" | Vues: ${vid.statistics?.play_count || 0} | Likes: ${vid.statistics?.digg_count || 0}`;
      }).join("\n");

      const systemPrompt = `
        Tu es un expert en ingénierie de croissance TikTok et un directeur artistique rigoureux, analytique et réaliste.
        Ton rôle est d'évaluer les performances d'un créateur à partir de ses données pour lui fournir une évaluation structurelle directe, sans artifice ni complaisance.
        
        Directives de notation :
        - Pour les comptes d'envergure majeure (millions d'abonnés), conserve une cohérence d'évaluation haute (85-98) indexée sur leur volume d'audience global, mais identifie des axes précis d'évolution sur la diversification de leurs angles éditoriaux récents.
        - Pour les comptes en phase de démarrage ou présentant des statistiques irrégulières, fournis un diagnostic réaliste et factuel : attribue une note correspondante (15 à 65) et explicite les raisons techniques de ce positionnement algorithmique.
        
        Exige un retour impératif sous la forme d'un objet JSON respectant strictement cette structure :
        {
          "score": (nombre entier entre 1 et 100),
          "creatorType": "La thématique identifiée (ex: Business/Tech, Fitness/Nutrition, Humour/Divertissement)",
          "strengths": ["Axe de performance 1", "Axe de performance 2"],
          "weaknesses": ["Limitation technique 1", "Limitation technique 2"]
        }
      `;

      const userPrompt = `
        Données analytiques du profil :
        Utilisateur: @${authorInfo.unique_id || username}
        Abonnés: ${authorInfo.follower_count || 0}
        Biographie: "${authorInfo.signature || 'Non renseignée.'}"
        Moyenne de visionnages: ${avgViews}
        Ratio d'engagement (Likes): ${likeRate}
        
        Échantillon des derniers contenus :
        ${summaryVideosForAI}
      `;

      const aiResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" }
      });

      const rawContent = aiResponse.choices[0]?.message?.content;
      if (rawContent) {
        const parsed = JSON.parse(rawContent);
        if (parsed && typeof parsed.score === "number") {
          aiResult = parsed;
        }
      }
    } catch (aiErr: any) {
      console.warn("⚠️ Mode Secours activé. Note : Si OpenAI renvoie une erreur de quota (429), pense à ajouter 5€ de crédits sur ton compte OpenAI Billing. Détail :", aiErr.message);
    }

    // 5. Consolidation finale envoyée au Studio
    const finalData = {
      username: authorInfo.unique_id || username,
      nickname: authorInfo.nickname || username.toUpperCase(),
      profilePic: proxiedAvatar,
      followers: formatNumbers(authorInfo.follower_count || 0),
      score: aiResult.score,
      signature: authorInfo.signature || "Pas de biographie.",
      videos: videosFormatted,
      advancedAnalysis: {
        creatorType: aiResult.creatorType,
        avgDuration: awemeList.length > 0 ? `${Math.round((awemeList.reduce((acc: number, vid: any) => acc + (vid.video?.duration || 0), 0) / awemeList.length) / 1000)}s` : "0s",
        topHashtags: extractedTags,
        strengths: aiResult.strengths,
        weaknesses: aiResult.weaknesses,
        metrics: {
          likeRate: likeRate,
          shareRate: shareRate,
          commentRate: commentRate
        }
      }
    };

    // 6. SÉCURITÉ SUCCESS : On verrouille le quota en mettant à jour `updated_at` (uniquement pour les gratuits)
    if (!isPro && profile) {
      await supabase
        .from("profiles")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", profile.id);
    } else if (!isPro && !profile) {
      // Si l'utilisateur n'existait pas du tout dans la table profiles
      await supabase
        .from("profiles")
        .insert({ email: email, credits: 15, is_pro: false, updated_at: new Date().toISOString() });
    }

    return NextResponse.json(finalData);

  } catch (error: any) {
    console.error("Erreur critique d'analyse :", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Outils d'aide au reformatage de données (Inchangés)
function formatNumbers(num: number) {
  if (!num) return "0";
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
}

function calculateFallbackScore(followers: number, avgViews: number): number {
  if (followers === 0) return 50;
  const ratio = avgViews / followers;
  if (ratio > 0.4) return 92;
  if (ratio > 0.1) return 81;
  return 64;
}

function extractHashtags(videos: any[]): string[] {
  const tags: string[] = [];
  videos.forEach(vid => {
    if (vid.desc) {
      const found = vid.desc.match(/#\w+/g);
      if (found) tags.push(...found);
    }
  });
  return tags.length > 0 ? Array.from(new Set(tags)).slice(0, 4) : ["#fyp", "#viral"];
}