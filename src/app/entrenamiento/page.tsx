"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Entrenamiento = {
  id: string;
  tipo: string;
  duracion: number;
  intensidad: string;
  notas: string | null;
  calorias_quemadas: number;
  recomendacion: string | null;
  created_at: string;
};

function formatNumber(n: number) {
  if (!Number.isFinite(n)) return "0";
  return String(Math.round(n));
}

export default function EntrenamientoPage() {
  const router = useRouter();

  const [loadingUser, setLoadingUser] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const [historial, setHistorial] = useState<Entrenamiento[]>([]);
  
  // Form State
  const [tipo, setTipo] = useState<string>("Fuerza");
  const [duracion, setDuracion] = useState<string>("");
  const [intensidad, setIntensidad] = useState<string>("Media");
  const [notas, setNotas] = useState<string>("");
  const [horaEntrenamiento, setHoraEntrenamiento] = useState<string>("");
  
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<{
    calorias_quemadas: number;
    proteinas_extra: number;
    recomendacion: string;
  } | null>(null);

  // Modal state
  const [selectedEntrenamiento, setSelectedEntrenamiento] = useState<Entrenamiento | null>(null);

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

      // Establecer hora actual de España por defecto
      const ahora = new Date();
      const horaEspaña = new Date(ahora.toLocaleString("en-US", { timeZone: "Europe/Madrid" }));
      const horaFormateada = horaEspaña.toTimeString().slice(0, 5);
      setHoraEntrenamiento(horaFormateada);

      // Cargar historial del día
      await cargarHistorial(user.id);
      setLoadingUser(false);
    };

    fetchUser();
  }, [router]);

  const cargarHistorial = async (uid: string) => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("entrenamientos")
      .select("*")
      .eq("user_id", uid)
      .gte("created_at", hoy.toISOString())
      .order("created_at", { ascending: false });

    if (!error && data) {
      setHistorial(data);
    }
  };

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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  const handleEliminarEntrenamiento = async (entrenamientoId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Evitar que se abra el modal
    
    if (!confirm('¿Estás seguro de que quieres eliminar este entrenamiento?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from("entrenamientos")
        .delete()
        .eq("id", entrenamientoId)
        .eq("user_id", userId);

      if (error) {
        console.error("Error eliminando entrenamiento:", error);
        alert("No se pudo eliminar el entrenamiento");
      } else {
        // Eliminar visualmente de la lista
        setHistorial(prev => prev.filter(h => h.id !== entrenamientoId));
      }
    } catch (error) {
      console.error("Error eliminando entrenamiento:", error);
      alert("No se pudo eliminar el entrenamiento");
    }
  };

  const handleRegistrar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !tipo || !duracion || !intensidad) return;

    setCargando(true);
    setResultado(null);

    try {
      const res = await fetch("/api/analizar-entrenamiento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          tipo,
          duracion: parseInt(duracion),
          intensidad,
          notas,
          hora_entrenamiento: horaEntrenamiento
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setResultado(data);
      setDuracion("");
      setNotas("");
      cargarHistorial(userId);

    } catch (error: any) {
      console.error(error);
      alert("Error al registrar entrenamiento: " + error.message);
    } finally {
      setCargando(false);
    }
  };

  if (loadingUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-black via-zinc-950 to-zinc-900 text-zinc-50">
        <p className="text-sm text-zinc-400">Cargando tu entrenamiento...</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-black text-zinc-50 tracking-tight bg-cover bg-center bg-no-repeat bg-fixed relative"
      style={{
        backgroundImage: 'url("https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1920")',
      }}
    >
      <div className="absolute inset-0 bg-black/80 z-0"></div>
      
      {/* HEADER */}
      <header className="relative z-10 border-b border-zinc-800/80 bg-black/40 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4 md:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex items-center gap-2 cursor-default">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#b6f542]/10 ring-1 ring-[#b6f542]/40">
                <span className="text-lg font-semibold text-[#b6f542]">F</span>
              </div>
              <span className="text-lg font-semibold tracking-tight">FitIA</span>
            </div>

            <nav className="hidden items-center gap-1 rounded-full border border-zinc-800/80 bg-zinc-950/50 p-1 sm:flex">
              <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-900/50 hover:text-zinc-100">
                <span aria-hidden className="text-sm">⬚</span> Dashboard
              </Link>
              <Link href="/chat" className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-900/50 hover:text-zinc-100">
                <span aria-hidden className="text-sm">✦</span> Chat Asistente
              </Link>
              <Link href="/ingresar" className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-900/50 hover:text-zinc-100">
                <span aria-hidden className="text-sm">➕</span> Ingresar Comida
              </Link>
              <Link href="/entrenamiento" className="inline-flex items-center gap-2 rounded-full bg-zinc-900/70 px-3 py-2 text-xs font-medium text-zinc-100">
                <span aria-hidden className="text-sm">🏋️</span> Entrenamiento
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs text-zinc-400">
                Hola, <span className="font-semibold text-zinc-100">{nombreCorto}</span>
              </p>
              <p className="text-[11px] text-zinc-500">{email ?? "Usuario"}</p>
            </div>
            
            {/* Avatar Dropdown */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#b6f542]/10 text-sm font-semibold text-[#b6f542] ring-1 ring-[#b6f542]/40 transition hover:bg-[#b6f542]/20"
              >
                {avatarInicial}
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl border border-zinc-800 bg-zinc-950 p-1 shadow-xl z-50">
                  <Link href="/perfil" className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900 hover:text-zinc-50">
                    Mi perfil
                  </Link>
                  <Link href="/perfil" className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900 hover:text-zinc-50">
                    Configuración
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-400/10"
                  >
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* PÁGINA PRINCIPAL */}
      <main className="relative z-10 mx-auto max-w-6xl px-6 py-8 md:px-8 md:py-10">
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Columna principal: Formulario */}
          <section className="col-span-12 lg:col-span-8">
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                    Registrar entrenamiento
                  </p>
                  <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-50">
                    🏋️ Nueva sesión
                  </h1>
                </div>
              </div>

              <form onSubmit={handleRegistrar} className="mt-6 space-y-6">
                {/* TIPO DE ENTRENAMIENTO */}
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-3">Tipo de entrenamiento</label>
                  <div className="grid grid-cols-3 gap-3">
                    {["Fuerza", "Cardio", "Mixto"].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTipo(t)}
                        className={`p-3 text-sm font-semibold rounded-xl transition ${
                          tipo === t 
                            ? 'bg-[#b6f542] text-black shadow-[0_0_15px_rgba(182,245,66,0.3)]' 
                            : 'bg-zinc-900/50 border border-zinc-800/80 text-zinc-400 hover:bg-zinc-900/70 hover:text-zinc-200'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* DURACIÓN */}
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Duración (minutos)</label>
                  <input 
                    type="number" 
                    required
                    placeholder="Ej: 45"
                    value={duracion}
                    onChange={(e) => setDuracion(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800/80 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-[#b6f542]/70 focus:bg-black/40"
                  />
                </div>

                {/* HORA DEL ENTRENAMIENTO */}
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">¿A qué hora entrenaste?</label>
                  <input 
                    type="time" 
                    value={horaEntrenamiento}
                    onChange={(e) => setHoraEntrenamiento(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800/80 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-[#b6f542]/70 focus:bg-black/40"
                  />
                </div>

                {/* INTENSIDAD */}
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-3">Intensidad</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {["Baja", "Media", "Alta", "Máxima"].map((i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setIntensidad(i)}
                        className={`p-2 text-xs font-semibold rounded-xl border transition ${
                          intensidad === i 
                            ? 'border-[#b6f542] bg-[#b6f542]/10 text-[#b6f542]' 
                            : 'border-zinc-800/80 bg-zinc-900/50 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                        }`}
                      >
                        {i}
                      </button>
                    ))}
                  </div>
                </div>

                {/* NOTAS */}
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Notas (opcional)</label>
                  <input 
                    type="text" 
                    placeholder="Ej: pierna, sentadilla 100kg"
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800/80 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-[#b6f542]/70 focus:bg-black/40"
                  />
                </div>

                {/* BOTÓN REGISTRAR */}
                <button 
                  type="submit"
                  disabled={cargando || !duracion}
                  className="w-full flex items-center justify-center rounded-full bg-[#b6f542] px-6 py-3 text-sm font-semibold text-black shadow-[0_0_35px_rgba(182,245,66,0.45)] transition hover:bg-[#c8ff62] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {cargando ? "Analizando métricas..." : "Registrar y ajustar nutrición"}
                </button>
              </form>
            </div>

            {/* RESULTADO IA */}
            {resultado && (
              <div className="mt-6 rounded-2xl border border-[#b6f542]/50 bg-zinc-950/70 p-5 shadow-[0_0_30px_rgba(182,245,66,0.1)]">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#b6f542]/20">
                    <span className="text-sm text-[#b6f542]">✦</span>
                  </div>
                  <h2 className="text-lg font-semibold text-zinc-50">Recomendación FitIA</h2>
                </div>
                
                <div className="grid gap-4 sm:grid-cols-2 mb-4">
                  <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-500 mb-1">Calorías quemadas</p>
                    <p className="text-xl font-bold text-[#b6f542]">{formatNumber(resultado.calorias_quemadas)} kcal</p>
                  </div>
                  <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-500 mb-1">Proteína extra</p>
                    <p className="text-xl font-bold text-[#b6f542]">+{formatNumber(resultado.proteinas_extra)} g</p>
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4">
                  <p className="text-sm text-zinc-200 leading-relaxed">{resultado.recomendacion}</p>
                </div>
              </div>
            )}
          </section>

          {/* Columna lateral: Historial */}
          <aside className="lg:col-span-4">
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-5 sticky top-24">
              <div className="flex items-end justify-between gap-4 mb-4">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                    Historial
                  </p>
                  <h2 className="text-lg font-semibold text-zinc-50">
                    Sesiones de hoy
                  </h2>
                </div>
                <p className="text-xs text-zinc-500">
                  {historial.length} {historial.length === 1 ? "sesión" : "sesiones"}
                </p>
              </div>
              
              {historial.length === 0 ? (
                <div className="text-center p-6 rounded-xl border border-dashed border-zinc-800/80">
                  <span className="text-2xl opacity-50">🏋️</span>
                  <p className="mt-3 text-sm text-zinc-400">
                    No hay entrenamientos registrados hoy.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historial.map((h) => (
                    <button
                      key={h.id}
                      onClick={() => setSelectedEntrenamiento(h)}
                      className="w-full rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4 text-left hover:border-[#b6f542]/50 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              h.tipo === 'Fuerza' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 
                              h.tipo === 'Cardio' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 
                              'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                            }`}>
                              {h.tipo}
                            </span>
                            <span className="text-xs text-zinc-400">{h.duracion} min</span>
                            <span className="text-xs text-zinc-500 group-hover:text-[#b6f542] transition-colors">→ Click para detalles</span>
                          </div>
                          {h.notas && (
                            <p className="text-sm text-zinc-300 line-clamp-2">{h.notas}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="text-lg font-bold text-[#b6f542]">{formatNumber(h.calorias_quemadas)}</p>
                            <p className="text-[10px] text-zinc-500 uppercase">kcal</p>
                          </div>
                          <button
                            onClick={(e) => handleEliminarEntrenamiento(h.id, e)}
                            className="text-red-500 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-red-500/10 border border-red-500/20"
                            title="Eliminar entrenamiento"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>

      {/* MODAL DETALLE ENTRENAMIENTO */}
      {selectedEntrenamiento && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedEntrenamiento(null)}
        >
          <div 
            className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-zinc-50">Detalle del Entrenamiento</h3>
              <button
                onClick={() => setSelectedEntrenamiento(null)}
                className="text-zinc-400 hover:text-zinc-100 transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center px-3 py-1 rounded text-sm font-bold uppercase tracking-wider ${
                  selectedEntrenamiento.tipo === 'Fuerza' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 
                  selectedEntrenamiento.tipo === 'Cardio' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 
                  'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                }`}>
                  {selectedEntrenamiento.tipo}
                </span>
                <span className="text-sm text-zinc-300">{selectedEntrenamiento.duracion} min</span>
                <span className="text-sm text-zinc-400">Intensidad {selectedEntrenamiento.intensidad}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-3">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500 mb-1">Calorías Quemadas</p>
                  <p className="text-xl font-bold text-[#b6f542]">{formatNumber(selectedEntrenamiento.calorias_quemadas)}</p>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-3">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500 mb-1">Hora</p>
                  <p className="text-xl font-bold text-zinc-100">
                    {new Date(selectedEntrenamiento.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {selectedEntrenamiento.notas && (
                <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-3">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500 mb-2">Notas</p>
                  <p className="text-sm text-zinc-200">{selectedEntrenamiento.notas}</p>
                </div>
              )}

              {selectedEntrenamiento.recomendacion && (
                <div className="bg-[#b6f542]/10 border border-[#b6f542]/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-[#b6f542]">✦</span>
                    <p className="text-sm font-semibold text-[#b6f542]">Recomendación FitIA</p>
                  </div>
                  <p className="text-sm text-zinc-200 leading-relaxed">{selectedEntrenamiento.recomendacion}</p>
                </div>
              )}

              <div className="text-xs text-zinc-500 pt-2 border-t border-zinc-800/80">
                Registrado el {new Date(selectedEntrenamiento.created_at).toLocaleDateString('es-ES', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
