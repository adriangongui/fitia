import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const { messages, userId, conversationId } = await req.json();

    const systemPrompt =
      "Eres una nutricionista deportiva experta llamada FitIA. Hablas en español, eres cercana y profesional. Conoces en profundidad nutrición deportiva, suplementación, planificación de entrenamientos y competiciones. Das consejos personalizados, precisos y basados en evidencia científica. No incentivas el consumo de suplementos innecesarios. Respondes preguntas sobre dieta, macros, timing nutricional, hidratación y rendimiento deportivo.";

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

    // Guardar en Supabase si hay userId
    if (userId) {
      const userMessage = messages[messages.length - 1];
      
      // Intentar guardar ambos mensajes sin bloquear la respuesta al usuario fuertemente
      try {
        await supabase.from("mensajes_chat").insert([
          {
            user_id: userId,
            conversation_id: conversationId,
            role: "user",
            content: userMessage.content,
          },
          {
            user_id: userId,
            conversation_id: conversationId,
            role: "assistant",
            content: reply,
          }
        ]);
      } catch (err) {
        console.error("Error guardando en supabase:", err);
      }
    }

    return NextResponse.json({ reply, conversationId });
  } catch (error) {
    console.error("Error en chat API:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
