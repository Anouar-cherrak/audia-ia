import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-01-27" as any,
});

export async function POST(request: Request) {
  try {
    const { userEmail } = await request.json();

    // On cherche le client Stripe avec son email
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
    if (customers.data.length === 0) {
      return NextResponse.json({ error: "Aucun profil de paiement trouvé." }, { status: 400 });
    }

    // On ouvre le portail de gestion officiel de Stripe
    const session = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: "https://audia-ia.vercel.app",
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}