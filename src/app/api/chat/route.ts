import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buscarContextoRelevante } from "@/lib/buscarContexto";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const CONOCIMIENTO_NUTRICIONAL = `
[CONOCIMIENTO NUTRICIONAL BASE]
- Proteínas: 1.6-2.2g por kg de peso corporal para deportistas.
- Carbohidratos: fuente principal de energía en deportes de resistencia.
- Grasas saludables: mínimo 20% de las calorías totales.
- Timing nutricional: consumir proteína (post-entreno) en 30-60 minutos de la ventana anabólica.
- Creatina: único suplemento con evidencia científica sólida para fuerza y potencia.
- Cafeína: mejora el rendimiento tomando 3-6mg por kg de peso corporal.
// === AÑADIR MÁS INFORMACIÓN AQUÍ === //
`;

export async function POST(req: Request) {
  try {
    const { messages, userId, conversationId, isTitleRequest } = await req.json();

    let systemPrompt = "";

    if (isTitleRequest) {
      systemPrompt = "Eres un asistente automático. Tu único trabajo es resumir el tema de la conversación en un título extremadamente corto (máximo 5 palabras). No uses comillas, ni puntos finales, ni texto introductorio.";
    } else {
      // Determinar la última pregunta del usuario para buscar contexto
      const userQuestions = messages.filter((m: any) => m.role === "user");
      const lastUserQuestion = userQuestions.length > 0 ? userQuestions[userQuestions.length - 1].content : "";
      
      let contextoAdicional = "";
      if (lastUserQuestion) {
        contextoAdicional = await buscarContextoRelevante(lastUserQuestion);
      }

      // Obtener contexto del día si hay userId
      let contextoDia = "";
      if (userId) {
        try {
          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);

          // Obtener comidas de hoy
          const { data: comidasHoy, error: errorComidas } = await supabase
            .from("analisis")
            .select("nombre_plato, calorias, proteinas, carbohidratos, grasas, created_at")
            .eq("user_id", userId)
            .gte("created_at", startOfToday.toISOString())
            .order("created_at", { ascending: false });

          // Obtener entrenamientos de hoy
          const { data: entrenamientosHoy, error: errorEntrenamientos } = await supabase
            .from("entrenamientos")
            .select("tipo, duracion, intensidad, hora_entrenamiento, calorias_quemadas, proteinas_extra, notas, recomendacion, created_at")
            .eq("user_id", userId)
            .gte("created_at", startOfToday.toISOString())
            .order("created_at", { ascending: false });

          // Obtener suplementos activos
          const { data: suplementosActivos, error: errorSuplementos } = await supabase
            .from("suplementos")
            .select("nombre, dosis, momento")
            .eq("user_id", userId)
            .eq("activo", true)
            .order("created_at", { ascending: false });

          let comidasTexto = "";
          let entrenamientosTexto = "";
          let recomendacionesTexto = "";
          let suplementosTexto = "";

          if (!errorComidas && comidasHoy && comidasHoy.length > 0) {
            comidasTexto = comidasHoy.map(c => 
              `• ${c.nombre_plato} (${c.calorias}kcal, ${c.proteinas}g proteína, ${c.carbohidratos}g carbs, ${c.grasas}g grasas)`
            ).join('\n');
          }

          if (!errorEntrenamientos && entrenamientosHoy && entrenamientosHoy.length > 0) {
            entrenamientosTexto = entrenamientosHoy.map(e => {
              const hora = e.hora_entrenamiento || new Date(e.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
              let texto = `• ${e.tipo} ${e.intensidad.toLowerCase()} por ${e.duracion}min a las ${hora} (${e.calorias_quemadas}kcal quemadas, +${e.proteinas_extra || 0}g proteína extra)`;
              
              if (e.notas) {
                texto += `\n  Notas: ${e.notas}`;
              }
              
              if (e.recomendacion) {
                texto += `\n  Recomendación recibida: ${e.recomendacion}`;
              }
              
              return texto;
            }).join('\n\n');

            recomendacionesTexto = entrenamientosHoy
              .filter(e => e.recomendacion)
              .map(e => `• ${e.recomendacion}`)
              .join('\n');
          }

          if (!errorSuplementos && suplementosActivos && suplementosActivos.length > 0) {
            suplementosTexto = suplementosActivos.map(s => 
              `• ${s.nombre} (${s.dosis}) - ${s.momento}`
            ).join('\n');
          }

          if (comidasTexto || entrenamientosTexto || suplementosTexto) {
            contextoDia = `

=== CONTEXTO DE HOY DEL USUARIO ===
Comidas registradas hoy:
${comidasTexto || 'Ninguna'}

Entrenamientos de hoy:
${entrenamientosTexto || 'Ninguno'}

Recomendaciones nutricionales recibidas hoy:
${recomendacionesTexto || 'Ninguna'}

Suplementos activos del usuario:
${suplementosTexto || 'Ninguno'}

Usa esta información cuando el usuario pregunte sobre su día, su dieta, su entrenamiento o sus suplementos.`;
          }
        } catch (error) {
          console.error("Error obteniendo contexto del día:", error);
        }
      }

      systemPrompt = `Eres una nutricionista deportiva experta llamada FitIA. REGLAS IMPORTANTES:
- Adapta la longitud de tu respuesta a la complejidad de la pregunta:
  * Preguntas simples (qué es X, cuánto tomar...): 2-3 líneas máximo
  * Preguntas complejas (planificación, análisis...): hasta 6-8 líneas, bien estructuradas
  * Si necesitas dar MÁS información de la que cabe, al final pregunta si quiere que profundices
- Siempre termina con UNA pregunta corta para continuar la conversación
- Nunca escribas más de 8 líneas en una sola respuesta
- Usa párrafos cortos, nunca bloques de texto densos
- Responde en español siempre

Basa tus consejos especialmente en este conocimiento base:
${CONOCIMIENTO_NUTRICIONAL}

Contexto adicional relevante:
${contextoAdicional}${contextoDia}

Usa toda esta información para dar respuestas personalizadas y contextualizadas.`;
    }

    const groqMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: any) => ({ role: m.role, content: m.content })),
    ];

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: groqMessages,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Error Groq API:", errorText);
      return NextResponse.json({ error: "Error en la API de chat." }, { status: 500 });
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || "";

    return NextResponse.json({ reply, conversationId });
  } catch (error) {
    console.error("Error en chat API:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
