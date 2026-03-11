import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
const pdfParse = require("pdf-parse");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
// Need service role key or disable RLS for direct admin insertion if Anon key doesn't have privileges
// For this request, we'll try Anon key assuming the Admin policy allows it
const supabase = createClient(supabaseUrl, supabaseKey);

// Ajustes del Splitter
const MAX_WORDS = 500;
const OVERLAP_WORDS = 50;

function splitIntoChunks(text: string): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  
  let i = 0;
  while (i < words.length) {
    const chunkWords = words.slice(i, i + MAX_WORDS);
    chunks.push(chunkWords.join(" "));
    i += (MAX_WORDS - OVERLAP_WORDS);
  }
  
  return chunks;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({ error: "No se proporcionó ningún archivo" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "El archivo debe ser un PDF" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parsear PDF
    const data = await pdfParse(buffer);
    const text = data.text;
    
    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: "No se pudo extraer texto del PDF" }, { status: 400 });
    }

    // Dividir en fragmentos
    const chunks = splitIntoChunks(text);
    
    // Preparar inserts para Supabase
    const inserts = chunks.map((chunk, index) => ({
      nombre_archivo: file.name,
      fragmento: chunk,
      // Como pdf-parse extrae todo el texto junto, la página exacta es difusa. 
      // Asignamos el índice del chunk como "página/sección" relativa.
      pagina: index + 1 
    }));

    // Insertar en lotes si es muy grande (ej. 100 fragmentos por lote)
    const batchSize = 100;
    let totalInsertados = 0;

    for (let i = 0; i < inserts.length; i += batchSize) {
      const batch = inserts.slice(i, i + batchSize);
      const { error } = await supabase.from("documentos_rag").insert(batch);
      
      if (error) {
        console.error("Error insertando lote en Supabase:", error);
        throw new Error("Error al guardar en base de datos");
      }
      totalInsertados += batch.length;
    }

    return NextResponse.json({ 
      success: true, 
      mensaje: `PDF procesado exitosamente.`,
      fragmentos: totalInsertados 
    });

  } catch (error) {
    console.error("Error en procesar-pdf:", error);
    return NextResponse.json({ error: "Error interno procesando el PDF" }, { status: 500 });
  }
}
