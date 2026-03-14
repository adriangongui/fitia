import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const CONOCIMIENTO_NUTRICIONAL = `
- Proteínas: 1.6-2.2g por kg peso corporal para deportistas
- Carbohidratos: fuente principal de energía en deportes de resistencia
- Grasas saludables: mínimo 20% de calorías totales
- Timing nutricional: proteína post-entreno en 30-60 minutos
- Creatina: único suplemento con evidencia científica sólida para fuerza
- Cafeína: mejora rendimiento en 3-6mg por kg peso
`;

export async function POST(request: NextRequest) {
  try {
    const { messages, user_id, isTitleRequest } = await request.json();
    
    console.log("=== INICIO CHAT ===");
    console.log("user_id:", user_id);
    console.log("GROQ_API_KEY existe:", !!process.env.GROQ_API_KEY);

    let perfilTexto = "";
    let suplementosTexto = "Sin suplementos registrados";
    let contextoHoy = "";
    let menuTexto = "";

    if (user_id) {
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
      );

      const { data: perfil } = await supabaseAdmin
        .from("perfiles")
        .select("*")
        .eq("user_id", user_id)
        .maybeSingle();

      console.log("Perfil:", JSON.stringify(perfil));

      if (perfil) {
        perfilTexto = `Perfil: peso=${perfil.peso}kg, altura=${perfil.altura}cm, edad=${perfil.edad}, sexo=${perfil.sexo}, objetivo=${perfil.objetivo}, deporte=${perfil.deporte || "no especificado"}, actividad=${perfil.actividad}`;
      }

      const { data: suplementos } = await supabaseAdmin
        .from("suplementos")
        .select("nombre, dosis, momento, notas")
        .eq("user_id", user_id)
        .eq("activo", true);

      console.log("Suplementos:", JSON.stringify(suplementos));

      if (suplementos && suplementos.length > 0) {
        suplementosTexto = "Suplementos activos: " + suplementos.map((s: any) => `${s.nombre} ${s.dosis} en ${s.momento}`).join(", ");
      }

      const hoy = new Date().toISOString().split("T")[0];
      
      const hace3dias = new Date();
      hace3dias.setDate(hace3dias.getDate() - 3);
      const hace3diasStr = hace3dias.toISOString().split("T")[0];
      
      const hace7dias = new Date();
      hace7dias.setDate(hace7dias.getDate() - 7);
      const hace7diasStr = hace7dias.toISOString().split("T")[0];
      
      const { data: comidas } = await supabaseAdmin
        .from("analisis")
        .select("nombre_plato, calorias, proteinas, created_at")
        .eq("user_id", user_id)
        .gte("created_at", hace3diasStr)
        .order("created_at", { ascending: false });

      const { data: entrenamientos } = await supabaseAdmin
        .from("entrenamientos")
        .select("tipo, intensidad, duracion, notas, recomendacion, created_at")
        .eq("user_id", user_id)
        .gte("created_at", hace7diasStr)
        .order("created_at", { ascending: false });

      const { data: menuSemanal } = await supabaseAdmin
        .from("planes_comida")
        .select("plan, semana_inicio, objetivo")
        .eq("user_id", user_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (menuSemanal && menuSemanal.plan) {
        const dias = Object.keys(menuSemanal.plan);
        menuTexto = `\nMenú semanal del usuario (semana del ${menuSemanal.semana_inicio}):\n`;
        dias.forEach(dia => {
          const comidas = menuSemanal.plan[dia];
          menuTexto += `${dia}: desayuno=${comidas.desayuno?.nombre || ""}, almuerzo=${comidas.almuerzo?.nombre || ""}, cena=${comidas.cena?.nombre || ""}\n`;
        });
      }

      // Cargar últimos 5 registros de peso
      const { data: registrosPeso } = await supabaseAdmin
        .from("registros_peso")
        .select("peso, created_at")
        .eq("user_id", user_id)
        .order("created_at", { ascending: false })
        .limit(5);

      let pesoTexto = "";
      if (registrosPeso && registrosPeso.length > 0) {
        pesoTexto = "\nHistorial de peso reciente: " + registrosPeso.map((r: any) => {
          const fecha = new Date(r.created_at).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
          return `${fecha}: ${r.peso}kg`;
        }).join(", ");
      }

      if (comidas && comidas.length > 0) {
        contextoHoy += "Comidas últimos 3 días: " + comidas.map((c: any) => {
          const fecha = new Date(c.created_at).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
          return `${fecha}: ${c.nombre_plato} (${c.calorias}kcal, ${c.proteinas}g prot)`;
        }).join(", ");
      }
      if (entrenamientos && entrenamientos.length > 0) {
        contextoHoy += "\nEntrenamientos últimos 7 días: " + entrenamientos.map((e: any) => {
          const fecha = new Date(e.created_at).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "short" });
          return `${fecha}: ${e.tipo} ${e.intensidad} ${e.duracion}min - ${e.notas || ""}`;
        }).join("\n");
      }

    const systemPrompt = isTitleRequest
      ? "Resume en máximo 5 palabras de qué trata esta conversación. Solo las palabras, sin puntuación."
      : `Eres FitIA, nutricionista deportiva experta. Responde en español, máximo 4 líneas, tono cercano, termina con una pregunta corta.
${CONOCIMIENTO_NUTRICIONAL}
${perfilTexto}
${suplementosTexto}
${contextoHoy ? "=== HOY ===\n" + contextoHoy : ""}
${menuTexto}
${pesoTexto}`;

    try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [{ role: "system", content: systemPrompt }, ...messages.map((m: any) => ({ role: m.role, content: m.content }))],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    const data = await res.json();
    console.log("Groq response status:", res.status);
    
    if (!res.ok) {
      console.error("Groq error:", JSON.stringify(data));
      return NextResponse.json({ error: "Error de IA" }, { status: 500 });
    }

    const reply = data.choices?.[0]?.message?.content || "";
    return NextResponse.json({ reply });

  } catch (error) {
    console.error("Error completo:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
