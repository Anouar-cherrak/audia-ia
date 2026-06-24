import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route"; // Le chemin corrigé sans erreur rouge
import Stripe from "stripe";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecret ? new Stripe(stripeSecret) : null;

export async function POST(request: Request) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: "Clé secrète Stripe manquante." }, { status: 500 });
    }

    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Non autorisé. Veuillez vous connecter." }, { status: 401 });
    }

    // Récupération dynamique depuis Vercel
    const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;

    if (!priceId) {
      return NextResponse.json({ error: "Variable NEXT_PUBLIC_STRIPE_PRICE_ID manquante." }, { status: 500 });
    }

    const baseUrl = process.env.NEXTAUTH_URL || "https://audia-ia.vercel.app";

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: session.user.email,
      line_items: [
        {
          price: priceId, // Utilise la variable propre
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 7, // Tes 7 jours d'essai
      },
      success_url: `${baseUrl}/?success=true`,
      cancel_url: `${baseUrl}/?canceled=true`,
    });

    return NextResponse.json({ url: checkoutSession.url });

  } catch (error: any) {
    console.error("================ STRIPE CRITICAL ERROR ================");
    console.error(error.message);
    console.error("=======================================================");

    return NextResponse.json(
      { error: "Erreur technique Stripe", details: error.message }, 
      { status: 500 }
    );
  }
}