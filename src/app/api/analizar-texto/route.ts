import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { texto, peso } = await req.json();
    if (!texto) {
      return NextResponse.json({ error: "No se recibió texto" }, { status: 400 });
    }

    const promptPeso = peso ? ` Considera de forma orientativa que la ración es de ${peso} gramos.` : '';

    const response = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        {
          role: "user",
          content: `Eres un nutricionista experto. Analiza el siguiente texto sobre comida: "${texto}".${promptPeso} Calcula los macronutrientes reales basándote en la descripción. Devuelve ÚNICAMENTE este JSON con los valores numéricos reales que hayas calculado, sin texto adicional, sin explicaciones, sin bloques de código markdown:
{"nombre_plato":"nombre de la comida o plato","calorias":CALCULA_EL_VALOR_REAL,"proteinas":CALCULA_EL_VALOR_REAL,"carbohidratos":CALCULA_EL_VALOR_REAL,"grasas":CALCULA_EL_VALOR_REAL,"confianza":0.90,"hay_comida":true}
Sustituye CALCULA_EL_VALOR_REAL por el número entero real que estimes para esa comida.`
        }
      ],
      max_tokens: 500,
    });

    const outputText = response.choices[0].message.content || "";
    console.log("Respuesta Groq (texto):", outputText);
    
    const jsonMatch = outputText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "No se pudo parsear la respuesta" }, { status: 500 });
    }

    const data = JSON.parse(jsonMatch[0]);

    if (!data.hay_comida) {
      return NextResponse.json({ error: "No se reconoció comida en el texto" }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error Groq (texto):", error);
    return NextResponse.json({ error: "Error al analizar el texto" }, { status: 500 });
  }
}
