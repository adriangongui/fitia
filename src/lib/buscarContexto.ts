import { supabase } from "@/lib/supabase";

export async function buscarContextoRelevante(pregunta: string): Promise<string> {
  try {
    // 1. Limpiar y extraer palabras clave principales de la pregunta
    const stopwords = ["el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del", "al", "a", "en", "por", "para", "con", "y", "o", "que", "es", "son", "se", "lo", "como", "sobre", "qué", "cuales", "cuál"];
    const palabras = pregunta
      .toLowerCase()
      .replace(/[.,/?¿!¡]/g, " ")
      .split(/\s+/)
      .filter((p) => p.length > 3 && !stopwords.includes(p));

    if (palabras.length === 0) return "";

    // 2. Traer todos los fragmentos 
    // En un sistema real de producción, esto sería ineficiente. Lo ideal es pg_search (Full Text) o pgvector.
    // Pero según los requerimientos solicitados (búsqueda simple sin embeddings por ahora):
    const { data: fragmentos, error } = await supabase
      .from("documentos_rag")
      .select("fragmento");

    if (error || !fragmentos) {
      console.error("Error al buscar contexto RAG:", error);
      return "";
    }

    // 3. Puntuación simple: contar cuántas veces aparecen las palabras clave en cada fragmento
    const fragmentosPuntuados = fragmentos.map((doc) => {
      const texto = doc.fragmento.toLowerCase();
      let puntuacion = 0;
      for (const palabra of palabras) {
        // Contar ocurrencias de la palabra en el texto
        const ocurrencias = texto.split(palabra).length - 1;
        puntuacion += ocurrencias;
      }
      return { fragmento: doc.fragmento, puntuacion };
    });

    // 4. Filtrar y ordenar los mejores
    const resultadosOrdenados = fragmentosPuntuados
      .filter((fp) => fp.puntuacion > 0)
      .sort((a, b) => b.puntuacion - a.puntuacion)
      .slice(0, 3); // Top 3

    if (resultadosOrdenados.length === 0) return "";

    // 5. Concatenar y devolver
    return resultadosOrdenados.map((r, i) => `[Referencia ${i + 1}]:\n${r.fragmento}`).join("\n\n");
  } catch (error) {
    console.error("Excepción en buscarContextoRelevante:", error);
    return "";
  }
}
