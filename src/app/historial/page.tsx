"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";

type Comida = {
  id: string;
  nombre_plato: string;
  calorias: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
  created_at: string;
};

type DiaResumen = {
  fecha: Date;
  comidas: Comida[];
  totalCalorias: number;
  totalProteinas: number;
  totalCarbohidratos: number;
  totalGrasas: number;
  objetivoCalorias: number;
  cumpleObjetivo: 'verde' | 'amarillo' | 'gris';
};

export default function HistorialPage() {
  const router = useRouter();
  const [loadingUser, setLoadingUser] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [comidas, setComidas] = useState<Comida[]>([]);
  const [entrenamientos, setEntrenamientos] = useState<any[]>([]);
  const [objetivosPersonales, setObjetivosPersonales] = useState({ kcal: 2400, p: 160, c: 260, g: 75 });

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

  // Generar días del mes actual
  const diasDelMes = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const primerDia = new Date(year, month, 1);
    const ultimoDia = new Date(year, month + 1, 0);
    const dias = [];

    // Añadir días vacíos al inicio
    for (let i = 0; i < primerDia.getDay(); i++) {
      dias.push(null);
    }

    // Añadir todos los días del mes
    for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
      dias.push(new Date(year, month, dia));
    }

    return dias;
  }, [currentMonth]);

  // Agrupar comidas por día y calcular resúmenes
  const resumenesMensuales = useMemo(() => {
    const resumenes: DiaResumen[] = [];
    
    diasDelMes.forEach(dia => {
      if (!dia) return;

      const comidasDia = comidas.filter(comida => {
        const comidaFecha = new Date(comida.created_at);
        return comidaFecha.toDateString() === dia.toDateString();
      });

      const totalCalorias = comidasDia.reduce((acc, comida) => acc + comida.calorias, 0);
      const totalProteinas = comidasDia.reduce((acc, comida) => acc + comida.proteinas, 0);
      const totalCarbohidratos = comidasDia.reduce((acc, comida) => acc + comida.carbohidratos, 0);
      const totalGrasas = comidasDia.reduce((acc, comida) => acc + comida.grasas, 0);

      let cumpleObjetivo: 'verde' | 'amarillo' | 'gris' = 'gris';
      if (comidasDia.length > 0) {
        if (totalCalorias >= objetivosPersonales.kcal * 0.9 && totalCalorias <= objetivosPersonales.kcal * 1.1) {
          cumpleObjetivo = 'verde';
        } else if (totalCalorias > 0) {
          cumpleObjetivo = 'amarillo';
        }
      }

      resumenes.push({
        fecha: dia,
        comidas: comidasDia,
        totalCalorias,
        totalProteinas,
        totalCarbohidratos,
        totalGrasas,
        objetivoCalorias: objetivosPersonales.kcal,
        cumpleObjetivo
      });
    });

    return resumenes;
  }, [diasDelMes, comidas, objetivosPersonales]);

  // Calcular totales del mes
  const totalesMes = useMemo(() => {
    const diasConDatos = resumenesMensuales.filter(r => r.comidas.length > 0);
    const diasRegistrados = diasConDatos.length;
    
    if (diasRegistrados === 0) {
      return {
        promedioCalorias: 0,
        promedioProteinas: 0,
        diasRegistrados: 0
      };
    }

    const totalCaloriasMes = diasConDatos.reduce((acc, dia) => acc + dia.totalCalorias, 0);
    const totalProteinasMes = diasConDatos.reduce((acc, dia) => acc + dia.totalProteinas, 0);

    return {
      promedioCalorias: Math.round(totalCaloriasMes / diasRegistrados),
      promedioProteinas: Math.round(totalProteinasMes / diasRegistrados),
      diasRegistrados
    };
  }, [resumenesMensuales]);

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
      
      // Cargar perfil para objetivos
      const { data: perfil } = await supabase
        .from("perfiles")
        .select("objetivo")
        .eq("user_id", user.id)
        .single();

      if (perfil) {
        // Calcular macros según objetivo (simplificado)
        let kcal = 2400;
        switch (perfil.objetivo) {
          case "perder_grasa": kcal = 2000; break;
          case "ganar_musculo": kcal = 2800; break;
          case "mantenimiento": kcal = 2400; break;
        }
        setObjetivosPersonales({
          kcal,
          p: Math.round(kcal * 0.25 / 4), // 25% proteína
          c: Math.round(kcal * 0.45 / 4), // 45% carbohidratos
          g: Math.round(kcal * 0.30 / 9)  // 30% grasas
        });
      }

      setLoadingUser(false);
    };

    fetchUser();
  }, [router]);

  useEffect(() => {
    if (!userId) return;

    const cargarComidas = async () => {
      setLoadingData(true);
      
      try {
        // Cargar comidas de los últimos 30 días
        const fechaInicio = new Date();
        fechaInicio.setDate(fechaInicio.getDate() - 30);
        
        const { data: comidasData, error: comidasError } = await supabase
          .from("analisis")
          .select("*")
          .eq("user_id", userId)
          .gte("created_at", fechaInicio.toISOString())
          .order("created_at", { ascending: false });

        // Cargar entrenamientos de los últimos 30 días
        const { data: entrenamientosData, error: entrenamientosError } = await supabase
          .from("entrenamientos")
          .select("*")
          .eq("user_id", userId)
          .gte("created_at", fechaInicio.toISOString())
          .order("created_at", { ascending: false });

        console.log("Entrenamientos cargados:", entrenamientosData?.length || 0);

        if (comidasError) {
          console.error("Error cargando comidas:", comidasError);
        } else {
          setComidas(comidasData || []);
        }

        if (entrenamientosError) {
          console.error("Error cargando entrenamientos:", entrenamientosError);
        } else {
          setEntrenamientos(entrenamientosData || []);
        }
      } catch (error) {
        console.error("Error cargando datos:", error);
      } finally {
        setLoadingData(false);
      }
    };

    cargarComidas();
  }, [userId]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  const cambiarMes = (direccion: number) => {
    const nuevoMes = new Date(currentMonth);
    nuevoMes.setMonth(nuevoMes.getMonth() + direccion);
    setCurrentMonth(nuevoMes);
    setSelectedDay(null);
  };

  const formatearMes = (fecha: Date) => {
    return fecha.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  };

  const formatearDia = (dia: number) => {
    return dia.toString().padStart(2, '0');
  };

  const obtenerColorDia = (resumen: DiaResumen) => {
    switch (resumen.cumpleObjetivo) {
      case 'verde': return 'bg-green-500/20 border-green-500/50 text-green-400';
      case 'amarillo': return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400';
      default: return 'bg-zinc-800/30 border-zinc-700/50 text-zinc-400';
    }
  };

  if (loadingUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-black via-zinc-950 to-zinc-900 text-zinc-50">
        <p className="text-sm text-zinc-400">Cargando tu historial...</p>
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
      
      <Header userEmail={email} userName={nombreCorto} />

      {/* PÁGINA PRINCIPAL */}
      <main className="relative z-10 mx-auto max-w-6xl px-6 py-8 md:px-8 md:py-10">
        <div className="grid gap-6">
          {/* TÍTULO */}
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                  Registro Nutricional
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-50">
                  Mi Registro - Últimos 30 días
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => cambiarMes(-1)}
                  className="rounded-lg border border-zinc-800/80 bg-zinc-900/50 p-2 text-zinc-300 transition hover:bg-zinc-800/50 hover:text-zinc-100"
                >
                  ←
                </button>
                <span className="min-w-[120px] text-center text-sm font-medium text-zinc-100">
                  {formatearMes(currentMonth)}
                </span>
                <button
                  onClick={() => cambiarMes(1)}
                  className="rounded-lg border border-zinc-800/80 bg-zinc-900/50 p-2 text-zinc-300 transition hover:bg-zinc-800/50 hover:text-zinc-100"
                >
                  →
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* CALENDARIO */}
            <section className="lg:col-span-2">
              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-6">
                <h2 className="text-lg font-semibold text-zinc-50 mb-4">Calendario</h2>
                
                {loadingData ? (
                  <p className="text-sm text-zinc-400">Cargando datos...</p>
                ) : (
                  <div className="grid grid-cols-7 gap-1">
                    {/* Días de la semana */}
                    {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(dia => (
                      <div key={dia} className="text-center text-xs font-medium text-zinc-500 py-2">
                        {dia}
                      </div>
                    ))}
                    
                    {/* Días del mes */}
                    {diasDelMes.map((dia, index) => {
                      const resumen = dia ? resumenesMensuales.find(r => r.fecha.toDateString() === dia.toDateString()) : null;
                      const isSelected = selectedDay && dia && dia.toDateString() === selectedDay.toDateString();
                      
                      return (
                        <button
                          key={index}
                          onClick={() => dia && setSelectedDay(dia)}
                          disabled={!dia}
                          className={`aspect-square rounded-lg border p-2 text-xs font-medium transition ${
                            !dia 
                              ? 'border-transparent' 
                              : resumen 
                                ? `${obtenerColorDia(resumen)} border cursor-pointer hover:opacity-80`
                                : 'border-zinc-800/50 text-zinc-500 cursor-pointer hover:border-zinc-700/50 hover:text-zinc-400'
                            } ${isSelected ? 'ring-2 ring-[#b6f542]' : ''}
                          `}
                        >
                          {dia ? (
                            <div>
                              <div>{formatearDia(dia.getDate())}</div>
                              {resumen && resumen.comidas.length > 0 && (
                                <div className="text-[10px] mt-1">
                                  {resumen.totalCalorias} kcal
                                </div>
                              )}
                            </div>
                          ) : ''}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            {/* DETALLES Y TOTALES */}
            <section className="space-y-6">
              {/* DETALLES DEL DÍA SELECCIONADO */}
              {selectedDay && (() => {
                const resumen = resumenesMensuales.find(r => r.fecha.toDateString() === selectedDay.toDateString());
                const entrenamientosDia = entrenamientos.filter(entrenamiento => {
                  const entrenamientoFecha = new Date(entrenamiento.created_at);
                  return entrenamientoFecha.toDateString() === selectedDay.toDateString();
                });

                // Mostrar si hay comidas O entrenamientos
                if ((!resumen || resumen.comidas.length === 0) && entrenamientosDia.length === 0) return null;

                return (
                  <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-6">
                    <h3 className="text-lg font-semibold text-zinc-50 mb-4">
                      {selectedDay.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                    </h3>
                    
                    <div className="space-y-6">
                      {/* Sección Comidas */}
                      {resumen && resumen.comidas.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                            🍽️ Comidas del día
                          </h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-zinc-400">Calorías:</span>
                              <div className="font-medium text-zinc-100">{resumen.totalCalorias} / {resumen.objetivoCalorias}</div>
                            </div>
                            <div>
                              <span className="text-zinc-400">Proteínas:</span>
                              <div className="font-medium text-zinc-100">{resumen.totalProteinas}g</div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {resumen.comidas.map((comida, index) => (
                              <div key={comida.id} className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-3">
                                <div className="font-medium text-zinc-100 text-sm">{comida.nombre_plato}</div>
                                <div className="text-xs text-zinc-400 mt-1">
                                  {comida.calorias} kcal | {comida.proteinas}g P | {comida.carbohidratos}g C | {comida.grasas}g G
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Sección Entrenamientos */}
                      {entrenamientosDia.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                            💪 Entrenamientos del día
                          </h4>
                          <div className="space-y-2">
                            {entrenamientosDia.map((entrenamiento, index) => (
                              <div key={entrenamiento.id} className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-3">
                                <div className="font-medium text-zinc-100 text-sm">{entrenamiento.tipo}</div>
                                <div className="text-xs text-zinc-400 mt-1">
                                  {entrenamiento.intensidad} • {entrenamiento.duracion} min
                                  {entrenamiento.notas && ` • ${entrenamiento.notas}`}
                                </div>
                                <div className="text-xs text-[#b6f542] mt-1">
                                  ~{Math.round(entrenamiento.duracion * 8)} kcal quemadas
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* TOTALES DEL MES */}
              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-6">
                <h3 className="text-lg font-semibold text-zinc-50 mb-4">Totales del mes</h3>
                
                <div className="space-y-3">
                  <div className="text-sm">
                    <span className="text-zinc-400">Días registrados:</span>
                    <div className="font-medium text-[#b6f542]">{totalesMes.diasRegistrados} días</div>
                  </div>
                  
                  <div className="text-sm">
                    <span className="text-zinc-400">Promedio diario calorías:</span>
                    <div className="font-medium text-zinc-100">{totalesMes.promedioCalorias} kcal</div>
                  </div>
                  
                  <div className="text-sm">
                    <span className="text-zinc-400">Promedio diario proteínas:</span>
                    <div className="font-medium text-zinc-100">{totalesMes.promedioProteinas}g</div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
