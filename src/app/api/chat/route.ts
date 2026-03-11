import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
      systemPrompt = `Eres una nutricionista deportiva experta llamada FitIA. REGLAS IMPORTANTES:
- Adapta la longitud de tu respuesta a la complejidad de la pregunta:
  * Preguntas simples (qué es X, cuánto tomar...): 2-3 líneas máximo
  * Preguntas complejas (planificación, análisis...): hasta 6-8 líneas, bien estructuradas
  * Si necesitas dar MÁS información de la que cabe, al final pregunta si quiere que profundices
- Siempre termina con UNA pregunta corta para continuar la conversación
- Nunca escribas más de 8 líneas en una sola respuesta
- Usa párrafos cortos, nunca bloques de texto densos
- Responde en español siempre

Basa tus consejos especialmente en este conocimiento:
${CONOCIMIENTO_NUTRICIONAL}`;
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
