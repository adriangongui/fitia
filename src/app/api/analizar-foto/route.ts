import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, gramos } = await req.json();
    if (!imageBase64) {
      return NextResponse.json({ error: "No se recibió imagen" }, { status: 400 });
    }

    const promptText = gramos 
      ? `Eres un nutricionista experto en comida española. Mira la imagen con atención e identifica exactamente qué comida aparece. El plato pesa aproximadamente ${gramos} gramos. Calcula los macros para esa cantidad exacta. Devuelve ÚNICAMENTE este JSON con los valores numéricos reales que hayas calculado, sin texto adicional, sin explicaciones, sin bloques de código markdown:
{"nombre_plato":"nombre real y específico del plato","calorias":CALCULA_EL_VALOR_REAL,"proteinas":CALCULA_EL_VALOR_REAL,"carbohidratos":CALCULA_EL_VALOR_REAL,"grasas":CALCULA_EL_VALOR_REAL,"confianza":0.85,"hay_comida":true}
Sustituye CALCULA_EL_VALOR_REAL por el número entero real que estimes para ese plato concreto.`
      : `Eres un nutricionista experto en comida española. Mira la imagen con atención e identifica exactamente qué comida aparece. Calcula los macronutrientes reales basándote en lo que ves visualmente, teniendo en cuenta el tamaño del plato y las raciones típicas españolas. Devuelve ÚNICAMENTE este JSON con los valores numéricos reales que hayas calculado, sin texto adicional, sin explicaciones, sin bloques de código markdown:
{"nombre_plato":"nombre real y específico del plato","calorias":CALCULA_EL_VALOR_REAL,"proteinas":CALCULA_EL_VALOR_REAL,"carbohidratos":CALCULA_EL_VALOR_REAL,"grasas":CALCULA_EL_VALOR_REAL,"confianza":0.85,"hay_comida":true}
Sustituye CALCULA_EL_VALOR_REAL por el número entero real que estimes para ese plato concreto.`;

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
    console.log("Respuesta Groq:", text);
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "No se pudo parsear la respuesta" }, { status: 500 });
    }

    const data = JSON.parse(jsonMatch[0]);

    if (!data.hay_comida) {
      return NextResponse.json({ error: "No se detectó comida en la imagen" }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error Groq:", error);
    return NextResponse.json({ error: "Error al analizar la imagen" }, { status: 500 });
  }
}