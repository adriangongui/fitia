import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Cliente con service role key para bypass RLS en servidor
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Cliente anon para operaciones que respetan RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

export async function POST(request: NextRequest) {
  try {
    const { messages, user_id, isTitleRequest } = await request.json();
    
    console.log("=== INICIO CHAT ===");
    console.log("user_id:", user_id);

    let systemPrompt = "";

    if (isTitleRequest) {
      systemPrompt = "Eres un asistente automático. Tu único trabajo es resumir el tema de la conversación en un título extremadamente corto (máximo 5 palabras). No uses comillas, ni puntos finales, ni texto introductorio.";
    } else {
      // Determinar la última pregunta del usuario para buscar contexto
      const userQuestions = messages.filter((m: any) => m.role === "user");
      const lastUserQuestion = userQuestions.length > 0 ? userQuestions[userQuestions.length - 1].content : "";
      
      let contextoAdicional = "";
      // if (lastUserQuestion) {
      //   contextoAdicional = await buscarContextoRelevante(lastUserQuestion);
      // }

      // Obtener perfil del usuario usando supabaseAdmin (bypass RLS)
      const { data: perfilResult, error: errorPerfil } = await supabaseAdmin
        .from("perfiles")
        .select("peso, altura, edad, sexo, actividad, objetivo, nombre, deporte")
        .eq("user_id", user_id)
        .single();

      console.log("Perfil query result:", JSON.stringify(perfilResult));
      if (!perfilResult) {
        console.log("PERFIL NO ENCONTRADO para user_id:", user_id);
      }

      // Obtener suplementos activos usando supabaseAdmin (bypass RLS)
      const { data: suplementosResult, error: errorSuplementos } = await supabaseAdmin
        .from("suplementos")
        .select("nombre, dosis, momento, notas")
        .eq("user_id", user_id)
        .eq("activo", true)
        .order("created_at", { ascending: false });

      console.log("Suplementos query result:", JSON.stringify(suplementosResult));

      // Construir contexto del perfil
      let perfilTexto = "";
      if (perfilResult) {
        perfilTexto = `
Perfil del usuario:
- Peso: ${perfilResult.peso}kg
- Altura: ${perfilResult.altura}cm
- Edad: ${perfilResult.edad}años
- Sexo: ${perfilResult.sexo}
- Actividad: ${perfilResult.actividad}
- Objetivo: ${perfilResult.objetivo}
- Deporte: ${perfilResult.deporte || 'No especificado'}
- Nombre: ${perfilResult.nombre || 'Usuario'}
        `.trim();
      }

      // Construir contexto de suplementos
      let suplementosTexto = "";
      if (suplementosResult && suplementosResult.length > 0) {
        suplementosTexto = `
Suplementos activos:
${suplementosResult.map((s: any) => `• ${s.nombre} (${s.dosis}) en ${s.momento}${s.notas ? ` - ${s.notas}` : ''}`).join('\n')}
        `.trim();
      } else {
        suplementosTexto = "El usuario no tiene suplementos registrados.";
      }

      // Construir el prompt con contexto
      systemPrompt = `${CONOCIMIENTO_NUTRICIONAL}

${perfilTexto}

${suplementosTexto}

Eres un nutricionista deportivo experto especializado en fitness y salud. Responde de manera profesional, precisa y personalizada basándote en el perfil y contexto del usuario. Adapta tus respuestas a sus objetivos específicos, nivel de actividad y suplementación actual.

Usa esta información cuando el usuario pregunte sobre su día, su dieta, su entrenamiento o sus suplementos.`;
    }

    // Llamar a la API de OpenAI
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!res.ok) {
      throw new Error("Error en la API de OpenAI");
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || "";

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Error en chat API:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
