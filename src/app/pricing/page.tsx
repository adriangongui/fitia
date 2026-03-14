"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";

export default function PricingPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();
  }, []);

  const handleStartFree = () => {
    router.push("/dashboard");
  };

  const handleGoPro = async () => {
    if (!user) {
      router.push("/login");
      return;
    }

    try {
      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          price_id: "price_1OABkZ3Z0hL3X5K9r2a", // Price ID para plan Pro
        }),
      });

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error("Error creating checkout:", error);
      alert("Error al procesar el pago. Inténtalo de nuevo.");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-black via-zinc-950 to-zinc-900 text-zinc-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#b6f542] border-t-transparent"></div>
          <p className="mt-4 text-zinc-400">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-zinc-900">
      <Header userEmail={user?.email} userName={user?.user_metadata?.name} />
      
      <main className="mx-auto max-w-6xl px-6 py-12 md:px-8">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-zinc-50 mb-4">
            Planes <span className="text-[#b6f542]">FitIA</span>
          </h1>
          <p className="text-xl text-zinc-400 mb-12 max-w-2xl mx-auto">
            Elige el plan perfecto para alcanzar tus objetivos nutricionales y de fitness
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {/* Plan Free */}
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-[#b6f542] text-black text-xs font-bold px-3 py-1 rounded-bl-lg">
              GRATIS
            </div>
            
            <h3 className="text-2xl font-bold text-zinc-50 mb-4">Plan Free</h3>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-[#b6f542]/20 flex items-center justify-center">
                  <svg className="w-3 h-3 text-[#b6f542]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010-1.414l-8-8a1 1 0 00-1.414 0l-8 8a1 1 0 001.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-zinc-300">Análisis de fotos de comidas</span>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-[#b6f542]/20 flex items-center justify-center">
                  <svg className="w-3 h-3 text-[#b6f542]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010-1.414l-8-8a1 1 0 00-1.414 0l-8 8a1 1 0 001.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-zinc-300">Chat con IA nutricional</span>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-[#b6f542]/20 flex items-center justify-center">
                  <svg className="w-3 h-3 text-[#b6f542]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010-1.414l-8-8a1 1 0 00-1.414 0l-8 8a1 1 0 001.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-zinc-300">Seguimiento nutricional básico</span>
              </div>
            </div>

            <div className="border-t border-zinc-800 pt-8">
              <div className="text-3xl font-bold text-zinc-50 mb-2">€0</div>
              <div className="text-zinc-400">para siempre</div>
            </div>

            <button
              onClick={handleStartFree}
              className="w-full rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold py-4 transition-colors"
            >
              Empezar gratis
            </button>
          </div>

          {/* Plan Pro */}
          <div className="rounded-3xl border-2 border-[#b6f542] bg-gradient-to-br from-[#b6f542]/10 to-[#b6f542]/5 p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-[#b6f542] text-black text-xs font-bold px-3 py-1 rounded-bl-lg shadow-[0_0_20px_rgba(182,245,66,0.3)]">
              PRO
            </div>
            
            <h3 className="text-2xl font-bold text-zinc-50 mb-4">Plan Pro</h3>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-[#b6f542] flex items-center justify-center">
                  <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010-1.414l-8-8a1 1 0 00-1.414 0l-8 8a1 1 0 001.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-zinc-300">Análisis ilimitado de comidas</span>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-[#b6f542] flex items-center justify-center">
                  <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010-1.414l-8-8a1 1 0 00-1.414 0l-8 8a1 1 0 001.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-zinc-300">Chat ilimitado con IA</span>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-[#b6f542] flex items-center justify-center">
                  <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010-1.414l-8-8a1 1 0 00-1.414 0l-8 8a1 1 0 001.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-zinc-300">Seguimiento avanzado</span>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-[#b6f542] flex items-center justify-center">
                  <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010-1.414l-8-8a1 1 0 00-1.414 0l-8 8a1 1 0 001.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-zinc-300">Soporte prioritario</span>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-[#b6f542] flex items-center justify-center">
                  <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010-1.414l-8-8a1 1 0 00-1.414 0l-8 8a1 1 0 001.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-zinc-300">Acceso anticipado a nuevas funciones</span>
              </div>
            </div>

            <div className="border-t border-[#b6f542]/30 pt-8">
              <div className="text-3xl font-bold text-zinc-50 mb-2">€6,99</div>
              <div className="text-zinc-400">al mes</div>
              <div className="text-sm text-[#b6f542] mt-2">Ahorra 2 meses con pago anual</div>
            </div>

            <button
              onClick={handleGoPro}
              className="w-full rounded-xl bg-[#b6f542] hover:bg-[#c8ff62] text-black font-semibold py-4 transition-all transform hover:scale-105 shadow-[0_0_30px_rgba(182,245,66,0.4)]"
            >
              Hacerse Pro
            </button>
          </div>
        </div>

        <div className="text-center mt-16">
          <p className="text-zinc-500 text-sm mb-4">
            Cancela en cualquier momento. Sin compromisos.
          </p>
          <div className="flex justify-center gap-8 text-sm text-zinc-400">
            <a href="/terms" className="hover:text-[#b6f542] transition-colors">Términos de servicio</a>
            <span className="text-zinc-600">•</span>
            <a href="/privacy" className="hover:text-[#b6f542] transition-colors">Política de privacidad</a>
          </div>
        </div>
      </main>
    </div>
  );
}
