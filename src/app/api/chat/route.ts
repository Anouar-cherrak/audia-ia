import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { OpenAI } from "openai";
import { createClient } from "@supabase/supabase-js";

// Initialisation de Supabase côté serveur
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const openai = new OpenAI({ apiKey: OPENAI_KEY });

export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ : Bloque si l'utilisateur n'est pas connecté via NextAuth
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const email = session.user.email;
    const { messages, tiktokContext } = await request.json();

    // 2. SÉCURITÉ SERVEUR : Récupération du profil
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, is_pro, credits, last_message_at")
      .eq("email", email)
      .maybeSingle();

    if (profileError) {
      console.error("Erreur Supabase lors de la vérification :", profileError);
      return NextResponse.json({ error: "Erreur de vérification des droits" }, { status: 500 });
    }

    let isPro = profile?.is_pro || false;
    let currentCredits = profile?.credits !== undefined ? profile.credits : 15;
    const lastMessageAt = profile?.last_message_at;

    // 3. RECHARGE AUTOMATIQUE DES 24H (Gérée par le serveur)
    if (!isPro && lastMessageAt) {
      const lastMessageDate = new Date(lastMessageAt).getTime();
      const now = Date.now();
      const twentyFourHoursInMs = 24 * 60 * 60 * 1000;

      // Si plus de 24 heures se sont écoulées depuis le dernier message
      if (now - lastMessageDate >= twentyFourHoursInMs) {
        currentCredits = 15; // On réinitialise les crédits localement pour la suite du script
        
        // On met à jour directement Supabase
        await supabase
          .from("profiles")
          .update({ credits: 15 })
          .eq("id", profile.id);
      }
    }

    // Si l'utilisateur n'est pas PRO et qu'il n'a plus de crédits (credits <= 0)
    if (!isPro && currentCredits <= 0) {
      return NextResponse.json(
        { error: "Quota quotidien de 15 messages épuisé. Passez à la version Pro !" },
        { status: 403 }
      );
    }

    // 4. TON PROMPT PROFESSIONNEL INITIAL (Intégral)
    let systemPrompt = `Tu es Audia, l'assistant IA d'élite du Studio Audia, expert en ingénierie de croissance TikTok, écriture de scripts viraux à haute rétention et stratégies d'accroche (hooks).

CONTEXTE DE TON APPLICATION :
Tu es un outil professionnel pour créateurs de contenu. Tu as accès aux audits techniques et aux données de performance de leurs comptes en temps réel.

CONSIGNE DE MISE EN FORME STRICTE :
- Interdiction absolue d'utiliser le langage Markdown.
- Ne mets JAMAIS de symboles comme des hashtags (#), des triples dièses (###) pour les titres, ou des astérisques (**) pour le gras.
- Écris uniquement en texte brut, propre et fluide. Utilise des sauts de ligne pour aérer et des tirets standards (-) pour les listes.

INGÉNIERIE DE SCRIPT VIRAL (À appliquer dès qu'on te demande un script, une idée ou un concept) :
Chaque script de vidéo que tu rédiges DOIT respecter scrupuleusement la structure de rétention TikTok suivante :

1. LE HOOK (0 à 3 secondes) : Une accroche psychologique ultra violente qui casse le scroll. Utilise des angles de curiosité, de peur de rater quelque chose (FOMO), ou de contradiction.
2. LE CORPS (Structure Rétention) : Délivre la valeur immédiatement. Évite le blabla. Rédige des phrases courtes, percutantes, faciles à lire face caméra.
3. INSTRUCTIONS DE RÉALISATION : Intègre directement dans le texte, entre crochets, des repères visuels ou sonores pour aider au montage et relancer l'attention (ex: [Bruit de notification], [Changement de plan rapide], [Zoom avant], [Affiche une preuve à l'écran]).
4. LE CTA STRATÉGIQUE (Appel à l'action) : Pas de "Abonne-toi pour plus de vidéos". Utilise des CTA d'engagement organique (ex: "Dis-moi en commentaire si tu as déjà fait l'erreur", "Envoie ça au pote qui en a besoin").

DIRECTIVES DE POSTURE :
- Ton : Direct, expert, analytique et pragmatique. Va droit au but, élimine les formules de politesse inutiles.
- Approche : Base tes conseils sur la psychologie humaine et la rétention algorithmique.`;

    // INJECTION DYNAMIQUE DES DONNÉES SCRAPPÉES
    if (tiktokContext) {
      systemPrompt += `

[ALERTE CONTEXTE COMPTE SYNCHRONISÉ] :
L'utilisateur a analysé son profil TikTok. Tu DOIS utiliser ces données pour adapter tes scripts et tes conseils à sa thématique et corriger ses faiblesses :
- Pseudo TikTok : @${tiktokContext.username}
- Nom affiché : ${tiktokContext.nickname || tiktokContext.username}
- Nombre d'abonnés : ${tiktokContext.followers || "0"}
- Score de performance Audia : ${tiktokContext.score || "Non évalué"}/100
- Niche éditoriale détectée : ${tiktokContext.advancedAnalysis?.creatorType || "À définir"}
- Durée moyenne des vidéos : ${tiktokContext.advancedAnalysis?.avgDuration || "Inconnue"}
- Taux de Likes : ${tiktokContext.advancedAnalysis?.metrics?.likeRate || "Inconnu"}
- Taux de Partages : ${tiktokContext.advancedAnalysis?.metrics?.shareRate || "Inconnu"}
- Taux de Commentaires : ${tiktokContext.advancedAnalysis?.metrics?.commentRate || "Inconnu"}
- Hashtags fréquemment utilisés : ${tiktokContext.advancedAnalysis?.topHashtags?.join(", ") || "Aucun"}

ANALYSE TECHNIQUE DU COMPTE :
- Points forts actuels : ${tiktokContext.advancedAnalysis?.strengths?.join(" | ") || "Analyse en cours"}
- Faiblesses et limitations algorithmiques : ${tiktokContext.advancedAnalysis?.weaknesses?.join(" | ") || "Analyse en cours"}

CONSIGNE : Ne redemande JAMAIS ses statistiques. Utilise-les immédiatement pour personnaliser tes réponses de manière bluffante (ex: "Vu ton score de ${tiktokContext.score}/100 et tes faiblesses en rétention, on va structurer ton script avec un hook visuel fort...").`;
    } else {
      systemPrompt += `
      
[ATTENTION] : Aucun compte TikTok n'est synchronisé. Si l'utilisateur pose des questions spécifiques sur son compte, invite-le brièvement à utiliser l'onglet "Analyser un profil" pour récupérer ses données en direct.`;
    }

    // 5. APPEL À L'API OPENAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", 
      messages: [
        { role: "system", content: systemPrompt },
        ...messages
      ],
    });

    const aiReply = response.choices[0]?.message?.content || "";

    // 6. MISE À JOUR FINALE DU QUOTA ET DU TIMESTAMPS DANS SUPABASE
    if (!isPro && profile) {
      await supabase
        .from("profiles")
        .update({ 
          credits: Math.max(0, currentCredits - 1),
          last_message_at: new Date().toISOString()
        })
        .eq("id", profile.id);
    } else if (!isPro && !profile) {
      // Nouvel utilisateur
      await supabase
        .from("profiles")
        .insert({ 
          email: email, 
          credits: 14, 
          is_pro: false,
          last_message_at: new Date().toISOString()
        });
    }

    return NextResponse.json({ reply: aiReply });

  } catch (error: any) {
    console.error("Erreur API Chat:", error.message);
    return NextResponse.json({ error: "Erreur de connexion avec l'IA" }, { status: 500 });
  }
}