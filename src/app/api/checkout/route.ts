import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Stripe from "stripe";

// ON ENLÈVE LE BLOC API_VERSION : Stripe va utiliser sa version par défaut stable
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    // 1. Vérification de la session utilisateur
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Non autorisé. Veuillez vous connecter." }, { status: 401 });
    }

    // 2. Création de la session Stripe Checkout
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: session.user.email,
      line_items: [
        {
          // Ton ID de prix valide
          price: "price_1TjBM2EithTro5xbZnZ6wYbl", 
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 7, // Période d'essai de 7 jours
      },
      success_url: `${process.env.NEXTAUTH_URL}/?success=true`,
      cancel_url: `${process.env.NEXTAUTH_URL}/?canceled=true`,
    });

    // 3. Retourne l'URL vers le paiement Stripe
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