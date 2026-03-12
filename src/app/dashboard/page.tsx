"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

import { calcularMacros } from "@/lib/calcularMacros";

type AnalisisComida = {
  id?: number;
  nombre_plato: string;
  calorias: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
  confianza?: number;
};

type Entrenamiento = {
  id: string;
  tipo: string;
  duracion: number;
  intensidad: string;
  notas: string | null;
  calorias_quemadas: number;
  proteinas_extra: number;
  recomendacion: string | null;
  created_at: string;
};

type Objetivo = "ganar_musculo" | "perder_grasa" | "mantenimiento";

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function formatNumber(n: number) {
  if (!Number.isFinite(n)) return "0";
  return String(Math.round(n));
}

function ProgressCircle({
  label,
  value,
  target,
  size,
  stroke,
  accent = "#b6f542",
}: {
  label: string;
  value: number;
  target: number;
  size: number;
  stroke: number;
  accent?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = target > 0 ? clamp01(value / target) : 0;
  const dash = c * pct;
  const gap = c - dash;

  return (
    <div className="flex items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="block">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="rgba(63,63,70,0.8)"
            strokeWidth={stroke}
            fill="transparent"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={accent}
            strokeWidth={stroke}
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${gap}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ filter: "drop-shadow(0 0 10px rgba(182,245,66,0.35))" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-sm font-semibold text-zinc-50">
            {formatNumber(value)}
          </div>
          <div className="text-[11px] text-zinc-500">/ {formatNumber(target)}</div>
        </div>
      </div>
      <div className="min-w-0">
        <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          {label}
        </div>
        <div className="mt-0.5 text-sm text-zinc-300">
          {Math.round(pct * 100)}% del objetivo
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();

  const [loadingUser, setLoadingUser] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  const [analisisSesion, setAnalisisSesion] = useState<AnalisisComida[]>([]);
  const [entrenamientosSesion, setEntrenamientosSesion] = useState<Entrenamiento[]>([]);

  const [objetivosPersonales, setObjetivosPersonales] = useState({ kcal: 2400, p: 160, c: 260, g: 75 });
  const [objetivoLabel, setObjetivoLabel] = useState<string>("");
  const [menuOpen, setMenuOpen] = useState(false);

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

      // 1. Obtener perfil
      const { data: perfil } = await supabase
        .from("perfiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!perfil) {
        router.replace("/onboarding");
        return;
      }

      // 2. Calcular macros
      const macros = calcularMacros(
        perfil.peso,
        perfil.altura,
        perfil.edad,
        perfil.sexo,
        perfil.actividad,
        perfil.objetivo
      );
      setObjetivosPersonales({
        kcal: macros.calorias,
        p: macros.proteinas,
        c: macros.carbohidratos,
        g: macros.grasas,
      });

      const objLabels: Record<string, string> = {
        ganar_musculo: "💪 Ganar músculo",
        perder_grasa: "🔥 Perder grasa",
        mantenimiento: "⚖️ Mantenimiento",
      };
      setObjetivoLabel(objLabels[perfil.objetivo] ?? perfil.objetivo);

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
      }

      // Cargar entrenamientos de hoy
      const { data: entrenamientos, error: errorEntrenamientos } = await supabase
        .from("entrenamientos")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", startOfToday.toISOString())
        .order("created_at", { ascending: false });

      if (errorEntrenamientos) {
        console.error("Error cargando entrenamientos de hoy:", errorEntrenamientos);
      } else if (entrenamientos) {
        setEntrenamientosSesion(entrenamientos);
      }

      setLoadingUser(false);
    };

    fetchUser();
  }, [router]);

  // Función para extraer proteínas del texto de recomendación
  const extraerProteinasDeTexto = (recomendacion: string | null): number => {
    if (!recomendacion) return 0;
    
    // Buscar patrones como "30g proteína", "30-40g proteína", "30-40 gramos de proteína"
    const patrones = [
      /(\d+(?:-\d+)?)\s*[g]\s*(?:de\s*)?proteína/gi,
      /(\d+(?:-\d+)?)\s*gramos\s*(?:de\s*)?proteína/gi,
      /proteína[:\s]*(\d+(?:-\d+)?)\s*[g]/gi
    ];
    
    for (const patron of patrones) {
      const coincidencias = recomendacion.match(patron);
      if (coincidencias) {
        for (const coincidencia of coincidencias) {
          const numeros = coincidencia.match(/(\d+(?:-\d+)?)/);
          if (numeros) {
            const rango = numeros[1];
            if (rango.includes('-')) {
              const [min, max] = rango.split('-').map(Number);
              return Math.round((min + max) / 2);
            } else {
              return Number(rango);
            }
          }
        }
      }
    }
    
    return 0;
  };

  const resumenDiario = useMemo(() => {
    const resumenComidas = analisisSesion.reduce(
      (acc, item) => {
        acc.calorias += item.calorias;
        acc.proteinas += item.proteinas;
        acc.carbohidratos += item.carbohidratos;
        acc.grasas += item.grasas;
        return acc;
      },
      { calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0 }
    );

    // NO sumar proteínas extra al círculo - solo para mostrar en tarjeta
    return resumenComidas;
  }, [analisisSesion]);

  // Calcular proteínas extra separadamente para la tarjeta
  const proteinasExtraEntrenamiento = useMemo(() => {
    return entrenamientosSesion.reduce(
      (acc, item) => {
        const proteinasCampo = item.proteinas_extra || 0;
        const proteinasTexto = proteinasCampo === 0 ? extraerProteinasDeTexto(item.recomendacion) : proteinasCampo;
        return acc + proteinasTexto;
      },
      0
    );
  }, [entrenamientosSesion]);

  // Calcular objetivos ajustados (sumando proteínas extra y calorías quemadas)
  const objetivosAjustados = useMemo(() => {
    const caloriasQuemadas = entrenamientosSesion.reduce(
      (acc, item) => acc + item.calorias_quemadas,
      0
    );

    return {
      kcal: objetivosPersonales.kcal + caloriasQuemadas,
      p: objetivosPersonales.p + proteinasExtraEntrenamiento,
      c: objetivosPersonales.c,
      g: objetivosPersonales.g
    };
  }, [objetivosPersonales, entrenamientosSesion, proteinasExtraEntrenamiento]);

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

  if (loadingUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-black via-zinc-950 to-zinc-900 text-zinc-50">
        <p className="text-sm text-zinc-400">Cargando tu panel de FitIA...</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-black text-zinc-50 tracking-tight bg-cover bg-center bg-no-repeat bg-fixed relative"
      style={{
        backgroundImage: 'url("https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1920")',
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
              <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-full bg-zinc-900/70 px-3 py-2 text-xs font-medium text-zinc-100">
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
              <Link href="/suplementos" className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-900/50 hover:text-zinc-100">
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
        <div className="grid gap-6">
          {/* Columna única (antes izquierda) */}
          <section className="col-span-12">
            {/* Tarjeta de objetivo */}
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                    Resumen
                  </p>
                  <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-50">
                    Dashboard de hoy
                  </h1>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#b6f542]/40 bg-[#b6f542]/10 px-4 py-2 text-sm font-semibold text-[#b6f542]">
                  {objetivoLabel}
                </div>
              </div>
            </div>

            {/* Resumen diario en círculos SVG */}
            <div className="mt-6 rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                    Resumen diario
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-zinc-50">
                    Progreso del día vs objetivo
                  </h2>
                </div>
                <p className="text-xs text-zinc-500">Hoy</p>
              </div>

              <div className="mt-5 grid gap-5 lg:grid-cols-12">
                <div className="lg:col-span-6">
                  <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-4">
                    <ProgressCircle
                      label="Calorías"
                      value={resumenDiario.calorias}
                      target={objetivosAjustados.kcal}
                      size={120}
                      stroke={12}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3 lg:col-span-6 lg:grid-cols-1">
                  <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-4">
                    <ProgressCircle
                      label="Proteínas (g)"
                      value={resumenDiario.proteinas}
                      target={objetivosAjustados.p}
                      size={100}
                      stroke={10}
                    />
                  </div>
                  <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-4">
                    <ProgressCircle
                      label="Carbohidratos (g)"
                      value={resumenDiario.carbohidratos}
                      target={objetivosAjustados.c}
                      size={100}
                      stroke={10}
                    />
                  </div>
                  <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-4">
                    <ProgressCircle
                      label="Grasas (g)"
                      value={resumenDiario.grasas}
                      target={objetivosAjustados.g}
                      size={100}
                      stroke={10}
                    />
                  </div>
                </div>
              </div>

              {/* TARJETA DE PROTEÍNAS EXTRA DE ENTRENAMIENTO */}
              {entrenamientosSesion.length > 0 && (
                <div className="mt-6 rounded-2xl border border-[#b6f542]/50 bg-[#b6f542]/5 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#b6f542]/20">
                      <span className="text-sm text-[#b6f542]">💪</span>
                    </div>
                    <h3 className="text-lg font-semibold text-zinc-50">Ajuste por entrenamiento</h3>
                  </div>
                  
                  <div className="text-sm text-zinc-200 leading-relaxed">
                    {(() => {
                      const sesionesCount = entrenamientosSesion.length;
                      const caloriasQuemadas = entrenamientosSesion.reduce(
                        (acc, item) => acc + item.calorias_quemadas,
                        0
                      );
                      
                      return (
                        <div>
                          <p className="mb-2">
                            💪 <span className="font-semibold text-[#b6f542]">+{formatNumber(proteinasExtraEntrenamiento)}g proteína añadidos a tu objetivo de hoy</span> por tu entrenamiento
                          </p>
                          {caloriasQuemadas > 0 && (
                            <p className="text-xs text-zinc-400">
                              🔥 Quemaste {formatNumber(caloriasQuemadas)} kcal en {sesionesCount === 1 ? 'tu entrenamiento' : 'tus entrenamientos'} de hoy
                            </p>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
