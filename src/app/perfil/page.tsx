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
        setPeso(String(data.peso));
        setAltura(String(data.altura));
        setEdad(String(data.edad));
        setSexo(data.sexo as Sexo);
        setActividad(data.actividad as Actividad);
        setObjetivo(data.objetivo as Objetivo);
        
        // Manejar el campo deporte
        if (data.deporte) {
          if (["futbol", "baloncesto", "natacion", "ciclismo", "running", "crossfit", "gimnasio", "artes_marciales"].includes(data.deporte)) {
            setDeporte(data.deporte as Deporte);
          } else {
            setDeporte("otro");
            setOtroDeporte(data.deporte);
          }
        }
      } else {
        router.replace("/onboarding");
      }
      
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
        </div>
      </main>
    </div>
  );
}
