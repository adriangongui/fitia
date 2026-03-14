import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Función para extraer proteínas del texto de recomendación
function extraerProteinasDeTexto(recomendacion: string): number {
  // Buscar patrones como "30g proteína", "30-40g proteína", "30-40 gramos de proteína"
  const patrones = [
    /(\d+(?:-\d+)?)\s*[g]\s*(?:de\s*)?proteína/gi,
    /(\d+(?:-\d+)?)\s*gramos\s*(?:de\s*)?proteína/gi,
    /proteína[:\s]*(\d+(?:-\d+)?)\s*[g]/gi
  ];
  
  for (const patron of patrones) {
    const coincidencias = recomendacion.match(patron);
    if (coincidencias) {
      for (const coincidencia of coincidencias) {
        const numeros = coincidencia.match(/(\d+(?:-\d+)?)/);
        if (numeros) {
          const rango = numeros[1];
          if (rango.includes('-')) {
            const [min, max] = rango.split('-').map(Number);
            return Math.round((min + max) / 2);
          } else {
            return Number(rango);
          }
        }
      }
    }
  }
  
  return 0;
}

// Calorías por minuto estimadas según intensidad y tipo
// Para una persona promedio de 70kg (se ajustará con el peso real)
const CALORIAS_BASE = {
  Fuerza: { Baja: 3, Media: 5, Alta: 7, Máxima: 9 },
  Cardio: { Baja: 5, Media: 8, Alta: 11, Máxima: 15 },
  Mixto:  { Baja: 4, Media: 6.5, Alta: 9, Máxima: 12 },
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tipo, duracion, intensidad, notas, user_id, hora_entrenamiento } = body;

    if (!tipo || !duracion || !intensidad || !user_id) {
      return NextResponse.json({ error: "Faltan datos obligatorios." }, { status: 400 });
    }

    // 1. Cargar perfil del usuario
    console.log("Buscando perfil para user_id:", user_id);
    
    const { data: perfil, error: errPerfil } = await supabase
      .from("perfiles")
      .select("*")
      .eq("user_id", user_id)
      .single();

    let pesoReal = 75;
    let objetivo = "mantenimiento";

    if (errPerfil || !perfil) {
      console.log("Usando valores por defecto - No se encontró perfil");
    } else {
      console.log("Perfil encontrado:", perfil);
      pesoReal = Number(perfil.peso) || 75;
      objetivo = perfil.objetivo || "mantenimiento";
    }

    // 2. Calcular calorías quemadas
    // Ajuste proporcional: La base es 75kg. Si pesa más, quema más.
    const factorPeso = pesoReal / 75;
    
    const caloriasPorMinuto = CALORIAS_BASE[tipo as keyof typeof CALORIAS_BASE]?.[intensidad as keyof typeof CALORIAS_BASE.Fuerza] || 5; 
    const calorias_quemadas = Math.round(caloriasPorMinuto * duracion * factorPeso);

    // 3. Recomendación con IA (Groq)
    // Determinar contexto temporal
    const ahora = new Date();
    const horaActual = ahora.toTimeString().slice(0, 5);
    const horaEntreno = hora_entrenamiento || horaActual;
    
    // Calcular diferencia de tiempo para contexto
    const [hEntreno, mEntreno] = horaEntreno.split(':').map(Number);
    const [hActual, mActual] = horaActual.split(':').map(Number);
    const minutosEntreno = hEntreno * 60 + mEntreno;
    const minutosActual = hActual * 60 + mActual;
    const diferenciaMinutos = Math.abs(minutosActual - minutosEntreno);
    
    let contextoTemporal = "";
    if (diferenciaMinutos <= 30) {
      contextoTemporal = "acabas de terminar tu entrenamiento (post-entreno inmediato)";
    } else if (diferenciaMinutos <= 120) {
      contextoTemporal = "terminaste tu entrenamiento hace poco (post-entorno reciente)";
    } else {
      contextoTemporal = "pasaron varias horas desde tu entrenamiento";
    }

    const promptNutricional = `
Eres una nutricionista deportiva experta. Un usuario ${contextoTemporal}.
DATOS DEL USUARIO:
- Peso: ${pesoReal} kg
- Objetivo: ${objetivo} (ganar_musculo, perder_grasa, mantenimiento)

DATOS DEL ENTRENAMIENTO:
- Tipo: ${tipo}
- Duración: ${duracion} minutos
- Intensidad: ${intensidad}
- Hora del entrenamiento: ${horaEntreno}
- Calorías quemadas: ${calorias_quemadas} kcal
- Notas extras del usuario: ${notas || "Ninguna"}

TAREA:
Basándote en estos datos y en que ${contextoTemporal}, genera una recomendación nutricional corta, motivadora y extremadamente práctica sobre qué debería comer o cómo debería ajustar sus macros AHORA MISMO y para el resto del día para optimizar sus resultados según su objetivo.
Indícale también cuántos gramos extra de proteína le recomendarías consumir hoy para recuperar. Sé concisa (máximo 4 líneas).
`;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [{ role: "system", content: promptNutricional }],
      }),
    });

    if (!res.ok) {
      throw new Error(`Error en IA: ${await res.text()}`);
    }

    const groqData = await res.json();
    const recomendacion = groqData.choices?.[0]?.message?.content || "Hidrátate bien y consume una buena fuente de proteína libre de grasas.";

    // Extraer proteínas recomendadas del texto
    const proteinas_extra = extraerProteinasDeTexto(recomendacion);

    // 4. Guardar en Supabase
    console.log("Intentando guardar entrenamiento:", {
      user_id,
      tipo,
      duracion: parseInt(duracion),
      intensidad,
      notas,
      calorias_quemadas,
      proteinas_extra,
      recomendacion
    });

    const { error: errInsert, data: insertData } = await supabase.from("entrenamientos").insert([{
      user_id,
      tipo,
      duracion: parseInt(duracion),
      intensidad,
      notas,
      calorias_quemadas,
      proteinas_extra,
      recomendacion: recomendacion
    }]);

    if (errInsert) {
      console.error("Error guardando entrenamiento:", errInsert);
      console.error("Detalles del error:", {
        code: errInsert.code,
        message: errInsert.message,
        details: errInsert.details,
        hint: errInsert.hint
      });
      return NextResponse.json({ 
        error: `Error guardando entrenamiento: ${errInsert.message}`,
        details: errInsert.details 
      }, { status: 500 });
    }

    console.log("Entrenamiento guardado exitosamente:", insertData);

    // 5. Devolver resultados
    return NextResponse.json({
      calorias_quemadas,
      proteinas_extra,
      recomendacion
    });

  } catch (error: any) {
    console.error("Error en analizar-entrenamiento:", error);
    return NextResponse.json({ error: error?.message || "Error interno del servidor" }, { status: 500 });
  }
}
