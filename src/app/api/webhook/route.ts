import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature")!;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error(`❌ Erreur de signature Webhook: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    // Cas 1 : L'achat initial de l'abonnement est réussi
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerEmail = session.customer_details?.email;
      const stripeCustomerId = session.customer as string;

      if (customerEmail) {
        // On sauvegarde le stripe_customer_id au passage, ça servira plus tard
        const { error } = await supabase
          .from("profiles")
          .update({ 
            is_pro: true,
            stripe_customer_id: stripeCustomerId 
          })
          .eq("email", customerEmail);

        if (error) console.error("Erreur Supabase (checkout.completed):", error.message);
        else console.log(`🚀 Statut PRO activé avec succès pour : ${customerEmail}`);
      }
    }

    // Cas 2 : Un paiement mensuel récurrent a réussi (sécurité)
    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;
      const customerEmail = invoice.customer_email;

      if (customerEmail) {
        const { error } = await supabase
          .from("profiles")
          .update({ is_pro: true })
          .eq("email", customerEmail);

        if (error) console.error("Erreur Supabase (invoice.succeeded):", error.message);
      }
    }

    // Cas 3 : L'abonnement est annulé, expiré ou impayé
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const stripeCustomerId = subscription.customer as string;

      // On retrouve l'utilisateur via son ID client Stripe pour lui couper l'accès
      const { error } = await supabase
        .from("profiles")
        .update({ is_pro: false })
        .eq("stripe_customer_id", stripeCustomerId);

      if (error) {
        console.error("Erreur Supabase (subscription.deleted):", error.message);
      } else {
        console.log(`❌ Abonnement résilié. Droits PRO retirés pour le client Stripe : ${stripeCustomerId}`);
      }
    }

  } catch (dbError: any) {
    console.error("Erreur interne du webhook:", dbError.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}