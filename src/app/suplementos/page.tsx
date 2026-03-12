"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Suplemento = {
  id: string;
  nombre: string;
  dosis: string | null;
  momento: string | null;
  notas: string | null;
  activo: boolean;
  created_at: string;
};

const momentos = [
  "Antes de entrenar",
  "Después de entrenar", 
  "Con el desayuno",
  "Antes de dormir",
  "Con las comidas"
];

// Base de datos de suplementos con información científica
const infoSuplementos: Record<string, { evidencia: string; dosis: string; beneficios: string }> = {
  "creatina": {
    evidencia: "Evidencia sólida (Nivel A) para mejorar fuerza y masa muscular. Más de 500 estudios publicados.",
    dosis: "3-5g diarios (fase de carga opcional: 20g/día durante 5-7 días)",
    beneficios: "Aumenta fuerza 5-15%, masa muscular 1-2kg en 8-12 semanas, mejora rendimiento en ejercicios de alta intensidad"
  },
  "proteína whey": {
    evidencia: "Evidencia moderada-alta para síntesis proteica muscular. Proteína de alto valor biológico.",
    dosis: "20-40g post-entrenamiento (1.6-2.2g/kg de peso corporal total)",
    beneficios: "Optimiza recuperación muscular, mantiene masa muscular en déficit calórico, saciedad"
  },
  "cafeína": {
    evidencia: "Evidencia sólida para mejorar rendimiento. Nivel A según ISSN.",
    dosis: "3-6mg/kg peso corporal (200-400mg para 70kg) 30-60min antes",
    beneficios: "Reduce percepción del esfuerzo 5-10%, mejora fuerza 3-5%, aumenta resistencia, mejora concentración"
  },
  "beta-alanina": {
    evidencia: "Evidencia sólida para ejercicios de 1-10 minutos. Nivel A.",
    dosis: "3.2-6.4g diarios divididos en 2-4 dosis (efecto acumulativo)",
    beneficios: "Aumenta carnosina muscular, mejora rendimiento 2-3% en ejercicios de 1-4 min, reduce fatiga"
  },
  "omega-3": {
    evidencia: "Evidencia moderada para recuperación y salud general. EPA/DHA.",
    dosis: "2-3g EPA+DHA diarios (1000-2000mg EPA + 500-1000mg DHA)",
    beneficios: "Reduce inflamación post-entrenamiento, mejora recuperación, salud cardiovascular, función cognitiva"
  }
};

export default function Suplementos() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Form state
  const [nombre, setNombre] = useState("");
  const [dosis, setDosis] = useState("");
  const [momento, setMomento] = useState(momentos[0]);
  const [notas, setNotas] = useState("");
  const [cargando, setCargando] = useState(false);
  
  // Suplementos state
  const [suplementos, setSuplementos] = useState<Suplemento[]>([]);
  const [loadingSuplementos, setLoadingSuplementos] = useState(true);
  
  // Acordeón state
  const [expandedSuplements, setExpandedSuplements] = useState<Set<string>>(new Set());

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
      
      await cargarSuplementos(user.id);
      setLoadingUser(false);
    };

    fetchUser();
  }, [router]);

  const cargarSuplementos = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from("suplementos")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error cargando suplementos:", error);
      } else {
        setSuplementos(data || []);
      }
    } catch (error) {
      console.error("Error cargando suplementos:", error);
    } finally {
      setLoadingSuplementos(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  const handleAgregarSuplemento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !nombre || !dosis || !momento) return;

    setCargando(true);

    try {
      const { error } = await supabase.from("suplementos").insert([{
        user_id: userId,
        nombre,
        dosis,
        momento,
        notas
      }]);

      if (error) {
        console.error("Error agregando suplemento:", error);
        alert("No se pudo agregar el suplemento");
      } else {
        // Reset form
        setNombre("");
        setDosis("");
        setMomento(momentos[0]);
        setNotas("");
        
        // Reload list
        await cargarSuplementos(userId);
      }
    } catch (error) {
      console.error("Error agregando suplemento:", error);
      alert("No se pudo agregar el suplemento");
    } finally {
      setCargando(false);
    }
  };

  const handleEliminarSuplemento = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('¿Estás seguro de que quieres eliminar este suplemento?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from("suplementos")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      if (error) {
        console.error("Error eliminando suplemento:", error);
        alert("No se pudo eliminar el suplemento");
      } else {
        setSuplementos(prev => prev.filter(s => s.id !== id));
      }
    } catch (error) {
      console.error("Error eliminando suplemento:", error);
      alert("No se pudo eliminar el suplemento");
    }
  };

  const handleToggleActivo = async (id: string, activo: boolean, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      const { error } = await supabase
        .from("suplementos")
        .update({ activo: !activo })
        .eq("id", id)
        .eq("user_id", userId);

      if (error) {
        console.error("Error actualizando suplemento:", error);
        alert("No se pudo actualizar el suplemento");
      } else {
        setSuplementos(prev => prev.map(s => 
          s.id === id ? { ...s, activo: !activo } : s
        ));
      }
    } catch (error) {
      console.error("Error actualizando suplemento:", error);
      alert("No se pudo actualizar el suplemento");
    }
  };

  const getInfoSuplemento = (nombre: string) => {
    const nombreLower = nombre.toLowerCase();
    for (const [key, info] of Object.entries(infoSuplementos)) {
      if (nombreLower.includes(key)) {
        return info;
      }
    }
    return null;
  };

  const toggleSuplementoInfo = (key: string) => {
    setExpandedSuplements(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  if (loadingUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-black via-zinc-950 to-zinc-900 text-zinc-50">
        <p className="text-sm text-zinc-400">Cargando tus suplementos...</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-black text-zinc-50 tracking-tight bg-cover bg-center bg-no-repeat bg-fixed relative"
      style={{
        backgroundImage: 'url("https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920")',
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
              <Link href="/entrenamiento" className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-900/50 hover:text-zinc-100">
                <span aria-hidden className="text-sm">🏋️</span> Entrenamiento
              </Link>
              <Link href="/suplementos" className="inline-flex items-center gap-2 rounded-full bg-zinc-900/70 px-3 py-2 text-xs font-medium text-zinc-100">
                <span aria-hidden className="text-sm">💊</span> Suplementos
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
      <main className="relative z-10 mx-auto max-w-4xl px-6 py-8 md:px-8 md:py-10">
        <div className="grid gap-6 lg:grid-cols-12">
          
          {/* FORMULARIO */}
          <section className="lg:col-span-5">
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-6">
              <div className="mb-6">
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Añadir Suplemento</h1>
                <p className="mt-1 text-sm text-zinc-400">Registra tus suplementos y dosis</p>
              </div>

              <form onSubmit={handleAgregarSuplemento} className="space-y-4">
                {/* NOMBRE */}
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Nombre del suplemento</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ej: Creatina, Proteína whey, Cafeína"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800/80 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-[#b6f542]/70 focus:bg-black/40"
                  />
                </div>

                {/* DOSIS */}
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Dosis</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ej: 5g, 1 scoop, 200mg"
                    value={dosis}
                    onChange={(e) => setDosis(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800/80 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-[#b6f542]/70 focus:bg-black/40"
                  />
                </div>

                {/* MOMENTO */}
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Momento de consumo</label>
                  <select 
                    required
                    value={momento}
                    onChange={(e) => setMomento(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800/80 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-[#b6f542]/70 focus:bg-black/40"
                  >
                    {momentos.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                {/* NOTAS */}
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Notas (opcional)</label>
                  <textarea 
                    placeholder="Ej: Tomar con agua, preferirmente en ayunas..."
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-zinc-800/80 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-[#b6f542]/70 focus:bg-black/40 resize-none"
                  />
                </div>

                {/* BOTÓN */}
                <button
                  type="submit"
                  disabled={cargando}
                  className="w-full rounded-xl bg-[#b6f542] px-6 py-3 text-sm font-semibold text-black transition hover:bg-[#b6f542]/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cargando ? "Agregando..." : "Añadir suplemento"}
                </button>
              </form>
            </div>
          </section>

          {/* LISTA E INFORMACIÓN */}
          <section className="lg:col-span-7">
            <div className="space-y-6">
              
              {/* LISTA DE SUPLEMENTOS */}
              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-6">
                <h2 className="text-lg font-semibold text-zinc-50 mb-4">Mis Suplementos</h2>
                
                {loadingSuplementos ? (
                  <p className="text-sm text-zinc-400">Cargando suplementos...</p>
                ) : suplementos.length === 0 ? (
                  <p className="text-sm text-zinc-400">No tienes suplementos registrados</p>
                ) : (
                  <div className="space-y-3">
                    {suplementos.map((sup) => {
                      const info = getInfoSuplemento(sup.nombre);
                      return (
                        <div 
                          key={sup.id}
                          className={`rounded-xl border p-4 transition ${
                            sup.activo 
                              ? 'border-zinc-800/80 bg-zinc-900/30' 
                              : 'border-zinc-800/40 bg-zinc-900/20 opacity-60'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-medium text-zinc-100">{sup.nombre}</h3>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                                  sup.activo 
                                    ? 'bg-[#b6f542]/20 text-[#b6f542]' 
                                    : 'bg-zinc-800/50 text-zinc-500'
                                }`}>
                                  {sup.activo ? 'Activo' : 'Inactivo'}
                                </span>
                              </div>
                              
                              <div className="space-y-1 text-sm text-zinc-300">
                                <p><span className="text-zinc-500">Dosis:</span> {sup.dosis}</p>
                                <p><span className="text-zinc-500">Momento:</span> {sup.momento}</p>
                                {sup.notas && <p><span className="text-zinc-500">Notas:</span> {sup.notas}</p>}
                              </div>

                              {info && (
                                <div className="mt-3 p-3 rounded-lg bg-zinc-800/30 border border-zinc-700/50">
                                  <p className="text-xs font-medium text-[#b6f542] mb-1">Información científica:</p>
                                  <p className="text-xs text-zinc-300 leading-relaxed">{info.evidencia}</p>
                                  <p className="text-xs text-zinc-400 mt-1"><strong>Dosis recomendada:</strong> {info.dosis}</p>
                                  <p className="text-xs text-zinc-400 mt-1"><strong>Beneficios:</strong> {info.beneficios}</p>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => handleToggleActivo(sup.id, sup.activo, e)}
                                className={`p-2 rounded-lg transition text-xs font-medium ${
                                  sup.activo
                                    ? 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50'
                                    : 'text-[#b6f542] hover:text-[#b6f542]/90 hover:bg-[#b6f542]/10'
                                }`}
                                title={sup.activo ? "Desactivar" : "Activar"}
                              >
                                {sup.activo ? '⏸' : '▶'}
                              </button>
                              <button
                                onClick={(e) => handleEliminarSuplemento(sup.id, e)}
                                className="text-red-500 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-red-500/10 text-sm font-bold"
                                title="Eliminar suplemento"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* INFORMACIÓN GENERAL */}
              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-6">
                <h2 className="text-lg font-semibold text-zinc-50 mb-4">Guía de Suplementos</h2>
                
                <div className="space-y-2">
                  {Object.entries(infoSuplementos).map(([key, info]) => {
                    const isExpanded = expandedSuplements.has(key);
                    return (
                      <div key={key} className="rounded-lg border border-zinc-800/50 overflow-hidden">
                        <button
                          onClick={() => toggleSuplementoInfo(key)}
                          className="w-full flex items-center justify-between p-4 text-left transition hover:bg-zinc-800/30"
                        >
                          <h3 className="font-medium text-[#b6f542] capitalize">{key}</h3>
                          <span className="text-[#b6f542] transition-transform duration-200" style={{
                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                          }}>
                            ▼
                          </span>
                        </button>
                        
                        {isExpanded && (
                          <div className="p-4 bg-zinc-900/30 border-t border-zinc-800/50">
                            <div className="space-y-3 text-sm">
                              <div>
                                <span className="text-zinc-400 font-medium">Evidencia:</span>
                                <p className="text-zinc-300 mt-1">{info.evidencia}</p>
                              </div>
                              <div>
                                <span className="text-zinc-400 font-medium">Dosis recomendada:</span>
                                <p className="text-zinc-300 mt-1">{info.dosis}</p>
                              </div>
                              <div>
                                <span className="text-zinc-400 font-medium">Beneficios:</span>
                                <p className="text-zinc-300 mt-1">{info.beneficios}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
