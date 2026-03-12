import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Función para llamar a Groq API
async function callGroqAPI(prompt: string) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        {
          role: "system",
          content: "Eres un nutricionista experto que responde únicamente con JSON válido. No incluyas explicaciones, solo el JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 8000,
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Función para calcular TMB y calorías diarias con Harris-Benedict
function calcularCaloriasHarrisBenedict(peso: number, altura: number, edad: number, sexo: string, actividad: string, objetivo: string) {
  // Tasa Metabólica Basal (TMB)
  let tmb: number;
  if (sexo === "hombre") {
    tmb = 88.362 + (13.397 * peso) + (4.799 * altura) - (5.677 * edad);
  } else {
    tmb = 447.593 + (9.247 * peso) + (3.098 * altura) - (4.330 * edad);
  }

  // Factor de actividad
  let factorActividad: number;
  switch (actividad) {
    case "sedentario":
      factorActividad = 1.2;
      break;
    case "moderado":
      factorActividad = 1.55;
      break;
    case "activo":
      factorActividad = 1.725;
      break;
    case "muy_activo":
      factorActividad = 1.9;
      break;
    default:
      factorActividad = 1.55;
  }

  // Calorías de mantenimiento
  const caloriasMantenimiento = tmb * factorActividad;

  // Ajuste según objetivo
  let caloriasObjetivo: number;
  switch (objetivo) {
    case "perder_grasa":
      caloriasObjetivo = caloriasMantenimiento - 500; // Déficit de 500 kcal
      break;
    case "ganar_musculo":
      caloriasObjetivo = caloriasMantenimiento + 300; // Superávit de 300 kcal
      break;
    default: // mantenimiento
      caloriasObjetivo = caloriasMantenimiento;
  }

  return Math.max(1200, caloriasObjetivo); // Mínimo 1200 kcal
}

export async function POST(request: NextRequest) {
  try {
    const { user_id } = await request.json();

    if (!user_id) {
      return NextResponse.json({ error: "user_id es requerido" }, { status: 400 });
    }

    console.log("Generando plan para user_id:", user_id);

    // Cargar perfil del usuario
    const { data: perfilData } = await supabase
      .from("perfiles")
      .select("*")
      .eq("user_id", user_id)
      .maybeSingle();

    let perfil = perfilData;
    
    // Si no hay perfil, usar valores por defecto
    if (!perfil) {
      console.log("Perfil no encontrado, usando valores por defecto");
      perfil = {
        peso: 75,
        altura: 175,
        edad: 25,
        sexo: "hombre",
        actividad: "moderado",
        objetivo: "mantenimiento",
        deporte: "gimnasio"
      };
    }

    console.log("Perfil encontrado:", perfil);

    // Cargar suplementos activos
    const { data: suplementos, error: errorSuplementos } = await supabase
      .from("suplementos")
      .select("nombre, dosis, momento")
      .eq("user_id", user_id)
      .eq("activo", true);

    console.log("Suplementos encontrados:", suplementos);

    // Calcular calorías objetivo
    const caloriasDiarias = calcularCaloriasHarrisBenedict(
      perfil.peso,
      perfil.altura,
      perfil.edad,
      perfil.sexo,
      perfil.actividad,
      perfil.objetivo
    );

    // Calcular distribución de macros
    const proteinasGramos = Math.round((perfil.peso * 1.8)); // 1.8g por kg para deportistas
    const grasasGramos = Math.round((caloriasDiarias * 0.25) / 9); // 25% de calorías
    const carbohidratosGramos = Math.round((caloriasDiarias - (proteinasGramos * 4) - (grasasGramos * 9)) / 4);

    // Construir el prompt para la IA
    const suplementosTexto = suplementos && suplementos.length > 0 
      ? suplementos.map(s => `- ${s.nombre} (${s.dosis}) en ${s.momento}`).join('\n')
      : "No hay suplementos activos";

    const prompt = `Eres un nutricionista experto deportivo español. Genera un plan semanal completo y realista para España.

DATOS DEL USUARIO:
- Peso: ${perfil.peso}kg
- Altura: ${perfil.altura}cm
- Edad: ${perfil.edad}años
- Sexo: ${perfil.sexo}
- Actividad: ${perfil.actividad}
- Objetivo: ${perfil.objetivo}
- Deporte: ${perfil.deporte || 'No especificado'}
- Calorías objetivo diarias: ${caloriasDiarias}kcal
- Proteínas objetivo diarias: ${proteinasGramos}g
- Carbohidratos objetivo diarios: ${carbohidratosGramos}g
- Grasas objetivo diarias: ${grasasGramos}g

SUPLEMENTOS ACTIVOS:
${suplementosTexto}

INSTRUCCIONES:
1. Genera un plan semanal (Lunes a Domingo) completo y variado
2. Cada día debe incluir: Desayuno, Media mañana, Almuerzo, Merienda, Cena
3. Las comidas deben ser realistas para España (productos disponibles, cultura mediterránea)
4. Distribuye las calorías y macros correctamente durante el día
5. Varía los alimentos cada día para evitar monotonía
6. Considera el deporte y objetivos del usuario
7. Incluye alimentos típicos españoles y mediterráneos
8. Adapta los horarios de comidas al estilo español (desayuno 7-9h, almuerzo 13-15h, cena 20-22h)

RESPONDE ÚNICAMENTE con un JSON válido siguiendo esta estructura exacta:
{
  "lunes": {
    "desayuno": {"nombre": "Nombre comida", "calorias": numero, "proteinas": numero, "carbohidratos": numero, "grasas": numero},
    "media_manana": {"nombre": "Nombre comida", "calorias": numero, "proteinas": numero, "carbohidratos": numero, "grasas": numero},
    "almuerzo": {"nombre": "Nombre comida", "calorias": numero, "proteinas": numero, "carbohidratos": numero, "grasas": numero},
    "merienda": {"nombre": "Nombre comida", "calorias": numero, "proteinas": numero, "carbohidratos": numero, "grasas": numero},
    "cena": {"nombre": "Nombre comida", "calorias": numero, "proteinas": numero, "carbohidratos": numero, "grasas": numero}
  },
  "martes": { ...misma estructura... },
  "miercoles": { ...misma estructura... },
  "jueves": { ...misma estructura... },
  "viernes": { ...misma estructura... },
  "sabado": { ...misma estructura... },
  "domingo": { ...misma estructura... }
}

Asegúrate de que el total diario de calorías esté cerca de ${caloriasDiarias}kcal y los macros se ajusten a los objetivos.`;

    // Llamar a la API de Groq
    const text = await callGroqAPI(prompt);
    console.log("Respuesta de Groq:", text);

    // Extraer JSON de la respuesta
    let planSemanal;
    try {
      // Buscar el JSON en la respuesta
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        planSemanal = JSON.parse(jsonMatch[0]);
      } else {
        // Si no encuentra JSON, intentar parsear directamente
        planSemanal = JSON.parse(text);
      }
    } catch (error) {
      console.error("Error parseando JSON:", error);
      return NextResponse.json({ error: "Error generando el plan semanal" }, { status: 500 });
    }

    console.log("Plan generado correctamente");
    console.log("Estructura del plan:", JSON.stringify(planSemanal, null, 2));

    return NextResponse.json({ 
      success: true, 
      plan: planSemanal,
      calorias_objetivo: caloriasDiarias,
      macros_objetivo: {
        proteinas: proteinasGramos,
        carbohidratos: carbohidratosGramos,
        grasas: grasasGramos
      }
    });

  } catch (error) {
    console.error("Error en API generar-plan:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
