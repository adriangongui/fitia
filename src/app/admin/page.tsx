"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

type DocumentoRAG = {
  nombre_archivo: string;
  total_fragmentos: number;
};

export default function AdminPage() {
  const [file, setFile] = useState<File | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [documentos, setDocumentos] = useState<DocumentoRAG[]>([]);
  const [cargandoDocs, setCargandoDocs] = useState(true);

  const fetchDocumentos = async () => {
    setCargandoDocs(true);
    // Agrupar por nombre_archivo para ver listado único
    const { data, error } = await supabase
      .from("documentos_rag")
      .select("nombre_archivo");

    if (!error && data) {
      const counts: Record<string, number> = {};
      data.forEach(d => {
        counts[d.nombre_archivo] = (counts[d.nombre_archivo] || 0) + 1;
      });

      const docsArray = Object.keys(counts).map(key => ({
        nombre_archivo: key,
        total_fragmentos: counts[key]
      }));

      setDocumentos(docsArray);
    }
    setCargandoDocs(false);
  };

  useEffect(() => {
    fetchDocumentos();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setSubiendo(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/procesar-pdf", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Error al procesar el archivo");
      }

      alert("PDF procesado y fragmentado correctamente.");
      setFile(null);
      await fetchDocumentos();
    } catch (error) {
      console.error(error);
      alert("Error al subir el documento.");
    } finally {
      setSubiendo(false);
    }
  };

  const handleDelete = async (nombre_archivo: string) => {
    if (!confirm(`¿Seguro que quieres eliminar todos los fragmentos de ${nombre_archivo}?`)) return;

    try {
      const { error } = await supabase
        .from("documentos_rag")
        .delete()
        .eq("nombre_archivo", nombre_archivo);

      if (error) throw error;

      alert("Documento eliminado.");
      await fetchDocumentos();
    } catch (error) {
      console.error(error);
      alert("Error al eliminar documento.");
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-[#b6f542]">Admin - Gestión de Documentos RAG</h1>
        
        {/* Upload Form */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Subir nuevo PDF de Conocimiento</h2>
          <div className="flex gap-4 items-center">
            <input 
              type="file" 
              accept="application/pdf"
              onChange={handleFileChange}
              className="block w-full text-sm text-zinc-400
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-[#b6f542]/20 file:text-[#b6f542]
                hover:file:bg-[#b6f542]/30 transition"
            />
            <button
              onClick={handleUpload}
              disabled={!file || subiendo}
              className="bg-[#b6f542] text-black px-6 py-2 rounded-full font-semibold disabled:opacity-50"
            >
              {subiendo ? "Procesando..." : "Subir PDF"}
            </button>
          </div>
        </div>

        {/* List of Documents */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 text-zinc-50">Documentos Activos en Supabase</h2>
          
          {cargandoDocs ? (
            <p className="text-zinc-500">Cargando...</p>
          ) : documentos.length === 0 ? (
            <p className="text-zinc-500">No hay documentos procesados todavía.</p>
          ) : (
            <ul className="space-y-3">
              {documentos.map((doc, idx) => (
                <li key={idx} className="flex justify-between items-center bg-zinc-950 p-4 rounded-lg border border-zinc-800/80">
                  <div>
                    <p className="font-medium text-zinc-200">{doc.nombre_archivo}</p>
                    <p className="text-xs text-zinc-500">{doc.total_fragmentos} fragmentos (chunks) generados</p>
                  </div>
                  <button
                    onClick={() => handleDelete(doc.nombre_archivo)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-400/10 p-2 rounded-lg text-sm transition"
                  >
                    Eliminar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
