"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type DocumentoRAG = {
  nombre_archivo: string;
  total_fragmentos: number;
};

export default function AdminPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [documentos, setDocumentos] = useState<DocumentoRAG[]>([]);
  const [cargandoDocs, setCargandoDocs] = useState(true);
  const [verificando, setVerificando] = useState(true);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const verificarAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.email !== "adri.vinted.24.25@gmail.com") {
        router.push("/dashboard");
        return;
      }
      setVerificando(false);
      fetchDocumentos();
    };

    verificarAdmin();
  }, [router]);

  const fetchDocumentos = async () => {
    setCargandoDocs(true);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setSubiendo(true);
    setMensaje("");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/procesar-pdf", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al procesar el archivo");
      }

      setMensaje(`Éxito: ${data.mensaje} Se generaron ${data.fragmentos} fragmentos válidos.`);
      setFile(null);
      await fetchDocumentos();

    } catch (error: any) {
      console.error("Upload error:", error);
      setMensaje(`Error: ${error.message}`);
    } finally {
      setSubiendo(false);
    }
  };

  const handleDelete = async (nombre_archivo: string) => {
    if (!confirm(`¿Seguro que quieres eliminar todos los fragmentos de "${nombre_archivo}"?`)) return;

    try {
      const { error } = await supabase
        .from("documentos_rag")
        .delete()
        .eq("nombre_archivo", nombre_archivo);

      if (error) throw error;

      setMensaje(`Documento "${nombre_archivo}" eliminado correctamente.`);
      await fetchDocumentos();
    } catch (error) {
      console.error("Delete error:", error);
      alert("Error al eliminar documento.");
    }
  };

  if (verificando) return <div className="min-h-screen bg-black flex items-center justify-center text-zinc-400">Verificando accesos...</div>;

  return (
    <div className="min-h-screen bg-black text-zinc-100 p-8 font-sans">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-[#b6f542]">Panel de Administración RAG</h1>
        
        {mensaje && (
          <div className={`mb-6 p-4 rounded-xl border ${mensaje.startsWith('Error') ? 'bg-red-900/30 border-red-800 text-red-200' : 'bg-green-900/30 border-green-800 text-green-200'}`}>
            {mensaje}
          </div>
        )}

        {/* Upload Form */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-8 shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-white">Subir Base de Conocimiento (PDF)</h2>
          <p className="text-sm text-zinc-400 mb-6">El PDF se fragmentará matemáticamente para usarse como contexto de la IA.</p>
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <input 
              type="file" 
              accept=".pdf"
              onChange={handleFileChange}
              className="block w-full text-sm text-zinc-300
                file:mr-4 file:py-2.5 file:px-4
                file:rounded-xl file:border-0
                file:text-sm file:font-semibold
                file:bg-[#b6f542]/10 file:text-[#b6f542] file:cursor-pointer
                hover:file:bg-[#b6f542]/20 transition border border-zinc-800 rounded-xl bg-black/40 p-2"
            />
            <button
              onClick={handleUpload}
              disabled={!file || subiendo}
              className="w-full sm:w-auto bg-[#b6f542] text-black px-8 py-3 rounded-xl font-semibold disabled:opacity-50 transition hover:bg-[#c8ff62] shadow-[0_0_20px_rgba(182,245,66,0.3)] whitespace-nowrap"
            >
              {subiendo ? "Trabajando IA..." : "Extraer Texto"}
            </button>
          </div>
        </div>

        {/* List of Documents */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white">Documentos RAG Entrenados</h2>
            <span className="text-xs bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full">{documentos.length} archivos</span>
          </div>
          
          {cargandoDocs ? (
            <div className="flex justify-center p-8">
              <span className="text-zinc-500 animate-pulse">Consultando Supabase...</span>
            </div>
          ) : documentos.length === 0 ? (
            <div className="text-center p-8 border border-dashed border-zinc-800 rounded-xl bg-black/20">
              <p className="text-zinc-500">La tabla <code className="text-[#b6f542]/80 bg-[#b6f542]/10 px-1 rounded">documentos_rag</code> está vacía.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {documentos.map((doc, idx) => (
                <li key={idx} className="flex justify-between items-center bg-black/40 p-4 rounded-xl border border-zinc-800/80 hover:border-zinc-700 transition">
                  <div>
                    <p className="font-semibold text-zinc-200">{doc.nombre_archivo}</p>
                    <p className="text-sm text-[#b6f542]/80 mt-1">{doc.total_fragmentos} <span className="text-zinc-500">fragmentos extraídos</span></p>
                  </div>
                  <button
                    onClick={() => handleDelete(doc.nombre_archivo)}
                    className="text-red-400 hover:text-white hover:bg-red-500 px-4 py-2 rounded-lg text-sm transition border border-red-500/30 font-medium"
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
