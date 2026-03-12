"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Sexo = "hombre" | "mujer";
type Actividad = "sedentario" | "moderado" | "activo" | "muy_activo";
type Objetivo = "ganar_musculo" | "perder_grasa" | "mantenimiento";
type Deporte = "ninguno" | "futbol" | "baloncesto" | "natacion" | "ciclismo" | "running" | "crossfit" | "gimnasio" | "artes_marciales" | "otro";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Form state
  const [peso, setPeso] = useState<string>("");
  const [altura, setAltura] = useState<string>("");
  const [edad, setEdad] = useState<string>("");
  const [sexo, setSexo] = useState<Sexo | null>(null);
  const [actividad, setActividad] = useState<Actividad | null>(null);
  const [objetivo, setObjetivo] = useState<Objetivo | null>(null);
  const [deporte, setDeporte] = useState<Deporte | null>(null);
  const [otroDeporte, setOtroDeporte] = useState<string>("");

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }
      setUserId(user.id);

      // Check if profile exists already
      const { data } = await supabase
        .from("perfiles")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      if (data) {
        // Redirige si ya tiene perfil
        router.replace("/dashboard");
      } else {
        setLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  const handleNext = () => {
    if (step < 5) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleFinish = async () => {
    if (!userId || saving) return;
    setSaving(true);
    
    try {
      const { error } = await supabase.from("perfiles").insert({
        user_id: userId,
        peso: Number(peso),
        altura: Number(altura),
        edad: Number(edad),
        sexo,
        actividad,
        objetivo,
        deporte: deporte === "otro" ? otroDeporte : deporte,
      });

      if (error) throw error;
      
      router.replace("/dashboard");
    } catch (err) {
      console.error(err);
      setSaving(false);
      alert("Error al guardar tu perfil. Inténtalo de nuevo.");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-black via-zinc-950 to-zinc-900 text-zinc-50">
        <p className="text-sm text-zinc-400">Verificando sesión...</p>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-6 py-12 text-zinc-50 tracking-tight bg-cover bg-center bg-no-repeat bg-fixed relative"
      style={{
        backgroundImage: 'url("https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1920")',
      }}
    >
      <div className="absolute inset-0 bg-black/80 z-0"></div>
      
      <div className="w-full max-w-lg relative z-10">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#b6f542]/10 ring-1 ring-[#b6f542]/40">
            <span className="text-xl font-semibold text-[#b6f542]">F</span>
          </div>
          <span className="text-xl font-bold tracking-tight">FitIA</span>
        </div>

        <div className="rounded-3xl border border-zinc-800/80 bg-zinc-950/70 p-6 shadow-2xl backdrop-blur sm:p-8">
          {/* Indicador de progreso */}
          <div className="mb-8 flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  step >= i ? "bg-[#b6f542]" : "bg-zinc-800"
                }`}
              />
            ))}
          </div>

          {step === 1 && (
            <div className="animate-in fade-in zoom-in-95 duration-300 slide-in-from-right-4">
              <h2 className="text-2xl font-semibold">Tus medidas físicas</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Necesitamos esto para calcular tu metabolismo basal.
              </p>
              <div className="mt-8 grid gap-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-300">
                    Peso (kg)
                  </label>
                  <input
                    type="number"
                    value={peso}
                    onChange={(e) => setPeso(e.target.value)}
                    placeholder="Ej: 75"
                    className="w-full rounded-2xl border border-zinc-800 bg-black/40 px-4 py-3 text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-[#b6f542]/70 focus:ring-1 focus:ring-[#b6f542]/70"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-300">
                    Altura (cm)
                  </label>
                  <input
                    type="number"
                    value={altura}
                    onChange={(e) => setAltura(e.target.value)}
                    placeholder="Ej: 178"
                    className="w-full rounded-2xl border border-zinc-800 bg-black/40 px-4 py-3 text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-[#b6f542]/70 focus:ring-1 focus:ring-[#b6f542]/70"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in fade-in zoom-in-95 duration-300 slide-in-from-right-4">
              <h2 className="text-2xl font-semibold">Edad y Sexo Biológico</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Estos factores influyen en tu requerimiento calórico diario.
              </p>
              <div className="mt-8 grid gap-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-300">
                    Edad
                  </label>
                  <input
                    type="number"
                    value={edad}
                    onChange={(e) => setEdad(e.target.value)}
                    placeholder="Ej: 28"
                    className="w-full rounded-2xl border border-zinc-800 bg-black/40 px-4 py-3 text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-[#b6f542]/70 focus:ring-1 focus:ring-[#b6f542]/70"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-300">
                    Sexo Biológico
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setSexo("hombre")}
                      className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                        sexo === "hombre"
                          ? "border-[#b6f542] bg-[#b6f542]/10 text-[#b6f542]"
                          : "border-zinc-800 bg-black/40 text-zinc-400 hover:border-zinc-700"
                      }`}
                    >
                      Hombre
                    </button>
                    <button
                      onClick={() => setSexo("mujer")}
                      className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                        sexo === "mujer"
                          ? "border-[#b6f542] bg-[#b6f542]/10 text-[#b6f542]"
                          : "border-zinc-800 bg-black/40 text-zinc-400 hover:border-zinc-700"
                      }`}
                    >
                      Mujer
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-in fade-in zoom-in-95 duration-300 slide-in-from-right-4">
              <h2 className="text-2xl font-semibold">Actividad Física</h2>
              <p className="mt-2 text-sm text-zinc-400">
                ¿Cuánto te mueves habitualmente en tu día a día?
              </p>
              <div className="mt-8 grid gap-3">
                {[
                  {
                    id: "sedentario",
                    label: "Sedentario",
                    desc: "Trabajo de oficina, poco o ningún ejercicio.",
                  },
                  {
                    id: "moderado",
                    label: "Moderado",
                    desc: "Ejercicio ligero 1-3 días a la semana.",
                  },
                  {
                    id: "activo",
                    label: "Activo",
                    desc: "Deporte o ejercicio intenso 3-5 días a la semana.",
                  },
                  {
                    id: "muy_activo",
                    label: "Muy activo",
                    desc: "Deporte fuerte 6-7 días a la semana o trabajo físico.",
                  },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActividad(item.id as Actividad)}
                    className={`flex flex-col items-start rounded-2xl border p-4 transition ${
                      actividad === item.id
                        ? "border-[#b6f542] bg-[#b6f542]/10"
                        : "border-zinc-800 bg-black/40 hover:border-zinc-700"
                    }`}
                  >
                    <span
                      className={`font-semibold ${
                        actividad === item.id ? "text-[#b6f542]" : "text-zinc-200"
                      }`}
                    >
                      {item.label}
                    </span>
                    <span className="mt-1 text-xs text-zinc-500 text-left">
                      {item.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="animate-in fade-in zoom-in-95 duration-300 slide-in-from-right-4">
              <h2 className="text-2xl font-semibold">Tu Objetivo</h2>
              <p className="mt-2 text-sm text-zinc-400">
                ¿Qué quieres lograr con tu plan nutricional?
              </p>

              <div className="mt-8 space-y-4">
                {[
                  { id: "ganar_musculo", label: "💪 Ganar músculo", desc: "Aumentar masa muscular y fuerza" },
                  { id: "perder_grasa", label: "🔥 Perder grasa", desc: "Reducir porcentaje de grasa corporal" },
                  { id: "mantenimiento", label: "⚖️ Mantenimiento", desc: "Mantener peso y composición actual" },
                ].map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setObjetivo(option.id as Objetivo)}
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      objetivo === option.id
                        ? "border-[#b6f542]/50 bg-[#b6f542]/10 text-[#b6f542]"
                        : "border-zinc-800/80 bg-zinc-900/30 text-zinc-300 hover:border-zinc-700/50"
                    }`}
                  >
                    <div className="font-medium">{option.label}</div>
                    <div className="text-sm text-zinc-400">{option.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-10 flex items-center justify-between">
            {step > 1 ? (
              <button
                onClick={handleBack}
                className="rounded-full px-5 py-2.5 text-sm font-medium text-zinc-400 transition hover:bg-zinc-800/50 hover:text-zinc-100"
              >
                Atrás
              </button>
            ) : (
              <div /> // Espaciador dummy
            )}

            {step < 5 ? (
              <button
                onClick={handleNext}
                disabled={
                  (step === 1 && (!peso || !altura)) ||
                  (step === 2 && (!edad || !sexo)) ||
                  (step === 3 && !actividad) ||
                  (step === 4 && !objetivo)
                }
                className="rounded-full bg-[#b6f542] px-6 py-2.5 text-sm font-semibold text-black shadow-[0_0_20px_rgba(182,245,66,0.3)] transition hover:bg-[#c8ff62] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
              >
                Siguiente
              </button>
            ) : (
              <button
                onClick={handleFinish}
                disabled={!deporte || (deporte === "otro" && !otroDeporte) || saving}
                className="rounded-full bg-[#b6f542] px-6 py-2.5 text-sm font-semibold text-black shadow-[0_0_20px_rgba(182,245,66,0.3)] transition hover:bg-[#c8ff62] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
              >
                {saving ? "Guardando..." : "Finalizar"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
