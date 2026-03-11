import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-zinc-900 text-zinc-50">
      {/* Header */}
      <header className="border-b border-zinc-800/80 bg-black/40 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 md:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#b6f542]/10 ring-1 ring-[#b6f542]/40">
              <span className="text-lg font-semibold text-[#b6f542]">F</span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-lg font-semibold tracking-tight">FitIA</span>
              <span className="text-xs text-zinc-500">
                Tu nutricionista IA para deportistas
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden rounded-full border border-zinc-700/80 px-4 py-2 text-sm font-medium text-zinc-100 shadow-sm transition hover:border-[#b6f542]/70 hover:bg-[#b6f542]/10 md:inline-flex"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full bg-[#b6f542] px-4 py-2 text-sm font-semibold text-black shadow-[0_0_30px_rgba(182,245,66,0.35)] transition hover:bg-[#c8ff62] md:px-5 md:text-base"
            >
              Empezar gratis
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="mx-auto max-w-6xl px-6 pb-20 pt-10 md:flex md:items-center md:gap-16 md:px-8 md:pt-16 lg:pt-20">
        <section className="md:w-1/2">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800/80 bg-zinc-900/70 px-3 py-1 text-xs font-medium text-zinc-300 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[#b6f542]" />
            Nutrición deportiva personalizada con IA
          </div>

          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl lg:text-6xl">
            Convierte tus fotos de comida en{" "}
            <span className="bg-gradient-to-r from-[#b6f542] to-emerald-300 bg-clip-text text-transparent">
              rendimiento medible
            </span>
            .
          </h1>

          <p className="mt-5 max-w-xl text-base text-zinc-400 sm:text-lg">
            FitIA analiza tus platos, calcula macros al instante y diseña un plan
            inteligente para que rindas más en cada entrenamiento. Todo en
            español, adaptado a tu deporte y a tu día a día.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full bg-[#b6f542] px-6 py-3 text-sm font-semibold text-black shadow-[0_0_35px_rgba(182,245,66,0.45)] transition hover:bg-[#c8ff62] sm:text-base"
            >
              Empezar gratis
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full border border-zinc-700/80 px-5 py-3 text-sm font-medium text-zinc-100 transition hover:border-[#b6f542]/70 hover:bg-zinc-900/70"
            >
              Iniciar sesión
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-zinc-500 sm:text-sm">
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              3 fotos y 5 mensajes al día gratis
            </span>
            <span className="h-3 w-px bg-zinc-700/80" />
            <span>Sin tarjeta de crédito · Cancela cuando quieras</span>
          </div>
        </section>

        {/* Visual mockup */}
        <section className="mt-12 md:mt-0 md:w-1/2">
          <div className="relative">
            <div className="pointer-events-none absolute -inset-16 -z-10 bg-[radial-gradient(circle_at_top,_rgba(182,245,66,0.16),_transparent_60%),radial-gradient(circle_at_bottom,_rgba(59,130,246,0.18),_transparent_55%)] opacity-90" />

            <div className="rounded-3xl border border-zinc-800/80 bg-zinc-950/80 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.85)] backdrop-blur">
              <div className="flex items-center justify-between rounded-2xl bg-zinc-900/80 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-xs font-medium text-zinc-200">
                    Análisis de comida
                  </span>
                </div>
                <span className="text-[11px] text-zinc-500">Foto · 3 s</span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-zinc-300">
                <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/70 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                    Macros estimados
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-[#b6f542]">
                    725 kcal
                  </p>
                  <div className="mt-3 space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span>Proteínas</span>
                      <span className="font-medium text-zinc-100">42 g</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Carbohidratos</span>
                      <span className="font-medium text-zinc-100">81 g</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Grasas</span>
                      <span className="font-medium text-zinc-100">21 g</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col justify-between rounded-2xl border border-zinc-800/80 bg-zinc-900/70 p-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                      Chat nutricionista IA
                    </p>
                    <p className="mt-2 text-[13px] text-zinc-200">
                      “Añade 20 g de proteína en la cena para llegar a tu
                      objetivo diario.”
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500">
                    <span>Respuestas en menos de 5 s</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/70 p-3">
                <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                  Resumen diario
                </p>
                <div className="mt-3 grid grid-cols-3 gap-3 text-[11px] text-zinc-300">
                  <div>
                    <p className="text-zinc-500">Proteínas</p>
                    <p className="mt-1 text-lg font-semibold text-zinc-100">
                      128 g
                    </p>
                    <p className="mt-0.5 text-emerald-400">+6 g objetivo</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Carbohidratos</p>
                    <p className="mt-1 text-lg font-semibold text-zinc-100">
                      231 g
                    </p>
                    <p className="mt-0.5 text-zinc-400">OK</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Grasas</p>
                    <p className="mt-1 text-lg font-semibold text-zinc-100">
                      58 g
                    </p>
                    <p className="mt-0.5 text-amber-300">Ligeramente alto</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Features */}
      <section className="border-t border-zinc-800/80 bg-black/40">
        <div className="mx-auto max-w-6xl px-6 py-12 md:px-8 md:py-14">
          <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
                Todo lo que necesitas para comer como un atleta.
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-zinc-400 sm:text-base">
                Desde la foto de tu plato hasta el seguimiento de tus macros,
                FitIA te acompaña en cada comida y cada entrenamiento.
              </p>
            </div>
            <p className="text-xs text-zinc-500 sm:text-sm">
              Plan gratuito con límite diario. Pásate a Pro cuando quieras.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {/* Feature 1 */}
            <div className="group rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-5 shadow-sm transition hover:border-[#b6f542]/60 hover:shadow-[0_18px_55px_rgba(0,0,0,0.85)]">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#b6f542]/10 text-[#b6f542] ring-1 ring-[#b6f542]/40">
                <span className="text-lg">📷</span>
              </div>
              <h3 className="mt-4 text-base font-semibold text-zinc-50">
                De foto a macros en segundos
              </h3>
              <p className="mt-2 text-sm text-zinc-400">
                Haz una foto a tu comida y deja que la IA estime calorías,
                proteínas, carbohidratos y grasas con precisión orientada al
                rendimiento deportivo.
              </p>
              <p className="mt-3 text-xs font-medium text-zinc-500">
                Hasta 3 fotos al día en el plan gratuito.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-5 shadow-sm transition hover:border-[#b6f542]/60 hover:shadow-[0_18px_55px_rgba(0,0,0,0.85)]">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#b6f542]/10 text-[#b6f542] ring-1 ring-[#b6f542]/40">
                <span className="text-lg">💬</span>
              </div>
              <h3 className="mt-4 text-base font-semibold text-zinc-50">
                Chat con tu nutricionista IA
              </h3>
              <p className="mt-2 text-sm text-zinc-400">
                Pregunta en español todo lo que quieras: timing de comidas,
                suplementos, ajustes para competir o para definir. Respuestas
                adaptadas a tu deporte, nivel y objetivos.
              </p>
              <p className="mt-3 text-xs font-medium text-zinc-500">
                5 mensajes diarios incluidos en el plan gratuito.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-5 shadow-sm transition hover:border-[#b6f542]/60 hover:shadow-[0_18px_55px_rgba(0,0,0,0.85)]">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#b6f542]/10 text-[#b6f542] ring-1 ring-[#b6f542]/40">
                <span className="text-lg">📈</span>
              </div>
              <h3 className="mt-4 text-base font-semibold text-zinc-50">
                Dashboard de progreso diario
              </h3>
              <p className="mt-2 text-sm text-zinc-400">
                Visualiza tus macros, calorías y adherencia a tu plan de forma
                clara. Identifica patrones, días fuertes y días flojos para
                optimizar tu rendimiento.
              </p>
              <p className="mt-3 text-xs font-medium text-zinc-500">
                Preparado para sincronizarse con tu app de entreno.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-zinc-800/80 bg-zinc-950">
        <div className="mx-auto max-w-6xl px-6 py-12 md:px-8 md:py-14">
          <div className="text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
              Elige tu plan FitIA
            </h2>
            <p className="mt-2 text-sm text-zinc-400 sm:text-base">
              Empieza gratis y pasa a Pro solo si FitIA te ayuda a rendir más.
            </p>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {/* Free */}
            <div className="flex flex-col justify-between rounded-2xl border border-zinc-800/80 bg-zinc-950/80 p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Free
                </p>
                <p className="mt-2 text-3xl font-semibold text-zinc-50">0 €</p>
                <p className="mt-1 text-xs text-zinc-500">para siempre</p>
                <ul className="mt-4 space-y-2 text-sm text-zinc-300">
                  <li>• 3 fotos de comida al día</li>
                  <li>• 5 mensajes diarios con la IA</li>
                  <li>• Dashboard básico de macros</li>
                  <li>• Sin tarjeta de crédito</li>
                </ul>
              </div>
              <Link
                href="/login"
                className="mt-6 inline-flex items-center justify-center rounded-full border border-zinc-700/80 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:border-[#b6f542]/70 hover:bg-[#b6f542]/10"
              >
                Empezar gratis
              </Link>
            </div>

            {/* Pro */}
            <div className="flex flex-col justify-between rounded-2xl border border-[#b6f542]/70 bg-gradient-to-b from-[#b6f542]/10 via-zinc-950 to-zinc-950 p-6 shadow-[0_0_45px_rgba(182,245,66,0.25)]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#b6f542]">
                  Pro
                </p>
                <p className="mt-2 text-3xl font-semibold text-zinc-50">
                  6,99 €{" "}
                  <span className="align-middle text-sm font-normal text-zinc-400">
                    / mes
                  </span>
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  para deportistas que quieren datos serios
                </p>
                <ul className="mt-4 space-y-2 text-sm text-zinc-200">
                  <li>• Fotos y mensajes ilimitados</li>
                  <li>• Tendencias semanales y mensuales</li>
                  <li>• Recomendaciones avanzadas de timing y cargas</li>
                  <li>• Soporte prioritario</li>
                </ul>
              </div>
              <Link
                href="/login"
                className="mt-6 inline-flex items-center justify-center rounded-full bg-[#b6f542] px-4 py-2 text-sm font-semibold text-black shadow-[0_0_35px_rgba(182,245,66,0.5)] transition hover:bg-[#c8ff62]"
              >
                Probar Pro
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 bg-black/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-5 text-xs text-zinc-500 md:flex-row md:px-8">
          <p>© {new Date().getFullYear()} FitIA. Todos los derechos reservados.</p>
          <div className="flex gap-4">
            <span>Hecho para deportistas españoles.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
