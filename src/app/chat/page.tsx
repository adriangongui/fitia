"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ChatPage() {
  const router = useRouter();

  const [loadingUser, setLoadingUser] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [nombre, setNombre] = useState<string>("");
  const [menuOpen, setMenuOpen] = useState(false);

  // Manual chat state
  const [messages, setMessages] = useState<{ id: string; role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !userId) return;

    // Update local state optimistic
    const userMessage = { id: Date.now().toString(), role: "user" as const, content: input.trim() };
    const newMessages = [...messages, userMessage];
    
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, userId }),
      });

      if (!res.ok) {
        throw new Error("Error en la respuesta del servidor");
      }

      const data = await res.json();
      
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant" as const,
        content: data.reply || "",
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error(error);
      alert("Error al enviar el mensaje. Inténtalo de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

      const { data: perfil } = await supabase
        .from("perfiles")
        .select("nombre")
        .eq("user_id", user.id)
        .single();

      if (perfil?.nombre) {
        setNombre(perfil.nombre);
      }

      // Cargar historial de chat
      const { data: historial } = await supabase
        .from("mensajes_chat")
        .select("id, role, content")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(50);

      if (historial && historial.length > 0) {
        setMessages(historial as any);
      }

      setLoadingUser(false);
    };

    fetchUser();
  }, [router]);

  const nombreCorto = useMemo(() => {
    if (nombre) return nombre;
    const base = (email ?? "deportista").split("@")[0] ?? "deportista";
    const clean = base.replace(/[._-]+/g, " ").trim();
    const first = clean.split(" ").filter(Boolean)[0] ?? base;
    return first.length > 0 ? first[0].toUpperCase() + first.slice(1) : "Deportista";
  }, [email, nombre]);

  const avatarInicial = useMemo(() => {
    const s = nombreCorto.trim();
    return s.length ? s[0].toUpperCase() : "U";
  }, [nombreCorto]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  if (loadingUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-black via-zinc-950 to-zinc-900 text-zinc-50">
        <p className="text-sm text-zinc-400">Verificando sesión...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen relative text-zinc-50 tracking-tight overflow-hidden">
      {/* Abstract Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-zinc-950 to-zinc-900 z-0"></div>
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-[#b6f542]/20 rounded-full blur-[150px] mix-blend-screen"></div>
        <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] bg-[#b6f542]/10 rounded-full blur-[200px] mix-blend-screen"></div>
        {/* Abstract geometric lines */}
        <svg className="absolute w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <path d="M-100 200 Q 300 100 800 500 T 2000 300" fill="none" stroke="rgba(182,245,66,0.15)" strokeWidth="1" />
          <path d="M-100 400 Q 400 600 900 200 T 2000 800" fill="none" stroke="rgba(182,245,66,0.1)" strokeWidth="2" />
          <path d="M500 -100 Q 700 400 400 900" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
          <circle cx="80%" cy="20%" r="300" stroke="rgba(255,255,255,0.02)" strokeWidth="1" fill="none" />
          <circle cx="20%" cy="80%" r="400" stroke="rgba(182,245,66,0.03)" strokeWidth="1" fill="none" />
        </svg>
      </div>
      
      {/* HEADER */}
      <header className="flex-none border-b border-zinc-800/80 bg-black/40 backdrop-blur z-10 sticky top-0">
        <div className="mx-auto flex max-w-4xl w-full items-center justify-between gap-4 px-6 py-4 md:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex items-center gap-2 cursor-default">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#b6f542]/10 ring-1 ring-[#b6f542]/40">
                <span className="text-lg font-semibold text-[#b6f542]">F</span>
              </div>
              <span className="text-lg font-semibold tracking-tight hidden sm:inline-block">FitIA</span>
            </div>

            <nav className="hidden xl:flex items-center gap-1 rounded-full border border-zinc-800/80 bg-zinc-950/50 p-1 md:flex">
              <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-900/50 hover:text-zinc-100">
                <span aria-hidden className="text-sm">⬚</span> Dashboard
              </Link>
              <Link href="/chat" className="inline-flex items-center gap-2 rounded-full bg-zinc-900/70 px-3 py-2 text-xs font-medium text-zinc-100">
                <span aria-hidden className="text-sm">✦</span> Chat Asistente
              </Link>
              <Link href="/ingresar" className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-900/50 hover:text-zinc-100">
                <span aria-hidden className="text-sm">➕</span> Ingresar Comida
              </Link>
            </nav>
            {/* Nav Móvil minimizado */}
            <nav className="flex items-center gap-1 xl:hidden md:hidden">
              <Link href="/dashboard" className="p-2 text-zinc-400 hover:text-zinc-100">⬚</Link>
              <Link href="/chat" className="p-2 text-[#b6f542]">✦</Link>
              <Link href="/ingresar" className="p-2 text-zinc-400 hover:text-zinc-100">➕</Link>
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
                    Mi perfil / Opciones
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

      {/* CHAT AREA */}
      <main className="flex-1 overflow-hidden flex flex-col mx-auto w-full max-w-4xl relative">
        <div className="flex-1 overflow-y-auto px-6 py-6 md:px-8 custom-scrollbar pb-32">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#b6f542]/10 ring-1 ring-[#b6f542]/40 mb-6">
                <span className="text-3xl">✦</span>
              </div>
              <h2 className="text-xl font-semibold mb-2">Nutricionista FitIA a tu servicio</h2>
              <p className="text-sm text-zinc-400">
                Pregúntame sobre tus macros, opciones de comidas, rutinas de suplementación, o pide consejos sobre tu plan deportivo.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-5 py-3.5 text-sm ${message.role === "user"
                        ? "bg-[#b6f542] text-black rounded-br-none shadow-[0_4px_14px_rgba(182,245,66,0.15)]"
                        : "bg-zinc-900/80 border border-zinc-800/80 text-zinc-200 rounded-bl-none shadow-sm"
                      }`}
                  >
                    {message.role !== "user" && (
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex h-5 w-5 items-center justify-center rounded bg-[#b6f542]/20 text-[#b6f542]">
                          <span className="text-[10px]">✦</span>
                        </div>
                        <span className="text-xs font-semibold text-zinc-400">FitIA</span>
                      </div>
                    )}
                    <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* INPUT AREA */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-zinc-950/90 to-transparent pt-12 pb-6 px-6 md:px-8">
          <div className="max-w-3xl mx-auto backdrop-blur-md bg-zinc-950/50 rounded-full border border-zinc-800/80 p-2 shadow-2xl">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <input
                className="flex-1 bg-transparent px-4 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none"
                placeholder="Escribe tu pregunta sobre nutrición o deporte..."
                value={input}
                onChange={handleInputChange}
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#b6f542] text-black transition hover:bg-[#c8ff62] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(182,245,66,0.25)]"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-4 h-4 translate-x-px"
                >
                  <path d="M22 2L11 13" />
                  <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(63, 63, 70, 0.4);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(63, 63, 70, 0.8);
        }
      `}</style>
    </div>
  );
}
