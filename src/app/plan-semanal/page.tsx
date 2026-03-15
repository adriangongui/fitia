"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import { calcularMacros } from "@/lib/calcularMacros";

type Comida = {
  nombre: string;
  calorias: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
};

type DiaPlan = {
  desayuno: Comida;
  media_manana: Comida;
  almuerzo: Comida;
  merienda: Comida;
  cena: Comida;
};

type PlanSemanal = {
  lunes: DiaPlan;
  martes: DiaPlan;
  miercoles: DiaPlan;
  jueves: DiaPlan;
  viernes: DiaPlan;
  sabado: DiaPlan;
  domingo: DiaPlan;
};

const diasSemana = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] as const;
const nombresDias = {
  lunes: 'Lunes',
  martes: 'Martes', 
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
  domingo: 'Domingo'
};

const comidasDia = [
  { key: 'desayuno', nombre: 'Desayuno', icono: '🌅' },
  { key: 'media_manana', nombre: 'Media Mañana', icono: '🍎' },
  { key: 'almuerzo', nombre: 'Comida', icono: '☀️' },
  { key: 'merienda', nombre: 'Merienda', icono: '🍎' },
  { key: 'cena', nombre: 'Cena', icono: '🌙' }
] as const;

export default function PlanSemanalPage() {
  const router = useRouter();
  
  const [loadingUser, setLoadingUser] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<PlanSemanal | null>(null);
  const [diasExpandidos, setDiasExpandidos] = useState<Set<string>>(new Set());
  const [planGuardado, setPlanGuardado] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.replace("/login");
        return;
      }

      setUserId(user.id);
      setEmail(user.email ?? null);
      setLoadingUser(false);

      // Cargar plan existente de esta semana
      await cargarPlanExistente(user.id);
    };

    fetchUser();
  }, [router]);

  const cargarPlanExistente = async (userId: string) => {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1); // Lunes
    startOfWeek.setHours(0, 0, 0, 0);

    const { data: planExistente } = await supabase
      .from("planes_comida")
      .select("plan")
      .eq("user_id", userId)
      .gte("semana_inicio", startOfWeek.toISOString())
      .order("semana_inicio", { ascending: false })
      .limit(1)
      .single();

    if (planExistente?.plan) {
      setPlan(planExistente.plan);
      setPlanGuardado(true);
    }
  };

  const generarPlan = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      // Cargar perfil del usuario
      const { data: perfilData } = await supabase
        .from("perfiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (!perfilData) {
        alert("No se encontró tu perfil. Por favor, completa tus datos en la página de perfil.");
        return;
      }

      // Calcular macros con Harris-Benedict
      const macros = calcularMacros(
        perfilData.peso,
        perfilData.altura,
        perfilData.edad,
        perfilData.sexo,
        perfilData.actividad,
        perfilData.objetivo
      );

      console.log("Calorías enviadas al API:", macros.calorias);
      console.log("Macros calculados:", macros);

      // Mostrar mensaje de generación
      alert(`Generando menú para ${macros.calorias} kcal / ${macros.proteinas}g proteína`);

      const response = await fetch("/api/generar-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          user_id: userId,
          calorias_objetivo: macros.calorias,
          proteinas_objetivo: macros.proteinas,
          carbohidratos_objetivo: macros.carbohidratos,
          grasas_objetivo: macros.grasas
        }),
      });

      if (!response.ok) {
        throw new Error("Error generando el plan");
      }

      const nuevoPlan = await response.json();
      setPlan(nuevoPlan.plan);
      setPlanGuardado(false);
      
      // Guardar automáticamente después de generar
      try {
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1); // Lunes
        startOfWeek.setHours(0, 0, 0, 0);

        const { error } = await supabase
          .from("planes_comida")
          .upsert({
            user_id: userId,
            semana_inicio: startOfWeek.toISOString(),
            plan: nuevoPlan.plan,
            objetivo: "generado_por_chat"
          }, { onConflict: "user_id, semana_inicio" });

        if (!error) {
          setPlanGuardado(true);
          console.log("Plan guardado automáticamente");
        } else {
          console.error("Error guardando plan automático:", error);
        }
      } catch (error) {
        console.error("Error guardando plan automático:", error);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error al generar el plan. Por favor, inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const guardarPlan = async () => {
    if (!userId || !plan) return;

    setLoading(true);
    console.log("Guardando plan...");
    
    try {
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1); // Lunes
      startOfWeek.setHours(0, 0, 0, 0);

      // Intentar upsert con onConflict correcto
      const { error } = await supabase
        .from("planes_comida")
        .upsert({
          user_id: userId,
          semana_inicio: startOfWeek.toISOString(),
          plan: plan,
          objetivo: "generado_por_chat"
        }, { onConflict: "user_id, semana_inicio" });

      if (error) {
        console.error("Error en upsert, intentando insert:", error);
        // Si falla upsert, intentar insert normal
        const { error: insertError } = await supabase
          .from("planes_comida")
          .insert({
            user_id: userId,
            semana_inicio: startOfWeek.toISOString(),
            plan: plan,
            objetivo: "generado_por_chat"
          });
        
        if (insertError) {
          throw insertError;
        }
      }

      setPlanGuardado(true);
      alert("✅ Plan guardado exitosamente");
    } catch (error) {
      console.error("Error guardando plan:", error);
      alert("❌ Error al guardar el plan");
    } finally {
      setLoading(false);
    }
  };

  const toggleDia = (dia: string) => {
    const nuevosExpandidos = new Set(diasExpandidos);
    if (nuevosExpandidos.has(dia)) {
      nuevosExpandidos.delete(dia);
    } else {
      nuevosExpandidos.add(dia);
    }
    setDiasExpandidos(nuevosExpandidos);
  };

  const calcularTotalesDia = (dia: DiaPlan) => {
    return Object.values(dia).reduce(
      (totales, comida) => ({
        calorias: totales.calorias + comida.calorias,
        proteinas: totales.proteinas + comida.proteinas,
        carbohidratos: totales.carbohidratos + comida.carbohidratos,
        grasas: totales.grasas + comida.grasas,
      }),
      { calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0 }
    );
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
      <Header userEmail={email ?? null} userName={email?.split("@")[0] ?? null} />

      <main className="mx-auto max-w-6xl px-6 py-8 md:px-8 md:py-10">
        <div className="mb-8">
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-zinc-50">Menú Semanal</h1>
                <p className="text-sm text-zinc-400 mt-1">Plan nutricional personalizado para toda la semana</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={generarPlan}
                  disabled={loading}
                  className="rounded-full border border-[#b6f542]/40 bg-[#b6f542]/10 px-6 py-2 text-sm font-medium text-[#b6f542] transition hover:bg-[#b6f542]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Generando..." : "🤖 Generar Plan con IA"}
                </button>
                {plan && (
                  <button
                    onClick={guardarPlan}
                    disabled={loading || planGuardado}
                    className="rounded-full border border-zinc-700/40 bg-zinc-800/50 px-6 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-700/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Guardando..." : planGuardado ? "✅ Guardado" : "💾 Guardar Plan"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {plan ? (
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {diasSemana.map((dia) => {
              const diaPlan = plan[dia];
              const expandido = diasExpandidos.has(dia);
              const totales = diaPlan ? calcularTotalesDia(diaPlan) : { calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0 };

              return (
                <div key={dia} className="rounded-2xl border border-zinc-800/80 bg-zinc-950/70 overflow-hidden">
                  <button
                    onClick={() => toggleDia(dia)}
                    className="w-full p-4 text-left transition hover:bg-zinc-900/30"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-zinc-50">{nombresDias[dia]}</h3>
                      <span className={`text-sm transition-transform ${expandido ? 'rotate-180' : ''}`}>▼</span>
                    </div>
                    <div className="mt-2 text-xs text-zinc-400">
                      Total: {totales.calorias}kcal | P: {totales.proteinas}g | C: {totales.carbohidratos}g | G: {totales.grasas}g
                    </div>
                  </button>

                  {expandido && diaPlan && (
                    <div className="border-t border-zinc-800/50 p-4 space-y-3">
                      {comidasDia.map((comida) => {
                        const comidaData = diaPlan[comida.key];
                        if (!comidaData) return null;
                        
                        return (
                          <div key={comida.key} className="rounded-lg border border-zinc-800/40 bg-zinc-900/50 p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm">{comida.icono}</span>
                              <span className="text-sm font-medium text-zinc-300">{comida.nombre}</span>
                            </div>
                            <div className="text-xs text-zinc-400">{comidaData.nombre}</div>
                            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                              <div className="flex items-center gap-1">
                                <span className="text-[#b6f542]">🔥</span>
                                <span className="text-zinc-300">{comidaData.calorias} kcal</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[#b6f542]">💪</span>
                                <span className="text-zinc-300">{comidaData.proteinas}g proteína</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[#b6f542]">🌾</span>
                                <span className="text-zinc-300">{comidaData.carbohidratos}g carbs</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[#b6f542]">🥑</span>
                                <span className="text-zinc-300">{comidaData.grasas}g grasas</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-12 text-center">
            <div className="text-6xl mb-4">🍽</div>
            <h3 className="text-xl font-semibold text-zinc-50 mb-2">Sin menú semanal</h3>
            <p className="text-sm text-zinc-400 mb-6">
              Genera un plan nutricional personalizado con IA para toda la semana
            </p>
            <button
              onClick={generarPlan}
              disabled={loading}
              className="rounded-full border border-[#b6f542]/40 bg-[#b6f542]/10 px-8 py-3 text-base font-medium text-[#b6f542] transition hover:bg-[#b6f542]/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Generando..." : "🤖 Generar Plan con IA"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
