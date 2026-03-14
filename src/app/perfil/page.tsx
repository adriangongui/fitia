"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";

type Sexo = "hombre" | "mujer";
type Actividad = "sedentario" | "moderado" | "activo" | "muy_activo";
type Objetivo = "ganar_musculo" | "perder_grasa" | "mantenimiento";
type Deporte = "ninguno" | "futbol" | "baloncesto" | "natacion" | "ciclismo" | "running" | "crossfit" | "gimnasio" | "artes_marciales" | "otro";

type RegistroPeso = {
  id: string;
  peso: number;
  created_at: string;
};

export default function PerfilPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  const [perfilId, setPerfilId] = useState<number | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [nombre, setNombre] = useState<string>("");
  const [peso, setPeso] = useState<string>("");
  const [altura, setAltura] = useState<string>("");
  const [edad, setEdad] = useState<string>("");
  const [sexo, setSexo] = useState<Sexo | null>(null);
  const [actividad, setActividad] = useState<Actividad | null>(null);
  const [objetivo, setObjetivo] = useState<Objetivo | null>(null);
  const [deporte, setDeporte] = useState<Deporte | null>(null);
  const [otroDeporte, setOtroDeporte] = useState<string>("");

  // Estados para seguimiento de peso
  const [registrosPeso, setRegistrosPeso] = useState<RegistroPeso[]>([]);
  const [nuevoPeso, setNuevoPeso] = useState<string>("");
  const [showRecordatorio, setShowRecordatorio] = useState(false);
  const [diasDesdeUltimoRegistro, setDiasDesdeUltimoRegistro] = useState<number>(0);

  const registrarPeso = async () => {
    if (!nuevoPeso || !userId) return;
    await supabase.from("registros_peso").insert({ user_id: userId, peso: parseFloat(nuevoPeso) });
    setNuevoPeso("");
    const { data } = await supabase.from("registros_peso").select("id, peso, created_at").eq("user_id", userId).order("created_at", { ascending: true }).limit(30);
    if (data) setRegistrosPeso(data);
  };

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

      const { data } = await supabase
        .from("perfiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setPerfilId(data.id);
        setNombre(data.nombre || "");
        setPeso(data.peso?.toString() || "");
        setAltura(data.altura?.toString() || "");
        setEdad(data.edad?.toString() || "");
        setSexo(data.sexo);
        setActividad(data.actividad);
        setObjetivo(data.objetivo);
        
        // Manejar campo deporte
        const deportesValidos = ["ninguno", "futbol", "baloncesto", "natacion", "ciclismo", "running", "crossfit", "gimnasio", "artes_marciales"];
        if (deportesValidos.includes(data.deporte)) {
          setDeporte(data.deporte);
          setOtroDeporte("");
        } else {
          setDeporte("otro");
          setOtroDeporte(data.deporte || "");
        }
      } else {
        router.replace("/onboarding");
      }

      // Cargar registros de peso
      const { data: pesoData } = await supabase
        .from("registros_peso")
        .select("id, peso, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(30);

      if (pesoData) setRegistrosPeso(pesoData);
      
      setLoading(false);
    };

    fetchUser();
  }, [router]);

  const handleSave = async () => {
    if (!userId || saving) return;
    setSaving(true);
    
    console.log("user_id:", userId);
    
    try {
      const { error } = await supabase
        .from("perfiles")
        .upsert({
          user_id: userId,
          nombre: nombre.trim(),
          peso: Number(peso),
          altura: Number(altura),
          edad: Number(edad),
          sexo,
          actividad,
          objetivo,
          deporte: deporte === "otro" ? otroDeporte : deporte,
          otro_deporte: deporte === "otro" ? otroDeporte : null,
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id" });

      if (error) throw error;
      
      alert("Perfil actualizado correctamente");
    } catch (err: any) {
      console.error("Supabase error:", err);
      alert(err?.message || "Error al actualizar el perfil.");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-black via-zinc-950 to-zinc-900 text-zinc-50">
        <p className="text-sm text-zinc-400">Cargando perfil...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-zinc-900 text-zinc-50">
      <Header userEmail={email} userName={nombre} />

      <main className="mx-auto max-w-2xl px-6 py-10 md:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Mi Perfil</h1>
            <p className="text-sm text-zinc-400 mt-1">Configura tus datos para adaptar los objetivos y cálculos</p>
          </div>
          <button
            onClick={handleSignOut}
            className="rounded-full border border-red-900/40 bg-red-500/10 px-4 py-2 text-xs font-medium text-red-400 transition hover:bg-red-500/20"
          >
            Cerrar sesión
          </button>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* SECCIÓN 1: MI PERFIL */}
          <section className="rounded-3xl border border-zinc-800/80 bg-zinc-950/70 p-6 sm:p-8 flex flex-col items-start gap-6 h-fit">
            <div className="flex flex-col gap-1 w-full">
              <h2 className="text-lg font-semibold text-zinc-50">Mi perfil</h2>
              <p className="text-xs text-zinc-400">Datos públicos e información de cuenta</p>
            </div>
            
            <div className="w-full">
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Correo electrónico
              </label>
              <div className="w-full rounded-2xl border border-zinc-800/50 bg-black/20 px-4 py-3 text-sm text-zinc-500 cursor-not-allowed">
                {email ?? "Cargando..."}
              </div>
            </div>

            <div className="w-full">
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Nombre
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Por ejemplo: Carlos..."
                className="w-full rounded-2xl border border-zinc-800 bg-black/40 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-[#b6f542]/70 focus:ring-1 focus:ring-[#b6f542]/70"
              />
            </div>
          </section>

          {/* SECCIÓN 2: CONFIGURACIÓN */}
          <section className="rounded-3xl border border-zinc-800/80 bg-zinc-950/70 p-6 sm:p-8 flex flex-col items-start gap-6">
            <div className="flex flex-col gap-1 w-full">
              <h2 className="text-lg font-semibold text-zinc-50">Configura tus métricas</h2>
              <p className="text-xs text-zinc-400">Usado para calcular requerimientos diarios</p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 w-full">
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Peso (kg)
              </label>
              <input
                type="number"
                value={peso}
                onChange={(e) => setPeso(e.target.value)}
                className="w-full rounded-2xl border border-zinc-800 bg-black/40 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-[#b6f542]/70 focus:ring-1 focus:ring-[#b6f542]/70"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Altura (cm)
              </label>
              <input
                type="number"
                value={altura}
                onChange={(e) => setAltura(e.target.value)}
                className="w-full rounded-2xl border border-zinc-800 bg-black/40 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-[#b6f542]/70 focus:ring-1 focus:ring-[#b6f542]/70"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Edad
              </label>
              <input
                type="number"
                value={edad}
                onChange={(e) => setEdad(e.target.value)}
                className="w-full rounded-2xl border border-zinc-800 bg-black/40 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-[#b6f542]/70 focus:ring-1 focus:ring-[#b6f542]/70"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Sexo Biológico
              </label>
              <select
                value={sexo ?? ""}
                onChange={(e) => setSexo(e.target.value as Sexo)}
                className="w-full rounded-2xl border border-zinc-800 bg-black/40 px-4 py-3.5 text-sm text-zinc-100 outline-none transition focus:border-[#b6f542]/70 focus:ring-1 focus:ring-[#b6f542]/70"
              >
                <option value="hombre">Hombre</option>
                <option value="mujer">Mujer</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Nivel de Actividad
              </label>
              <select
                value={actividad ?? ""}
                onChange={(e) => setActividad(e.target.value as Actividad)}
                className="w-full rounded-2xl border border-zinc-800 bg-black/40 px-4 py-3.5 text-sm text-zinc-100 outline-none transition focus:border-[#b6f542]/70 focus:ring-1 focus:ring-[#b6f542]/70"
              >
                <option value="sedentario">Sedentario (Poco/ningún deporte)</option>
                <option value="moderado">Moderado (1-3 días a la semana)</option>
                <option value="activo">Activo (3-5 días a la semana)</option>
                <option value="muy_activo">Muy Activo (Fuerte, 6-7 días)</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Objetivo
              </label>
              <select
                value={objetivo ?? ""}
                onChange={(e) => setObjetivo(e.target.value as Objetivo)}
                className="w-full rounded-2xl border border-zinc-800 bg-black/40 px-4 py-3.5 text-sm text-zinc-100 outline-none transition focus:border-[#b6f542]/70 focus:ring-1 focus:ring-[#b6f542]/70"
              >
                <option value="perder_grasa">Perder Grasa (Déficit calórico)</option>
                <option value="mantenimiento">Mantenimiento (Balance neutro)</option>
                <option value="ganar_musculo">Ganar Músculo (Superávit calórico)</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Deporte
              </label>
              <select
                value={deporte ?? ""}
                onChange={(e) => setDeporte(e.target.value as Deporte)}
                className="w-full rounded-2xl border border-zinc-800 bg-black/40 px-4 py-3.5 text-sm text-zinc-100 outline-none transition focus:border-[#b6f542]/70 focus:ring-1 focus:ring-[#b6f542]/70"
              >
                <option value="ninguno">Ninguno</option>
                <option value="futbol">Fútbol</option>
                <option value="baloncesto">Baloncesto</option>
                <option value="natacion">Natación</option>
                <option value="ciclismo">Ciclismo</option>
                <option value="running">Running</option>
                <option value="crossfit">Crossfit</option>
                <option value="gimnasio">Gimnasio/Musculación</option>
                <option value="artes_marciales">Artes marciales</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            {deporte === "otro" && (
              <div className="sm:col-span-2">
                <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                  ¿Cuál deporte practicas?
                </label>
                <input 
                  type="text" 
                  value={otroDeporte}
                  onChange={(e) => setOtroDeporte(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-800 bg-black/40 px-4 py-3.5 text-sm text-zinc-100 outline-none transition focus:border-[#b6f542]/70 focus:ring-1 focus:ring-[#b6f542]/70"
                />
              </div>
            )}
            </div>

            <div className="mt-8 flex w-full flex-col sm:flex-row justify-end gap-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full sm:w-auto rounded-full bg-[#b6f542] px-6 py-2.5 text-sm font-semibold text-black shadow-[0_0_20px_rgba(182,245,66,0.3)] transition hover:bg-[#c8ff62] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </section>

          {/* SEGUIMIENTO DE PESO */}
          <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="mb-4 text-lg font-semibold text-zinc-100">⚖️ Seguimiento de Peso</h2>
            
            <div className="mb-4 flex gap-3">
              <input
                type="number"
                step="0.1"
                placeholder="Ej: 75.5"
                value={nuevoPeso}
                onChange={(e) => setNuevoPeso(e.target.value)}
                className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-zinc-100 placeholder-zinc-500 focus:border-[#b6f542] focus:outline-none"
              />
              <button
                onClick={registrarPeso}
                className="rounded-xl bg-[#b6f542] px-4 py-2 font-semibold text-black hover:bg-[#c8ff62]"
              >
                Registrar
              </button>
            </div>

            {registrosPeso.length > 0 && (
              <div className="mt-4">
                <div className="flex justify-between text-sm text-zinc-400 mb-2">
                  <span>Inicial: {registrosPeso[0]?.peso}kg</span>
                  <span>Actual: {registrosPeso[registrosPeso.length-1]?.peso}kg</span>
                  <span>Diferencia: {(registrosPeso[registrosPeso.length-1]?.peso - registrosPeso[0]?.peso).toFixed(1)}kg</span>
                </div>
                <svg viewBox="0 0 400 100" className="w-full h-24 mt-2">
                  {registrosPeso.map((r, i) => {
                    const x = (i / Math.max(registrosPeso.length - 1, 1)) * 380 + 10;
                    const minPeso = Math.min(...registrosPeso.map(r => r.peso));
                    const maxPeso = Math.max(...registrosPeso.map(r => r.peso));
                    const range = maxPeso - minPeso || 1;
                    const y = 90 - ((r.peso - minPeso) / range) * 80;
                    return <circle key={r.id} cx={x} cy={y} r="3" fill="#b6f542" />;
                  })}
                  {registrosPeso.map((r, i) => {
                    if (i === 0) return null;
                    const x1 = ((i-1) / Math.max(registrosPeso.length - 1, 1)) * 380 + 10;
                    const x2 = (i / Math.max(registrosPeso.length - 1, 1)) * 380 + 10;
                    const minPeso = Math.min(...registrosPeso.map(r => r.peso));
                    const maxPeso = Math.max(...registrosPeso.map(r => r.peso));
                    const range = maxPeso - minPeso || 1;
                    const y1 = 90 - ((registrosPeso[i-1].peso - minPeso) / range) * 80;
                    const y2 = 90 - ((r.peso - minPeso) / range) * 80;
                    return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#b6f542" strokeWidth="2" />;
                  })}
                </svg>
              </div>
            )}

            {registrosPeso.length === 0 && (
              <p className="text-zinc-500 text-sm">Aún no hay registros de peso. ¡Registra tu peso hoy!</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
