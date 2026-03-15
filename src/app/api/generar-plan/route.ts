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
      max_tokens: 4000,
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

  console.log("TMB calculada:", tmb);
  console.log("Factor actividad:", factorActividad);
  console.log("Calorías mantenimiento:", caloriasMantenimiento);
  console.log("Calorías objetivo FINAL:", caloriasObjetivo);

  return Math.max(1200, caloriasObjetivo); // Mínimo 1200 kcal
}

export async function POST(request: NextRequest) {
  try {
    const { 
      user_id, 
      calorias_objetivo, 
      proteinas_objetivo, 
      carbohidratos_objetivo, 
      grasas_objetivo 
    } = await request.json();

    if (!user_id) {
      return NextResponse.json({ error: "user_id es requerido" }, { status: 400 });
    }

    console.log("Generando plan para user_id:", user_id);

    // Si vienen los macros del frontend, usarlos directamente
    let caloriasDiarias, proteinasGramos, grasasGramos, carbohidratosGramos;
    let perfil: any;
    
    if (calorias_objetivo && proteinas_objetivo && carbohidratos_objetivo && grasas_objetivo) {
      console.log("Usando macros del frontend");
      caloriasDiarias = calorias_objetivo;
      proteinasGramos = proteinas_objetivo;
      carbohidratosGramos = carbohidratos_objetivo;
      grasasGramos = grasas_objetivo;
      
      // Cargar perfil solo para datos adicionales (no para cálculo)
      const { data: perfilData } = await supabase
        .from("perfiles")
        .select("*")
        .eq("user_id", user_id)
        .maybeSingle();

      perfil = perfilData || {
        objetivo: "mantenimiento",
        deporte: "gimnasio",
        actividad: "moderado"
      };

      console.log("Macros recibidos del frontend:", {
        calorias: caloriasDiarias,
        proteinas: proteinasGramos,
        carbohidratos: carbohidratosGramos,
        grasas: grasasGramos
      });
    } else {
      console.log("Calculando macros con Harris-Benedict (fallback)");
      
      // Cargar perfil para cálculo
      const { data: perfilData } = await supabase
        .from("perfiles")
        .select("*")
        .eq("user_id", user_id)
        .maybeSingle();

      perfil = perfilData;
      
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
      console.log("Perfil cargado:", JSON.stringify(perfil));
      console.log("Peso:", perfil?.peso, "Altura:", perfil?.altura, "Edad:", perfil?.edad, "Sexo:", perfil?.sexo);
      console.log("Actividad:", perfil?.actividad, "Objetivo:", perfil?.objetivo);

      // Calcular calorías objetivo
      caloriasDiarias = calcularCaloriasHarrisBenedict(
        perfil.peso,
        perfil.altura,
        perfil.edad,
        perfil.sexo,
        perfil.actividad,
        perfil.objetivo
      );

      console.log("Calorías diarias calculadas:", caloriasDiarias);

      // Calcular distribución de macros
      proteinasGramos = Math.round((perfil.peso * 1.8)); // 1.8g por kg para deportistas
      grasasGramos = Math.round((caloriasDiarias * 0.25) / 9); // 25% de calorías
      carbohidratosGramos = Math.round((caloriasDiarias - (proteinasGramos * 4) - (grasasGramos * 9)) / 4);
    }

    // Cargar suplementos activos
    const { data: suplementos, error: errorSuplementos } = await supabase
      .from("suplementos")
      .select("nombre, dosis, momento")
      .eq("user_id", user_id)
      .eq("activo", true);

    console.log("Suplementos encontrados:", suplementos);

    // Construir el prompt para la IA
    const suplementosTexto = suplementos && suplementos.length > 0 
      ? suplementos.map((s: any) => `- ${s.nombre} (${s.dosis}) en ${s.momento}`).join('\n')
      : "No hay suplementos activos";

    const prompt = `Eres un nutricionista deportivo experto. Genera un plan de comidas semanal en JSON puro sin texto adicional.

DATOS DEL USUARIO:
- Objetivo: ${perfil.objetivo}
- Calorías DIARIAS EXACTAS a alcanzar: ${Math.round(caloriasDiarias)} kcal
- Proteínas diarias mínimas: ${Math.round(proteinasGramos)}g
- Deporte: ${perfil.deporte || 'gimnasio'}
- Actividad: ${perfil.actividad}

REGLAS OBLIGATORIAS:
- Cada plato DEBE incluir la cantidad en gramos en el nombre. Ejemplo: 'Pechuga de pollo a la plancha (250g)' no solo 'Pechuga de pollo'
- Las calorías de cada comida deben ser REALES y corresponder a la cantidad indicada
- La suma de calorías de las 5 comidas DEBE ser exactamente ${Math.round(caloriasDiarias)} kcal
- Si necesitas más calorías, aumenta las cantidades: más arroz, más aceite, más frutos secos, batidos de proteínas con leche entera, etc.
- Proteínas totales del día: mínimo ${Math.round(proteinasGramos)}g
- Para alcanzar ${Math.round(caloriasDiarias)} kcal con alimentos normales, usa raciones grandes y añade snacks calóricos saludables como: frutos secos (30-40g), aceite de oliva en las comidas, aguacate, batidos con leche entera y plátano
- NO pongas platos con pocas calorías si el objetivo es alto. Ejemplo MAL: 'Ensalada (150g) = 50kcal'. Ejemplo BIEN: 'Ensalada con atún, huevo, aguacate y aceite (350g) = 450kcal'

Estructura JSON exacta para los 7 días:
{
  "lunes": {
    "desayuno": {"nombre": "nombre", "calorias": X, "proteinas": X, "carbohidratos": X, "grasas": X},
    "media_manana": {"nombre": "nombre", "calorias": X, "proteinas": X, "carbohidratos": X, "grasas": X},
    "almuerzo": {"nombre": "nombre", "calorias": X, "proteinas": X, "carbohidratos": X, "grasas": X},
    "merienda": {"nombre": "nombre", "calorias": X, "proteinas": X, "carbohidratos": X, "grasas": X},
    "cena": {"nombre": "nombre", "calorias": X, "proteinas": X, "carbohidratos": X, "grasas": X}
  },
  ... misma estructura para martes, miercoles, jueves, viernes, sabado, domingo
}`;

    // Llamar a la API de Groq
    const text = await callGroqAPI(prompt);
    console.log("Respuesta de Groq:", text);

    // Extraer JSON de la respuesta
    let planSemanal: Record<string, any>;
    try {
      const texto = text || "";
      const jsonMatch = texto.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No se encontró JSON en la respuesta");
      }
      planSemanal = JSON.parse(jsonMatch[0]);
      
      console.log("Plan parseado:", JSON.stringify(planSemanal).substring(0, 200));

      // Validar que tiene los 7 días requeridos
      const diasRequeridos = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
      const diasFaltantes = diasRequeridos.filter(d => !planSemanal[d]);
      if (diasFaltantes.length > 0) {
        console.error("Días faltantes:", diasFaltantes);
        // Completar con el primer día disponible
        const diaBase = planSemanal[Object.keys(planSemanal)[0]];
        diasFaltantes.forEach(dia => { 
          planSemanal[dia] = {
            desayuno: { 
              nombre: `${diaBase.desayuno.nombre} variado`, 
              calorias: diaBase.desayuno.calorias, 
              proteinas: diaBase.desayuno.proteinas, 
              carbohidratos: diaBase.desayuno.carbohidratos, 
              grasas: diaBase.desayuno.grasas 
            },
            media_manana: { 
              nombre: `${diaBase.media_manana.nombre} variado`, 
              calorias: diaBase.media_manana.calorias, 
              proteinas: diaBase.media_manana.proteinas, 
              carbohidratos: diaBase.media_manana.carbohidratos, 
              grasas: diaBase.media_manana.grasas 
            },
            almuerzo: { 
              nombre: `${diaBase.almuerzo.nombre} variado`, 
              calorias: diaBase.almuerzo.calorias, 
              proteinas: diaBase.almuerzo.proteinas, 
              carbohidratos: diaBase.almuerzo.carbohidratos, 
              grasas: diaBase.almuerzo.grasas 
            },
            merienda: { 
              nombre: `${diaBase.merienda.nombre} variado`, 
              calorias: diaBase.merienda.calorias, 
              proteinas: diaBase.merienda.proteinas, 
              carbohidratos: diaBase.merienda.carbohidratos, 
              grasas: diaBase.merienda.grasas 
            },
            cena: { 
              nombre: `${diaBase.cena.nombre} variado`, 
              calorias: diaBase.cena.calorias, 
              proteinas: diaBase.cena.proteinas, 
              carbohidratos: diaBase.cena.carbohidratos, 
              grasas: diaBase.cena.grasas 
            }
          };
        });
        console.log("Plan completado con días faltantes");
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
