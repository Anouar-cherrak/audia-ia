import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, tiktokContext } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Structure de messages invalide." },
        { status: 400 }
      );
    }

    // 1. LE PROMPT ÉLITE : Positionne l'IA comme un outil SaaS Premium ultra-vendeur
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

    // 2. INTEGRATION DYNAMIQUE DE L'API TIKTOK (La mine d'or de données)
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

      // On force l'IA à prendre conscience de cette ressource et à baser TOUTES ses réponses dessus
      systemInstruction += `\n\n[RESSOURCE CRUCIALE : DONNÉES TEMPS RÉEL API TIKTOK]
Tu as un accès direct aux statistiques du compte de l'utilisateur. Tu dois IMPÉRATIVEMENT personnaliser tes scripts, conseils et concepts en fonction de ces metrics réelles pour maximiser ses chances de percer :
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

    // 3. Appel à l'API OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Très rapide et économique pour ton SaaS
      messages: [
        { role: "system", content: systemInstruction },
        ...messages
      ],
      temperature: 0.65, // Un poil plus bas pour être ultra-cadré et pro, sans perdre en créativité
    });

    const reply = response.choices[0]?.message?.content || "Désolé, je n'ai pas pu générer de réponse.";

    return NextResponse.json({ reply }, { status: 200 });

  } catch (error: any) {
    console.error("Erreur API Chat:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}