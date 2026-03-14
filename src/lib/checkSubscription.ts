import { createClient } from "@supabase/supabase-js";

export async function checkIsPro(user_id: string): Promise<boolean> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: subscription } = await supabase
    .from("suscripciones")
    .select("plan, status")
    .eq("user_id", user_id)
    .eq("status", "active")
    .single();

  return subscription?.plan === "pro";
}
