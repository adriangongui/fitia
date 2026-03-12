"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";

type AnalisisComida = {
  id?: number;
  nombre_plato: string;
  calorias: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
  confianza?: number;
};

function formatNumber(n: number) {
  if (!Number.isFinite(n)) return "0";
  return String(Math.round(n));
}

export default function IngresarPage() {
  const router = useRouter();

  // Auth
  const [loadingUser, setLoadingUser] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analizando, setAnalizando] = useState(false);
  const [errorAnalisis, setErrorAnalisis] = useState<string | null>(null);
  const [ultimoResultado, setUltimoResultado] = useState<AnalisisComida | null>(null);
  const [analisisSesion, setAnalisisSesion] = useState<AnalisisComida[]>([]);

  // UI
  const [descripcionComida, setDescripcionComida] = useState("");
  const [guardandoTexto, setGuardandoTexto] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [gramos, setGramos] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      setUserId(user.id);
      setEmail(user.email ?? null);

      // Cargar análisis de hoy desde Supabase
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const { data: analisis, error } = await supabase
        .from("analisis")
        .select(
          "id, nombre_plato, calorias, proteinas, carbohidratos, grasas, confianza, created_at"
        )
        .eq("user_id", user.id)
        .gte("created_at", startOfToday.toISOString())
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error cargando análisis de hoy:", error);
      } else if (analisis) {
        const historico: AnalisisComida[] = analisis.map((item: any) => ({
          id: item.id,
          nombre_plato: item.nombre_plato ?? "Plato",
          calorias: Number(item.calorias ?? 0),
          proteinas: Number(item.proteinas ?? 0),
          carbohidratos: Number(item.carbohidratos ?? 0),
          grasas: Number(item.grasas ?? 0),
          confianza:
            item.confianza === undefined || item.confianza === null
              ? undefined
              : Number(item.confianza),
        }));
        setAnalisisSesion(historico);
        if (historico.length > 0) {
          setUltimoResultado(historico[0]);
        }
      }

      setLoadingUser(false);
    };

    fetchUser();
  }, [router]);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  const nombreCorto = useMemo(() => {
    const base = (email ?? "deportista").split("@")[0] ?? "deportista";
    const clean = base.replace(/[._-]+/g, " ").trim();
    const first = clean.split(" ").filter(Boolean)[0] ?? base;
    return first.length > 0
      ? first[0].toUpperCase() + first.slice(1)
      : "Deportista";
  }, [email]);

  const avatarInicial = useMemo(() => {
    const s = (email ?? "U").trim();
    return s.length ? s[0].toUpperCase() : "U";
  }, [email]);

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        resolve(typeof result === "string" ? result : "");
      };
      reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
      reader.readAsDataURL(file);
    });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  const handleDelete = async (id?: number) => {
    if (!id || !userId) return;

    if (!confirm("¿Seguro que quieres eliminar este registro?")) return;

    try {
      const { error } = await supabase.from("analisis").delete().eq("id", id);
      if (error) throw error;
      setAnalisisSesion((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error(error);
      alert("Error eliminando el registro.");
    }
  };

  const handleAnalizar = async () => {
    if (!selectedFile || analizando) return;

    try {
      setAnalizando(true);
      setErrorAnalisis(null);

      const imageBase64 = await fileToDataUrl(selectedFile);

      const res = await fetch("/api/analizar-foto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, gramos: gramos.trim() || undefined }),
      });

      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        setUltimoResultado(null);
        setErrorAnalisis(
          payload?.error ??
            "No se ha podido analizar la foto. Inténtalo de nuevo con otra imagen."
        );
        setAnalizando(false);
        return;
      }

      const resultado: AnalisisComida = {
        nombre_plato: String(payload?.nombre_plato ?? "Plato"),
        calorias: Number(payload?.calorias ?? 0),
        proteinas: Number(payload?.proteinas ?? 0),
        carbohidratos: Number(payload?.carbohidratos ?? 0),
        grasas: Number(payload?.grasas ?? 0),
        confianza: payload?.confianza === undefined ? undefined : Number(payload.confianza),
      };

      // Guardar análisis en Supabase (await para arreglar bug)
      let finalRegistro = { ...resultado };

      if (userId) {
        const { data: insertedData, error } = await supabase.from("analisis").insert({
          user_id: userId,
          nombre_plato: resultado.nombre_plato,
          calorias: resultado.calorias,
          proteinas: resultado.proteinas,
          carbohidratos: resultado.carbohidratos,
          grasas: resultado.grasas,
          confianza: resultado.confianza ?? null,
        }).select("id").single();
        
        if (error) {
          console.error(error);
          setErrorAnalisis("Atención: no se pudo guardar el análisis en la base de datos.");
        } else if (insertedData) {
          finalRegistro.id = insertedData.id;
        }
      }

      setUltimoResultado(finalRegistro);
      setAnalisisSesion((prev) => [finalRegistro, ...prev]);
      setAnalizando(false);
    } catch (error) {
      console.error(error);
      setUltimoResultado(null);
      setErrorAnalisis(
        "Ha ocurrido un error al analizar la foto. Comprueba tu conexión y vuelve a intentarlo."
      );
      setAnalizando(false);
    }
  };

  const handleGuardarDescripcion = async () => {
    const texto = descripcionComida.trim();
    if (!texto || !userId || guardandoTexto) return;

    try {
      setGuardandoTexto(true);
      setErrorAnalisis(null);

      const res = await fetch("/api/analizar-texto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto }),
      });

      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        setUltimoResultado(null);
        setErrorAnalisis(
          payload?.error ?? "No se ha podido analizar el texto. Inténtalo de nuevo."
        );
        setGuardandoTexto(false);
        return;
      }

      const registro: AnalisisComida = {
        nombre_plato: String(payload?.nombre_plato ?? texto),
        calorias: Number(payload?.calorias ?? 0),
        proteinas: Number(payload?.proteinas ?? 0),
        carbohidratos: Number(payload?.carbohidratos ?? 0),
        grasas: Number(payload?.grasas ?? 0),
        confianza: payload?.confianza === undefined ? undefined : Number(payload.confianza),
      };

      // Guardar antes de actualizar estado (arreglar bug)
      const { data: insertedData, error } = await supabase.from("analisis").insert({
        user_id: userId,
        nombre_plato: registro.nombre_plato,
        calorias: registro.calorias,
        proteinas: registro.proteinas,
        carbohidratos: registro.carbohidratos,
        grasas: registro.grasas,
        confianza: registro.confianza ?? null,
      }).select("id").single();

      if (error) {
        console.error(error);
        setErrorAnalisis("No se pudo guardar el análisis en la base de datos.");
        setGuardandoTexto(false);
        return;
      }

      if (insertedData) {
        registro.id = insertedData.id;
      }

      setAnalisisSesion((prev) => [registro, ...prev]);
      setUltimoResultado(registro);
      setDescripcionComida("");
      setGramos("");
      setGuardandoTexto(false);
    } catch (error) {
      console.error(error);
      setErrorAnalisis("Ha ocurrido un error al registrar la comida. Inténtalo de nuevo.");
      setGuardandoTexto(false);
    }
  };

  if (loadingUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-black via-zinc-950 to-zinc-900 text-zinc-50">
        <p className="text-sm text-zinc-400">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-zinc-900 text-zinc-50">
      <Header userEmail={email} userName={nombreCorto} />

      {/* PÁGINA PRINCIPAL */}
      <main className="mx-auto max-w-6xl px-6 py-8 md:px-8 md:py-10">
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Columna principal */}
          <section className="col-span-12 lg:col-span-8">
            {/* Registrar comida */}
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                    Registrar comida
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-zinc-50">
                    Foto o descripción
                  </h2>
                </div>
              </div>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                {/* Opción 1: Subir foto */}
                <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-zinc-200">📷 Subir foto</p>
                    <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-zinc-700/80 bg-black/20 px-3 py-1.5 text-xs font-medium text-zinc-100 transition hover:border-[#b6f542]/70 hover:bg-[#b6f542]/10">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null;
                          setSelectedFile(file);
                          setErrorAnalisis(null);
                        }}
                      />
                      Elegir imagen
                    </label>
                  </div>

                  <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/40">
                    {previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={previewUrl}
                        alt="Previsualización del plato"
                        className="h-44 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-44 w-full items-center justify-center">
                        <p className="text-xs text-zinc-500">
                          Selecciona una imagen para verla aquí.
                        </p>
                      </div>
                    )}
                  </div>

                  {previewUrl && (
                    <div className="mt-3 rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-3">
                      <label className="mb-1 block text-xs font-medium text-zinc-400">
                        ¿Cuántos gramos aproximadamente?
                      </label>
                      <input
                        type="number"
                        value={gramos}
                        onChange={(e) => setGramos(e.target.value)}
                        placeholder="Ej: 250"
                        className="w-full rounded-xl border border-zinc-800/80 bg-black/40 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-[#b6f542]/70"
                      />
                    </div>
                  )}

                  <button
                    onClick={handleAnalizar}
                    disabled={!selectedFile || analizando || (!!previewUrl && !gramos.trim())}
                    className="mt-3 flex w-full items-center justify-center rounded-full bg-[#b6f542] px-4 py-2.5 text-sm font-semibold text-black shadow-[0_0_35px_rgba(182,245,66,0.45)] transition hover:bg-[#c8ff62] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {analizando ? "Analizando tu plato..." : "Analizar con IA"}
                  </button>
                </div>

                {/* Opción 2: Describir comida */}
                <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-4">
                  <p className="text-sm font-medium text-zinc-200">
                    ✏️ Describir comida
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Ejemplo: “200g de pechuga a la plancha”
                  </p>
                  <div className="mt-3 flex gap-2">
                    <input
                      value={descripcionComida}
                      onChange={(e) => setDescripcionComida(e.target.value)}
                      placeholder='Ej: "200g de pechuga a la plancha"'
                      className="w-full rounded-2xl border border-zinc-800/80 bg-zinc-950/40 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-[#b6f542]/70"
                    />
                    <button
                      onClick={handleGuardarDescripcion}
                      disabled={!descripcionComida.trim() || !userId || guardandoTexto}
                      className="shrink-0 rounded-2xl bg-[#b6f542] px-4 py-3 text-sm font-semibold text-black transition hover:bg-[#c8ff62] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {guardandoTexto ? "Guardando..." : "Guardar"}
                    </button>
                  </div>
                </div>
              </div>

              {errorAnalisis && (
                <p className="mt-4 text-sm text-red-400">{errorAnalisis}</p>
              )}
            </div>

            {/* Historial del día */}
            <div className="mt-6 rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                    Historial del día
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-zinc-50">
                    Comidas registradas hoy
                  </h2>
                </div>
                <p className="text-xs text-zinc-500">
                  {analisisSesion.length}{" "}
                  {analisisSesion.length === 1 ? "comida" : "comidas"}
                </p>
              </div>

              <div className="mt-4 divide-y divide-zinc-800/70 overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/30">
                {analisisSesion.length === 0 ? (
                  <div className="p-4">
                    <p className="text-sm text-zinc-400">
                      Aún no has registrado comidas hoy. Empieza con una foto o una descripción.
                    </p>
                  </div>
                ) : (
                  analisisSesion.map((item, idx) => (
                    <div key={`${item.nombre_plato}-${idx}`} className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-zinc-50">
                            {item.nombre_plato}
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {typeof item.confianza === "number"
                              ? `Confianza: ${Math.round(item.confianza * 100)}%`
                              : "Registro manual / sin confianza"}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 text-right">
                          <p className="text-sm font-semibold text-[#b6f542]">
                            {formatNumber(item.calorias)} kcal
                          </p>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="rounded-full p-1.5 text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400"
                            title="Eliminar comida"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-zinc-300 sm:grid-cols-4">
                        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-3 py-2">
                          <p className="text-[11px] text-zinc-500">Prot.</p>
                          <p className="mt-0.5 font-medium text-zinc-100">
                            {formatNumber(item.proteinas)} g
                          </p>
                        </div>
                        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-3 py-2">
                          <p className="text-[11px] text-zinc-500">Carb.</p>
                          <p className="mt-0.5 font-medium text-zinc-100">
                            {formatNumber(item.carbohidratos)} g
                          </p>
                        </div>
                        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-3 py-2">
                          <p className="text-[11px] text-zinc-500">Grasas</p>
                          <p className="mt-0.5 font-medium text-zinc-100">
                            {formatNumber(item.grasas)} g
                          </p>
                        </div>
                        <div className="hidden rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-3 py-2 sm:block">
                          <p className="text-[11px] text-zinc-500">Estado</p>
                          <p className="mt-0.5 font-medium text-zinc-100">Guardado</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          {/* Columna lateral: Último registro */}
          <aside className="lg:col-span-4">
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-5 sticky top-24">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                Último registro
              </p>
              {ultimoResultado ? (
                <div className="mt-3">
                  <p className="text-base font-semibold text-zinc-50">
                    {ultimoResultado.nombre_plato}
                  </p>
                  <p className="mt-2 text-sm text-zinc-300">
                    <span className="font-semibold text-[#b6f542]">
                      {formatNumber(ultimoResultado.calorias)}
                    </span>{" "}
                    kcal
                  </p>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3 text-center">
                      <p className="text-[10px] uppercase text-zinc-500">Prot.</p>
                      <p className="mt-1 font-medium text-zinc-100">{formatNumber(ultimoResultado.proteinas)}g</p>
                    </div>
                    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3 text-center">
                      <p className="text-[10px] uppercase text-zinc-500">Carb.</p>
                      <p className="mt-1 font-medium text-zinc-100">{formatNumber(ultimoResultado.carbohidratos)}g</p>
                    </div>
                    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3 text-center">
                      <p className="text-[10px] uppercase text-zinc-500">Grasas</p>
                      <p className="mt-1 font-medium text-zinc-100">{formatNumber(ultimoResultado.grasas)}g</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800/80 p-6 text-center">
                  <span className="text-2xl opacity-50">🍽️</span>
                  <p className="mt-3 text-sm text-zinc-400">
                    Aún no hay registros. Registra tu primera comida de hoy.
                  </p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
