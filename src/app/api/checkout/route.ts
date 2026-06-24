import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route"; // 🛠️ Importation relative propre pour éviter le bug Vercel
import Stripe from "stripe";

// On initialise Stripe de façon sécurisée
const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecret ? new Stripe(stripeSecret) : null;

export async function POST(request: Request) {
  try {
    // 1. Vérification de l'initialisation de Stripe
    if (!stripe) {
      return NextResponse.json({ error: "Configuration Stripe manquante sur le serveur (STRIPE_SECRET_KEY)." }, { status: 500 });
    }

    // 2. Vérification de la session utilisateur
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Non autorisé. Veuillez vous connecter." }, { status: 401 });
    }

    // 3. Récupération de l'ID du prix depuis les variables d'environnement
    const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;

    if (!priceId) {
      return NextResponse.json(
        { error: "Configuration Stripe manquante : NEXT_PUBLIC_STRIPE_PRICE_ID n'est pas défini." },
        { status: 500 }
      );
    }

    // Sécurité pour l'URL de base
    const baseUrl = process.env.NEXTAUTH_URL || "https://audia-ia.vercel.app";

    // 4. Création de la session Stripe Checkout
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: session.user.email,
      line_items: [
        {
          price: priceId, 
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 7, // ✅ Tes 7 jours gratuits sont parfaits ici !
      },
      success_url: `${baseUrl}/?success=true`,
      cancel_url: `${baseUrl}/?canceled=true`,
    });

    // 5. Retourne l'URL vers le paiement Stripe
    return NextResponse.json({ url: checkoutSession.url });

  } catch (error: any) {
    console.error("================ STRIPE CRITICAL ERROR ================");
    console.error(error);
    console.error("=======================================================");

    return NextResponse.json(
      { 
        error: "Erreur technique Stripe", 
        details: error.message 
      }, 
      { status: 500 }
    );
  }
}