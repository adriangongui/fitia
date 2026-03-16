import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, user_id } = await req.json();
    if (!imageBase64 || !user_id) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }

    const promptText = `Analiza esta imagen de resumen de actividad deportiva (Garmin, Strava, etc). Extrae los datos y devuelve SOLO este JSON:
{
  "tipo": "Fuerza/Cardio/Mixto",
  "duracion": minutos_numero,
  "calorias_quemadas": numero,
  "distancia_km": numero_o_null,
  "frecuencia_cardiaca_media": numero_o_null,
  "nombre_actividad": "nombre descriptivo",
  "intensidad": "Baja/Media/Alta/Máxima"
}

La recomendación de proteína debe ser exacta según el tipo e intensidad del entrenamiento. No siempre recomendar 20g. Justifica científicamente la cantidad según:
- Fuerza Alta/Máxima: 30-40g proteína post-entreno
- Fuerza Media: 20-25g proteína
- Cardio Alta/Máxima más de 60min: 20-25g proteína
- Cardio Media menos de 60min: 10-15g proteína
- Cardio Baja: 0-10g proteína
- Mixto: según intensidad 15-30g

Solo devuelve el JSON sin texto adicional.`;

    const response = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: promptText,
            },
            {
              type: "image_url",
              image_url: {
                url: imageBase64.startsWith("data:") 
                  ? imageBase64 
                  : `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      max_tokens: 500,
    });

    const text = response.choices[0].message.content || "";
    console.log("Respuesta Groq análisis imagen:", text);
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "No se pudo parsear la respuesta" }, { status: 500 });
    }

    const data = JSON.parse(jsonMatch[0]);
    return NextResponse.json(data);

  } catch (error) {
    console.error("Error analizando imagen entrenamiento:", error);
    return NextResponse.json({ error: "Error al analizar la imagen" }, { status: 500 });
  }
}
