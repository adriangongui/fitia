"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLoginWithGoogle = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/dashboard`
              : undefined,
        },
      });

      if (error) {
        console.error(error);
        setErrorMessage("Ha ocurrido un error al iniciar sesión con Google.");
        setLoading(false);
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("Ha ocurrido un error inesperado. Inténtalo de nuevo.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-black via-zinc-950 to-zinc-900 text-zinc-50">
      <div className="mx-4 w-full max-w-md rounded-3xl border border-zinc-800/80 bg-zinc-950/80 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.9)] backdrop-blur">
        {/* Logo */}
        <div className="mb-6 flex items-center justify-center gap-2">
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
        </div>

        <h1 className="text-xl font-semibold tracking-tight text-zinc-50 sm:text-2xl">
          Inicia sesión para empezar
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Usa tu cuenta de Google para guardar tu progreso, fotos y conversación
          con tu nutricionista IA.
        </p>

        <button
          onClick={handleLoginWithGoogle}
          disabled={loading}
          className="mt-6 flex w-full items-center justify-center gap-3 rounded-full bg-[#b6f542] px-4 py-3 text-sm font-semibold text-black shadow-[0_0_35px_rgba(182,245,66,0.5)] transition hover:bg-[#c8ff62] disabled:cursor-not-allowed disabled:opacity-70"
        >
          <span className="text-lg">🔐</span>
          <span>{loading ? "Conectando con Google..." : "Continuar con Google"}</span>
        </button>

        <p className="mt-3 text-center text-xs text-zinc-500">
          3 fotos y 5 mensajes gratis cada día.
        </p>

        {errorMessage && (
          <p className="mt-4 text-center text-xs text-red-400">{errorMessage}</p>
        )}

        <p className="mt-6 text-center text-[11px] text-zinc-500">
          Al continuar aceptas que FitIA utilice tus datos de forma anónima para
          mejorar las recomendaciones nutricionales. Puedes borrar tu cuenta en
          cualquier momento.
        </p>
      </div>
    </div>
  );
}

