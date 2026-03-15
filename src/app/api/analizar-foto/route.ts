import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const TABLA_NUTRICIONAL = `
REFERENCIA NUTRICIONAL POR 100g:
- Arroz cocido: 130kcal, 2.7g prot, 28g carb, 0.3g gras
- Pasta cocida: 131kcal, 5g prot, 25g carb, 1g gras
- Pechuga pollo: 165kcal, 31g prot, 0g carb, 3.6g gras
- Carne ternera: 250kcal, 26g prot, 0g carb, 15g gras
- Salmón: 208kcal, 20g prot, 0g carb, 13g gras
- Huevo entero: 155kcal, 13g prot, 1g carb, 11g gras
- Pan blanco: 265kcal, 9g prot, 49g carb, 3g gras
- Patata cocida: 87kcal, 1.9g prot, 20g carb, 0.1g gras
- Lentejas cocidas: 116kcal, 9g prot, 20g carb, 0.4g gras
- Garbanzos cocidos: 164kcal, 8.9g prot, 27g carb, 2.6g gras
- Aceite oliva: 884kcal, 0g prot, 0g carb, 100g gras
- Aguacate: 160kcal, 2g prot, 9g carb, 15g gras
- Plátano: 89kcal, 1.1g prot, 23g carb, 0.3g gras
- Leche entera: 61kcal, 3.2g prot, 4.8g carb, 3.3g gras
- Yogur natural: 61kcal, 3.5g prot, 4.7g carb, 3.3g gras
- Queso fresco: 98kcal, 11g prot, 3.4g carb, 4.3g gras
`;

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, gramos } = await req.json();
    if (!imageBase64) {
      return NextResponse.json({ error: "No se recibió imagen" }, { status: 400 });
    }

    const promptText = `Eres un nutricionista experto con acceso a tablas nutricionales precisas. Analiza la imagen de comida.

${TABLA_NUTRICIONAL}

Pasos para analizar:
1. Identifica cada ingrediente visible en el plato
2. Estima el peso en gramos de cada ingrediente basándote en el tamaño visual
3. Si el usuario ha indicado el peso total (${gramos}g), ajusta proporcionalmente
4. Calcula los macros usando la tabla nutricional de referencia
5. Suma todos los ingredientes para obtener el total

Devuelve SOLO este JSON sin texto adicional:
{
  'nombre_plato': 'nombre específico del plato',
  'calorias': NUMERO_CALCULADO,
  'proteinas': NUMERO_CALCULADO,
  'carbohidratos': NUMERO_CALCULADO,
  'grasas': NUMERO_CALCULADO,
  'ingredientes': 'lista breve de ingredientes estimados con gramos',
  'confianza': 0.85,
  'hay_comida': true
}`;

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