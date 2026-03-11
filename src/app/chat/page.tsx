"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

function generateUUID() {
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
    (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
  );
}

type Conversation = {
  id: string;
  title: string;
  created_at: string;
};

export default function ChatPage() {
  const router = useRouter();

  const [loadingUser, setLoadingUser] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [nombre, setNombre] = useState<string>("");
  const [menuOpen, setMenuOpen] = useState(false);

  // Chat History Management
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);

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

    const currentInput = input.trim();
    // Ensure we have a conversationId for the initial message
    const activeConvId = conversationId || generateUUID();

    // Update local state optimistic
    const userMessage = { id: Date.now().toString(), role: "user" as const, content: currentInput };
    const newMessages = [...messages, userMessage];
    
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    // If this is the very first message of a new conversation, map it in the sidebar
    if (!conversationId) {
      setConversationId(activeConvId);
      localStorage.setItem("fitia_chat_conversation_id", activeConvId);
      setConversations(prev => [{
        id: activeConvId,
        title: "Generando título...",
        created_at: new Date().toISOString()
      }, ...prev]);

      // Async title generation for the first message
      fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: `Resume en máximo 5 palabras de qué trata esta conversación: user: ${currentInput}` }],
          isTitleRequest: true,
        }),
      }).then(res => res.json()).then(data => {
         if (data.reply) {
           setConversations(prev => prev.map(c => c.id === activeConvId ? { ...c, title: data.reply } : c));
         }
      }).catch(console.error);
    }

    try {
      // Guardar mensaje del usuario en base de datos
      const userMessageData = {
        user_id: userId,
        conversation_id: activeConvId,
        role: "user",
        content: currentInput,
      };
      console.log("Guardando mensaje:", userMessageData);
      await supabase.from("mensajes_chat").insert([userMessageData]);

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, userId, conversationId: activeConvId }),
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

      // Guardar respuesta del asistente en la base de datos
      const assistantMessageData = {
        user_id: userId,
        conversation_id: activeConvId,
        role: "assistant",
        content: assistantMessage.content,
      };
      console.log("Guardando mensaje:", assistantMessageData);
      await supabase.from("mensajes_chat").insert([assistantMessageData]);

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

      const savedConvId = localStorage.getItem("fitia_chat_conversation_id");

      // Cargar panel lateral de conversaciones ("Historial") buscando el primer mensaje por conversation_id
      const { data: convData } = await supabase
        .from("mensajes_chat")
        .select("conversation_id, content, created_at, role")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }); 

      if (convData && convData.length > 0) {
        // Group by conversation_id to get messages
        const convosMap = new Map<string, { id: string; created_at: string; messages: any[] }>();
        for (const msg of convData) {
          if (msg.conversation_id) {
            if (!convosMap.has(msg.conversation_id)) {
              convosMap.set(msg.conversation_id, {
                id: msg.conversation_id,
                created_at: msg.created_at,
                messages: []
              });
            }
            convosMap.get(msg.conversation_id)!.messages.push(msg);
          }
        }
        
        // Convert map back to array and order nicely DESC
        const loadedConversations = Array.from(convosMap.values())
          .sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .map(c => ({
            id: c.id,
            title: "Cargando título...", // Placeholder
            created_at: c.created_at,
            _rawMessages: c.messages.slice(0, 3) // Store first 3 context messages
          }));
        
        setConversations(loadedConversations);

        // Fetch titles asynchronously for those that have messages
        loadedConversations.forEach(async (conv) => {
          if (conv._rawMessages.length === 0) {
            setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, title: "Nueva Conversación" } : c));
            return;
          }

          try {
            const promptContext = conv._rawMessages.map((m: any) => `${m.role}: ${m.content}`).join(" | ");
            const res = await fetch("/api/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                messages: [{ role: "user", content: `Resume en máximo 5 palabras de qué trata esta conversación: ${promptContext}` }],
                isTitleRequest: true,
              }),
            });
            if (res.ok) {
              const data = await res.json();
              setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, title: data.reply || "Chat FitIA" } : c));
            }
          } catch (e) {
            setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, title: "Chat FitIA" } : c));
          }
        });

        // Load most recent active conversation automatically
        if (loadedConversations.length > 0) {
          const targetId = savedConvId && loadedConversations.some(c => c.id === savedConvId)
                           ? savedConvId 
                           : loadedConversations[0].id;
          await loadConversation(targetId);
        }
      }

      setLoadingUser(false);
    };

    fetchUser();
  }, [router]);

  const loadConversation = async (id: string) => {
    // If it's already loading or we're creating a new one, handle here
    setConversationId(id);
    localStorage.setItem("fitia_chat_conversation_id", id);
    setSidebarOpen(false); // Mobile UX
    
    const { data: historial } = await supabase
      .from("mensajes_chat")
      .select("id, role, content")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });

    if (historial && historial.length > 0) {
      setMessages(historial as any);
    } else {
      setMessages([]);
    }
  };

  const createNewConversation = () => {
    setConversationId(null);
    localStorage.removeItem("fitia_chat_conversation_id");
    setMessages([]);
    setSidebarOpen(false);
  };

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
    <div className="flex flex-col min-h-screen relative overflow-hidden bg-black text-zinc-50 tracking-tight">
      {/* Abstract Background - Vibes Coloridas & Energía Deportiva */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Gradientes más profundos de fondo */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#182a10_0%,#000000_70%)] opacity-80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_80%,#0a192f_0%,#000000_60%)] opacity-60" />
        
        {/* Resplandores abstractos coloridos */}
        <div className="absolute -top-[10%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-[#b6f542]/10 blur-[130px] mix-blend-screen" />
        <div className="absolute top-[30%] right-[5%] w-[40vw] h-[40vw] rounded-full bg-[#f97316]/10 blur-[120px] mix-blend-screen" />
        <div className="absolute -bottom-[20%] left-[20%] w-[60vw] h-[60vw] rounded-full bg-[#3b82f6]/10 blur-[150px] mix-blend-screen" />

        {/* Formas geométricas / Líneas de energía (SVG) */}
        <svg className="absolute w-full h-full opacity-40" xmlns="http://www.w3.org/2000/svg">
          {/* Ondas sinuosas que representan fluidez y movimiento */}
          <path d="M-100 150 C 300 300 600 0 1000 150 S 1600 300 2000 150" fill="none" stroke="rgba(182,245,66,0.2)" strokeWidth="1.5" />
          <path d="M-100 200 C 400 350 700 50 1100 200 S 1700 350 2000 200" fill="none" stroke="rgba(59,130,246,0.15)" strokeWidth="1.5" />
          <path d="M-100 250 C 500 400 800 100 1200 250 S 1800 400 2000 250" fill="none" stroke="rgba(249,115,22,0.15)" strokeWidth="1" />
          
          {/* Diagonales veloces (dinamismo, deporte) */}
          <line x1="0%" y1="100%" x2="40%" y2="0%" stroke="rgba(182,245,66,0.08)" strokeWidth="1.5" />
          <line x1="20%" y1="100%" x2="60%" y2="0%" stroke="rgba(59,130,246,0.06)" strokeWidth="2" />
          <line x1="60%" y1="100%" x2="100%" y2="0%" stroke="rgba(249,115,22,0.06)" strokeWidth="1" />
          
          {/* Círculos concéntricos (foco, precisión) */}
          <circle cx="85%" cy="30%" r="200" stroke="rgba(249,115,22,0.08)" strokeWidth="1.5" fill="none" strokeDasharray="4 6" />
          <circle cx="85%" cy="30%" r="300" stroke="rgba(59,130,246,0.05)" strokeWidth="1" fill="none" />
          <circle cx="10%" cy="80%" r="400" stroke="rgba(182,245,66,0.05)" strokeWidth="1" fill="none" />
        </svg>
      </div>
      
      {/* HEADER */}
      <header className="flex-none border-b border-zinc-800/80 bg-black/40 backdrop-blur z-20 sticky top-0">
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

      {/* BOTÓN FLOTANTE HISTORIAL */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-[90px] right-0 z-30 flex cursor-pointer items-center gap-2 rounded-l-2xl border border-r-0 border-zinc-700/80 bg-zinc-900/80 pl-4 py-3 pr-2 text-sm font-medium text-zinc-300 shadow-[0_0_20px_rgba(0,0,0,0.5)] backdrop-blur transition-all hover:bg-zinc-800 hover:text-white"
        title="Historial de Conversaciones"
      >
        <span aria-hidden className="text-[1.2rem] text-[#b6f542]">📚</span>
      </button>

      {/* OVERLAY & SIDEBAR HISTORIAL */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div 
        className={
          `fixed top-0 right-0 z-50 h-full w-80 max-w-[85vw] transform bg-zinc-950 border-l border-zinc-800/80 shadow-2xl transition-transform duration-300 ease-in-out flex flex-col ${
            sidebarOpen ? 'translate-x-0' : 'translate-x-full'
          }`
        }
      >
        <div className="p-4 border-b border-zinc-800/80 flex justify-between items-center">
          <h3 className="font-semibold text-zinc-50">Historial de Chat</h3>
          <button onClick={() => setSidebarOpen(false)} className="text-zinc-400 hover:text-white p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        
        <div className="p-4">
          <button 
            onClick={createNewConversation}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#b6f542]/10 border border-[#b6f542]/30 px-4 py-3 text-sm font-semibold text-[#b6f542] transition hover:bg-[#b6f542]/20 shadow-[0_0_15px_rgba(182,245,66,0.15)]"
          >
            <span>+</span> Nueva conversación
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-sm text-zinc-500">
              No tienes conversaciones previas.
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => loadConversation(conv.id)}
                  className={`flex flex-col items-start gap-1 w-full rounded-xl px-4 py-3 text-left transition ${
                    conversationId === conv.id 
                    ? "bg-zinc-900 border border-zinc-700/80 shadow-md" 
                    : "hover:bg-zinc-900/50 hover:pl-5 text-zinc-400"
                  }`}
                >
                  <span className={`text-sm font-medium line-clamp-1 ${conversationId === conv.id ? 'text-zinc-100' : ''}`}>
                    {conv.title}
                  </span>
                  <span className="text-[10px] text-zinc-600">
                    {new Date(conv.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

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
