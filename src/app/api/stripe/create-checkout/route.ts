import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

export async function POST(request: NextRequest) {
  try {
    const { user_id, price_id } = await request.json();

    if (!user_id || !price_id) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }

    // Obtener el usuario para verificar si ya tiene customer_id
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: profile } = await supabase
      .from("perfiles")
      .select("stripe_customer_id")
      .eq("user_id", user_id)
      .single();

    let customerId = profile?.stripe_customer_id;

    // Si no tiene customer_id, crearlo
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: (await supabase.auth.admin.getUserById(user_id))?.data?.user?.email || "",
        metadata: { user_id },
      });
      customerId = customer.id;

      // Guardar customer_id en el perfil
      await supabase
        .from("perfiles")
        .update({ stripe_customer_id: customerId })
        .eq("user_id", user_id);
    }

    // Crear sesión de checkout
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer: customerId,
      line_items: [
        {
          price: price_id,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgraded=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
      metadata: {
        user_id,
      },
      subscription_data: {
        metadata: {
          user_id,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json({ error: "Error al crear sesión de pago" }, { status: 500 });
  }
}
