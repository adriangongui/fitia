"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface HeaderProps {
  userEmail: string | null;
  userName: string | null;
}

export default function Header({ userEmail, userName }: HeaderProps) {
  const router = useRouter();
  const [masAbierto, setMasAbierto] = useState(false);
  const [avatarAbierto, setAvatarAbierto] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const nombreCorto = userName || userEmail?.split("@")[0] || "deportista";
  const avatarInicial = userEmail?.trim().slice(0, 1).toUpperCase() || "U";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  // Cerrar dropdowns al hacer click fuera
  useEffect(() => {
    const handleClickOutside = () => { 
      setMasAbierto(false); 
      setAvatarAbierto(false);
      setMobileMenuOpen(false);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleMasClick = (e: React.MouseEvent) => {
    console.log("handleMasClick llamado - masAbierto:", masAbierto);
    e.stopPropagation();
    setMasAbierto(!masAbierto);
    setAvatarAbierto(false);
  };

  const handleAvatarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAvatarAbierto(!avatarAbierto);
    setMasAbierto(false);
  };

  return (
    <header className="relative z-[9999] border-b border-zinc-800/80 bg-black/40 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4 md:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex items-center gap-2 cursor-default">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#b6f542]/10 ring-1 ring-[#b6f542]/40">
              <span className="text-lg font-semibold text-[#b6f542]">F</span>
            </div>
            <Link href="/" className="text-lg font-semibold tracking-tight">FitIA</Link>
          </div>

          {/* Navegación Desktop */}
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
            
            {/* Menú "Más" dropdown */}
            <div className="relative">
              <button
                onClick={handleMasClick}
                className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-900/50 hover:text-zinc-100"
              >
                Más
                <span className={`text-xs transition-transform duration-200 ${masAbierto ? 'rotate-180' : ''}`}>▼</span>
              </button>
              
              {masAbierto && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl border border-zinc-800 bg-zinc-950 p-1 shadow-xl z-[9999]">
                  <Link href="/suplementos" className="flex w-full items-center rounded-lg px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-900/50 hover:text-zinc-100">
                    <span aria-hidden className="text-sm mr-2">💊</span> Suplementos
                  </Link>
                  <Link href="/historial" className="flex w-full items-center rounded-lg px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-900/50 hover:text-zinc-100">
                    <span aria-hidden className="text-sm mr-2">📊</span> Historial
                  </Link>
                  <Link href="/plan-semanal" className="flex w-full items-center rounded-lg px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-900/50 hover:text-zinc-100">
                    <span aria-hidden className="text-sm mr-2">📅</span> Plan Semanal
                  </Link>
                </div>
              )}
            </div>
          </nav>

          {/* Menú móvil hamburguesa */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMobileMenuOpen(!mobileMenuOpen);
            }}
            className="flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-900/50 hover:text-zinc-100 sm:hidden"
          >
            <span className="text-lg">☰</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-xs text-zinc-400">
              Hola, <span className="font-semibold text-zinc-100">{nombreCorto}</span>
            </p>
            <p className="text-[11px] text-zinc-500">{userEmail ?? "Usuario"}</p>
          </div>
          
          {/* Avatar Dropdown */}
          <div className="relative">
            <button
              onClick={handleAvatarClick}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#b6f542]/10 text-sm font-semibold text-[#b6f542] ring-1 ring-[#b6f542]/40 transition hover:bg-[#b6f542]/20"
            >
              {avatarInicial}
            </button>
            {avatarAbierto && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl border border-zinc-800 bg-zinc-950 p-1 shadow-xl z-[9999]">
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

      {/* Menú móvil desplegable */}
      {mobileMenuOpen && (
        <div className="absolute top-full left-0 mt-2 w-48 rounded-xl border border-zinc-800 bg-zinc-950 p-1 shadow-xl z-[9999] sm:hidden">
          <Link href="/dashboard" className="flex w-full items-center rounded-lg px-3 py-2 text-xs font-medium text-zinc-100 bg-zinc-900/50">
            <span aria-hidden className="text-sm mr-2">⬚</span> Dashboard
          </Link>
          <Link href="/chat" className="flex w-full items-center rounded-lg px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-900/50 hover:text-zinc-100">
            <span aria-hidden className="text-sm mr-2">✦</span> Chat Asistente
          </Link>
          <Link href="/ingresar" className="flex w-full items-center rounded-lg px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-900/50 hover:text-zinc-100">
            <span aria-hidden className="text-sm mr-2">➕</span> Ingresar Comida
          </Link>
          <Link href="/entrenamiento" className="flex w-full items-center rounded-lg px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-900/50 hover:text-zinc-100">
            <span aria-hidden className="text-sm mr-2">🏋️</span> Entrenamiento
          </Link>
          <Link href="/suplementos" className="flex w-full items-center rounded-lg px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-900/50 hover:text-zinc-100">
            <span aria-hidden className="text-sm mr-2">💊</span> Suplementos
          </Link>
          <Link href="/historial" className="flex w-full items-center rounded-lg px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-900/50 hover:text-zinc-100">
            <span aria-hidden className="text-sm mr-2">📊</span> Historial
          </Link>
          <Link href="/plan-semanal" className="flex w-full items-center rounded-lg px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-900/50 hover:text-zinc-100">
            <span aria-hidden className="text-sm mr-2">📅</span> Plan Semanal
          </Link>
        </div>
      )}
    </header>
  );
}
