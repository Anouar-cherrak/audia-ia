"use client";

import { useState, useEffect, useRef } from "react";
import { signOut, signIn, useSession } from "next-auth/react";

interface Video {
  id: string;
  title: string;
  views: string;
  likes: string;
  duration: number;
  thumb: string;
}

interface AdvancedAnalysis {
  creatorType: string;
  avgDuration: string;
  topHashtags: string[];
  strengths: string[];
  weaknesses: string[];
  metrics: {
    likeRate: string;
    shareRate: string;
    commentRate: string;
  };
}

interface ProfileData {
  username: string;
  score: number;
  followers: string;
  profilePic: string;
  signature?: string;
  nickname?: string;
  videos: Video[];
  advancedAnalysis?: AdvancedAnalysis;
  error?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
}

export default function Home() {
  const { data: session, status } = useSession();
  const userKey = session?.user?.email ? `_${session.user.email}` : "";

  // États de Structure Globale
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeSidebarTab, setActiveSidebarTab] = useState<"chat" | "analyze" | "pricing">("chat");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Système Multi-Chats
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>("");
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitleInput, setEditTitleInput] = useState("");

  // États du Chatbot Courant
  const [inputMessage, setInputMessage] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);

  // États Synchronisés du Studio d'Analyse TikTok
  const [tiktokUsername, setTiktokUsername] = useState("");
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [activeStudioTab, setActiveStudioTab] = useState<"videos" | "ai">("videos");
  const [videoFallbacks, setVideoFallbacks] = useState<Record<string, boolean>>({});

  // LIMITES STRICTES INITIALISÉES DEPUIS LE LOCALSTORAGE
  const [messageCount, setMessageCount] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`audia_msg_count${userKey}`);
      return saved ? parseInt(saved, 10) : 0;
    }
    return 0;
  });

  const [lastAnalysisTimestamp, setLastAnalysisTimestamp] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`audia_last_analysis_time${userKey}`);
      return saved ? parseInt(saved, 10) : 0;
    }
    return 0;
  });

  // États de l'Abonnement Pro
  const [isSubscribed, setIsSubscribed] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const t = {
    newChat: "Nouvelle discussion",
    tabChat: "Générateur de Scripts",
    tabAnalyze: "Analyser un profil",
    tabPricing: "Tarifs & Compte",
    login: "Se connecter avec Google",
    logout: "Déconnexion",
    statusPro: "Plan Pro Illimité",
    statusFree: "messages restants aujourd'hui",
    welcomeMessage: "Salut ! Je suis ton assistant d'écriture stratégique Audia. Pose-moi tes questions librement, ou utilise l'onglet 'Analyser un profil' pour charger des données TikTok en direct !",
    back: "← Scanner un autre profil",
    recents: "Vidéos Récentes",
    report: "Rapport Stratégique IA",
    followers: "abonnés",
    diagnostic: "Diagnostic de Performance Global",
    calc: "Note attribuée par le modèle d'après les ratios d'engagement observés.",
    points: "POINTS FORTS",
    weak: "AXES D'AMÉLIORATION",
    generator: "Générateur de Script Stratégique",
    genDesc: "Crée un script sur-mesure pour corriger les failles détectées par l'IA.",
    analyzeTitle: "Diagnostic Algorithmique",
    analyzeDesc: "Entre un identifiant pour extraire ses forces et injecter sa niche dans le générateur.",
    analyzeLabel: "Identifiant du créateur TikTok",
    analyzeBtn: "Lancer l'audit de reach",
    pricingTitle: "Modèle & Tarifs",
    pricingDesc: "Activez ou contrôlez vos accès stratégiques à tout moment.",
    currentStatus: "Votre Statut Actuel",
    proPlan: "Abonnement Pro Premium",
    freePlan: "Version Gratuite active",
    proDesc: "Accès total, instantané et sans aucune limite.",
    freeDesc: "Inclus dans l'accès gratuit :",
    cancelBtn: "Résilier mon Abonnement",
    noCard: "Aucune carte enregistrée.",
    offerBadge: "OFFRE PREMIUM",
    trialText: "7 Jours d'essai gratuit — Sans engagement",
    memberPro: "Déjà membre Pro (Actif)",
    startTrial: "Lancer mes 7 jours gratuits",
  };

  // Gestion des changements de session (Connexion / Déconnexion)
  useEffect(() => {
    if (status !== "authenticated") {
      setChats([]);
      setActiveChatId("");
      setMessageCount(0);
      setLastAnalysisTimestamp(0);
      return;
    }

    const savedChats = localStorage.getItem(`audia_chats${userKey}`);
    if (savedChats) {
      const parsed = JSON.parse(savedChats) as ChatSession[];
      setChats(parsed);
      if (parsed.length > 0) setActiveChatId(parsed[0].id);
    } else {
      const initialId = Math.random().toString();
      const initialChat: ChatSession = {
        id: initialId,
        title: "Discussion Initiale",
        messages: [{ id: "welcome", role: "assistant", content: t.welcomeMessage }]
      };
      setChats([initialChat]);
      setActiveChatId(initialId);
      localStorage.setItem(`audia_chats${userKey}`, JSON.stringify([initialChat]));
    }

    const savedCount = localStorage.getItem(`audia_msg_count${userKey}`);
    if (savedCount) setMessageCount(parseInt(savedCount, 10));

    const savedTime = localStorage.getItem(`audia_last_analysis_time${userKey}`);
    if (savedTime) setLastAnalysisTimestamp(parseInt(savedTime, 10));

    const checkDailyReset = () => {
      const lastResetStr = localStorage.getItem(`audia_daily_reset${userKey}`);
      const now = new Date().getTime();
      const oneDay = 24 * 60 * 60 * 1000;

      if (!lastResetStr) {
        localStorage.setItem(`audia_daily_reset${userKey}`, now.toString());
      } else if (now - parseInt(lastResetStr, 10) >= oneDay) {
        setMessageCount(0);
        localStorage.setItem(`audia_msg_count${userKey}`, "0");
        localStorage.setItem(`audia_daily_reset${userKey}`, now.toString());
      }
    };
    checkDailyReset();
  }, [status, userKey]);

  useEffect(() => {
    if (status === "authenticated" && chats.length > 0) {
      localStorage.setItem(`audia_chats${userKey}`, JSON.stringify(chats));
    }
  }, [chats, status, userKey]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", isDarkMode ? "dark" : "light");
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  const activeChat = chats.find(c => c.id === activeChatId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages, isAiTyping]);

  const getProxyImg = (url: string) => {
    if (!url || url.trim() === "") return "";
    return `/api/proxy-img?url=${encodeURIComponent(url)}`;
  };

  const handleNewChat = () => {
    if (status !== "authenticated") return;
    const newId = Math.random().toString();
    const newChatSession: ChatSession = {
      id: newId,
      title: `Discussion n°${chats.length + 1}`,
      messages: [{ id: "welcome", role: "assistant", content: t.welcomeMessage }]
    };
    setChats(prev => [newChatSession, ...prev]);
    setActiveChatId(newId);
    setActiveSidebarTab("chat");
    setInputMessage("");
  };

  const handleDeleteChat = (idToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedChats = chats.filter(c => c.id !== idToDelete);
    setChats(updatedChats);
    
    if (updatedChats.length === 0) {
      const newId = Math.random().toString();
      const fallbackChat: ChatSession = {
        id: newId,
        title: "Discussion Initiale",
        messages: [{ id: "welcome", role: "assistant", content: t.welcomeMessage }]
      };
      setChats([fallbackChat]);
      setActiveChatId(newId);
    } else if (activeChatId === idToDelete) {
      setActiveChatId(updatedChats[0].id);
    }
  };

  const startRenameChat = (id: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChatId(id);
    setEditTitleInput(currentTitle);
  };

  const saveChatTitle = (id: string) => {
    if (!editTitleInput.trim()) return;
    setChats(prev => prev.map(c => c.id === id ? { ...c, title: editTitleInput.trim() } : c));
    setEditingChatId(null);
  };

  const formatMessageContent = (text: string) => {
    return text.split("\n").map((line, i) => {
      const parts = line.split(/\*\*([^*]+)\*\*/g);
      return (
        <p key={i} className="min-h-[1.25rem] leading-relaxed mb-1">
          {parts.map((part, index) => {
            if (index % 2 === 1) {
              return <strong key={index} className="text-[var(--accent-tiktok)] font-bold">{part}</strong>;
            }
            return part;
          })}
        </p>
      );
    });
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isAiTyping || !activeChatId || status !== "authenticated") return;

    if (messageCount >= 15 && !isSubscribed) {
      setActiveSidebarTab("pricing");
      alert("Limite de 15 messages atteinte pour aujourd'hui. Passe à la version Pro pour un accès illimité !");
      return;
    }

    const userMsg: Message = { id: Math.random().toString(), role: "user", content: textToSend };
    
    setChats(prev => prev.map(c => {
      if (c.id === activeChatId) return { ...c, messages: [...c.messages, userMsg] };
      return c;
    }));

    setInputMessage("");
    const nextCount = messageCount + 1;
    setMessageCount(nextCount);
    localStorage.setItem(`audia_msg_count${userKey}`, nextCount.toString());
    setIsAiTyping(true);

    const currentChatContext = chats.find(c => c.id === activeChatId);
    const contextMessages = currentChatContext ? [...currentChatContext.messages, userMsg] : [userMsg];

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: contextMessages.map((m) => ({ role: m.role, content: m.content })),
          tiktokContext: profileData,
        }),
      });

      if (!res.ok) {
  const errorData = await res.json().catch(() => ({}));
  const errorMessage = errorData.error || "Erreur interne du serveur.";
  alert(`Le serveur a planté ! Raison exacte : ${errorMessage}`);
  throw new Error(errorMessage);
}
      const data = await res.json();
      
      setChats(prev => prev.map(c => {
        if (c.id === activeChatId) {
          return {
            ...c,
            messages: [...c.messages, { id: Math.random().toString(), role: "assistant", content: data.reply }]
          };
        }
        return c;
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiTyping(false);
    }
  };

  const handleStartAnalysis = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tiktokUsername || status !== "authenticated") return;

    const now = new Date().getTime();
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;

    if (!isSubscribed && lastAnalysisTimestamp > 0 && now - lastAnalysisTimestamp < sevenDaysInMs) {
      const remainingMs = sevenDaysInMs - (now - lastAnalysisTimestamp);
      const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
      setAnalysisError(`Limite Gratuite : Tu as déjà fait ton analyse cette semaine. Attends encore ${remainingDays} jour(s) ou passe au plan Pro.`);
      return;
    }

    setLoadingAnalysis(true);
    setAnalysisError(null);

    fetch(`/api/analyze?user=${encodeURIComponent(tiktokUsername)}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Profil introuvable.");
        return json;
      })
      .then((resData) => {
        setProfileData(resData);
        setLoadingAnalysis(false);
        
        const currentTimestamp = new Date().getTime();
        setLastAnalysisTimestamp(currentTimestamp);
        localStorage.setItem(`audia_last_analysis_time${userKey}`, currentTimestamp.toString());

        const detectedNiche = resData?.advancedAnalysis?.creatorType || "Créateur";
        if (activeChatId) {
          setChats(prev => prev.map(c => {
            if (c.id === activeChatId) {
              return {
                ...c,
                messages: [...c.messages, {
                  id: Math.random().toString(),
                  role: "assistant",
                  content: `⚡ **Données TikTok synchronisées !**\n\nJ'ai analysé le profil **@${resData?.username}** (Niche : *${detectedNiche}*). Les données sont injectées dans ton IA.`,
                }]
              };
            }
            return c;
          }));
        }
      })
      .catch((err) => {
        setAnalysisError(err.message);
        setLoadingAnalysis(false);
      });
  };

  const handleGenerateScriptFromStudio = (type: string) => {
    if (!profileData) return;
    const targetNiche = profileData?.advancedAnalysis?.creatorType || "ma niche";
    setActiveSidebarTab("chat");
    handleSendMessage(`Rédige-moi un script complet de type [${type}] adapté pour mon compte TikTok sur la thématique [${targetNiche}].`);
  };

  const handleLogoutAction = async () => {
    setChats([]);
    setActiveChatId("");
    await signOut();
  };

  const handleSubscribe = async () => {
    if (!session?.user?.email) {
      alert("Tu dois être connecté pour t'abonner.");
      return;
    }

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail: session.user.email }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Erreur lors de la création de la session de paiement.");
      }
    } catch (err) {
      console.error(err);
      alert("Impossible de joindre le serveur de paiement.");
    }
  };

  return (
    <div className="min-h-screen flex font-sans antialiased relative overflow-hidden theme-transition bg-background text-foreground">
      
      {/* 1. SIDEBAR */}
      <div className={`h-screen z-20 flex flex-col justify-between p-5 select-none theme-transition relative shrink-0 bg-card border-border ${
        isSidebarOpen ? "w-[280px] opacity-100 border-r" : "w-0 p-0 opacity-0 pointer-events-none border-r-0"
      }`}>
        <div className="space-y-5 flex flex-col h-[calc(100vh-80px)]">
          <div className="flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-[var(--accent-tiktok)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
              <span className="font-bold tracking-wider text-xs uppercase">AUDIA</span>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="text-neutral-500 hover:text-neutral-400 text-sm font-bold px-1 cursor-pointer">«</button>
          </div>

          {status === "authenticated" ? (
            <>
              <button onClick={handleNewChat} className="w-full text-left py-2 px-3 border border-border hover:border-[var(--accent-tiktok)] rounded-xl text-xs font-medium theme-transition cursor-pointer shrink-0">
                + {t.newChat}
              </button>

              <nav className="flex flex-col gap-1 shrink-0">
                <button onClick={() => setActiveSidebarTab("chat")} className={`w-full text-left py-2 px-3 rounded-xl text-xs font-semibold tracking-wide theme-transition cursor-pointer ${activeSidebarTab === "chat" ? "bg-background shadow-sm" : "text-neutral-500 hover:text-neutral-400"}`}>
                  {t.tabChat}
                </button>
                <button onClick={() => setActiveSidebarTab("analyze")} className={`w-full text-left py-2 px-3 rounded-xl text-xs font-semibold tracking-wide theme-transition cursor-pointer ${activeSidebarTab === "analyze" ? "bg-background shadow-sm" : "text-neutral-500 hover:text-neutral-400"}`}>
                  {t.tabAnalyze}
                </button>
                <button onClick={() => setActiveSidebarTab("pricing")} className={`w-full text-left py-2 px-3 rounded-xl text-xs font-semibold tracking-wide theme-transition cursor-pointer ${activeSidebarTab === "pricing" ? "bg-background shadow-sm" : "text-neutral-500 hover:text-neutral-400"}`}>
                  {t.tabPricing}
                </button>
              </nav>

              {activeSidebarTab === "chat" && (
                <div className="flex-1 flex flex-col min-h-0 border-t border-border pt-3">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 mb-2 px-1">Discussions Récents</span>
                  <div className="flex-1 overflow-y-auto pr-1 space-y-1 max-h-[220px] md:max-h-[300px]">
                    {chats.map((c) => (
                      <div 
                        key={c.id} 
                        onClick={() => setActiveChatId(c.id)}
                        className={`group w-full flex items-center justify-between py-1.5 px-2.5 rounded-xl text-xs font-medium cursor-pointer transition-all border border-transparent ${activeChatId === c.id ? "bg-background shadow-sm border-border text-[var(--accent-tiktok)]" : "text-neutral-400 hover:bg-background/50 hover:text-neutral-200"}`}
                      >
                        {editingChatId === c.id ? (
                          <input
                            type="text"
                            value={editTitleInput}
                            onChange={(e) => setEditTitleInput(e.target.value)}
                            onBlur={() => saveChatTitle(c.id)}
                            onKeyDown={(e) => e.key === "Enter" && saveChatTitle(c.id)}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                            className="bg-transparent border-none outline-none text-xs w-full text-foreground p-0 font-medium"
                          />
                        ) : (
                          <span className="truncate flex-1 pr-2">{c.title}</span>
                        )}

                        {editingChatId !== c.id && (
                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 transition-opacity shrink-0">
                            <button onClick={(e) => startRenameChat(c.id, c.title, e)} className="text-neutral-500 hover:text-neutral-300 text-[11px]">✏️</button>
                            <button onClick={(e) => handleDeleteChat(c.id, e)} className="text-neutral-500 hover:text-red-400 text-[11px]">🗑️</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-6 text-neutral-500 text-[11px] font-medium leading-relaxed">
              Connecte-toi pour charger ton espace de travail.
            </div>
          )}
        </div>

        <div className="space-y-4 border-t pt-4 border-border flex justify-center shrink-0">
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 text-center rounded-xl bg-background border border-border cursor-pointer hover:opacity-80 transition-all text-sm flex items-center justify-center w-10 h-10 shadow-sm">
            {isDarkMode ? "☀️" : "🌙"}
          </button>
        </div>
      </div>

      {!isSidebarOpen && (
        <button onClick={() => setIsSidebarOpen(true)} className="absolute left-4 top-[21px] z-30 font-bold text-xs border border-border px-2 py-1 rounded bg-card backdrop-blur-sm theme-transition cursor-pointer">»</button>
      )}

      {/* 2. MAIN SPACE */}
      <main className="flex-1 z-10 flex flex-col relative h-screen overflow-hidden">
        
        <header className="p-4 px-6 border-b flex justify-between items-center bg-card border-border">
          <div className={`flex items-center gap-3.5 ${!isSidebarOpen ? "pl-10 transition-all" : ""}`}>
            <div className="p-1.5 rounded-xl bg-background border border-border shadow-sm flex items-center justify-center">
              <svg className="w-5 h-5 text-[var(--accent-tiktok)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-sm font-black uppercase tracking-widest text-foreground">AUDIA</span>
          </div>

          <div className="flex items-center gap-4">
            {status === "authenticated" && (
              <div className="text-[11px] font-mono text-neutral-500">
                {isSubscribed ? `${t.statusPro} ✓` : `${messageCount >= 15 ? 0 : 15 - messageCount} ${t.statusFree}`}
              </div>
            )}
            
            {status === "authenticated" ? (
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-neutral-300">
                  {session.user?.name || session.user?.email}
                </span>
                <button onClick={handleLogoutAction} className="text-[10px] font-bold border px-2.5 py-1 rounded-lg border-red-500/30 text-red-400 hover:bg-red-500/10 theme-transition cursor-pointer">
                  {t.logout}
                </button>
              </div>
            ) : (
              <button onClick={() => signIn("google")} className="text-xs font-bold border px-4 py-2 rounded-xl bg-[var(--accent-tiktok)] hover:opacity-90 text-white border-none theme-transition cursor-pointer">
                {t.login}
              </button>
            )}
          </div>
        </header>

        {/* ECOSYSTEM FILTRÉ PAR LA CONNEXION */}
        <div className="flex-1 overflow-y-auto">
          
          {status !== "authenticated" ? (
            <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center px-4 space-y-5">
              <div className="w-12 h-12 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-center text-xl">🔒</div>
              <div className="space-y-1.5">
                <h2 className="text-base font-bold tracking-tight">Accès Privé</h2>
                <p className="text-xs text-neutral-500 leading-relaxed">Connecte-toi via Google pour débloquer de manière sécurisée ton tableau de bord et sauvegarder tes quotas.</p>
              </div>
              <button onClick={() => signIn("google")} className="w-full py-2.5 rounded-xl bg-card border border-border text-xs font-bold shadow-sm hover:bg-background/80 flex items-center justify-center gap-2 transition-all cursor-pointer">
                🌐 Continuer avec Google
              </button>
            </div>
          ) : (
            <>
              {activeSidebarTab === "chat" && (
                <div className="max-w-2xl mx-auto w-full px-4 py-8 flex flex-col gap-6 text-[14px]">
                  {activeChat?.messages.map((msg) => {
                    const isUser = msg.role === "user";
                    return (
                      <div key={msg.id} className={`flex items-start gap-4 w-full ${isUser ? "justify-end" : "justify-start"}`}>
                        {!isUser && (
                          <div className="max-w-[90%] space-y-1 py-1">
                            <div className="text-sm tracking-wide">
                              {formatMessageContent(msg.content)}
                            </div>
                          </div>
                        )}
                        {isUser && (
                          <div className="flex items-start max-w-[85%] ml-auto justify-end">
                            <div className="px-4 py-2.5 rounded-2xl text-xs font-medium tracking-wide shadow-sm bg-card border border-border">
                              {msg.content}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {isAiTyping && (
                    <div className="w-full flex justify-start items-center py-2">
                      <div className="flex gap-1 items-center">
                        <span className="w-1.5 h-1.5 bg-[var(--accent-tiktok)] rounded-full animate-bounce"></span>
                        <span className="w-1.5 h-1.5 bg-[var(--accent-tiktok)] rounded-full animate-bounce [animation-delay:0.2s]"></span>
                        <span className="w-1.5 h-1.5 bg-[var(--accent-tiktok)] rounded-full animate-bounce [animation-delay:0.4s]"></span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}

              {activeSidebarTab === "analyze" && (
                <div className="max-w-4xl mx-auto w-full px-6 py-10 space-y-8">
                  {!profileData && !loadingAnalysis && (
                    <div className="max-w-md mx-auto space-y-6 py-10">
                      <div className="text-center space-y-2">
                        <h2 className="text-xl font-bold uppercase tracking-tight">{t.analyzeTitle}</h2>
                        <p className="text-xs text-neutral-500">{t.analyzeDesc}</p>
                        {!isSubscribed && (
                          <p className="text-[11px] text-amber-500 font-medium">Quota gratuit : 1 seule analyse tous les 7 jours.</p>
                        )}
                      </div>
                      <form onSubmit={handleStartAnalysis} className="border p-6 space-y-4 rounded-xl bg-card border-border">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold tracking-wider uppercase text-neutral-500">{t.analyzeLabel}</label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-3 flex items-center text-xs font-bold text-[var(--accent-tiktok)]">@</span>
                            <input type="text" required value={tiktokUsername} onChange={(e) => setTiktokUsername(e.target.value)} placeholder="nom_d_utilisateur" className="w-full pl-7 pr-3 py-2 text-xs rounded-xl border bg-transparent focus:outline-none focus:border-[var(--accent-tiktok)] border-border" />
                          </div>
                        </div>
                        {analysisError && <p className="text-xs text-red-500 font-medium bg-red-500/10 p-2.5 rounded-xl border border-red-500/20">{analysisError}</p>}
                        <button type="submit" className="w-full py-2.5 text-[11px] font-bold tracking-widest uppercase rounded-xl text-white theme-transition cursor-pointer bg-[var(--accent-tiktok)] hover:opacity-90">
                          {t.analyzeBtn}
                        </button>
                      </form>
                    </div>
                  )}

                  {loadingAnalysis && (
                    <div className="flex flex-col items-center justify-center py-24 space-y-4">
                      <div className="w-6 h-6 border-2 border-t-transparent border-[var(--accent-tiktok)] rounded-full animate-spin"></div>
                      <p className="text-xs font-bold tracking-tight text-neutral-400">Extraction de @{tiktokUsername}...</p>
                    </div>
                  )}

                  {profileData && !loadingAnalysis && (
                    <div className="space-y-6">
                      <div className="p-6 rounded-xl border bg-card border-border">
                        <div className="flex justify-between items-start flex-wrap gap-4">
                          <div>
                            <h1 className="text-xl font-bold tracking-tight">{profileData?.nickname || profileData?.username}</h1>
                            <p className="text-xs text-[var(--accent-tiktok)] font-semibold mt-0.5">@{profileData?.username}</p>
                            {profileData?.signature && <p className="text-xs text-neutral-400 mt-2 max-w-xl">{profileData?.signature}</p>}
                          </div>
                          <button onClick={() => { setProfileData(null); setTiktokUsername(""); }} className="text-xs font-bold border border-border px-3 py-1.5 rounded-xl hover:border-[var(--accent-tiktok)] theme-transition cursor-pointer">
                            {t.back}
                          </button>
                        </div>
                        <div className="flex gap-6 mt-4 pt-4 border-t border-border text-xs">
                          <div><strong className="text-foreground">{profileData?.followers}</strong> {t.followers}</div>
                          <div>Thématique : <strong className="text-blue-400 font-bold uppercase">{profileData?.advancedAnalysis?.creatorType}</strong></div>
                        </div>
                      </div>

                      <div className="flex gap-4 border-b border-border pb-px text-xs">
                        <button onClick={() => setActiveStudioTab("videos")} className={`pb-2 font-bold uppercase tracking-wider cursor-pointer ${activeStudioTab === "videos" ? "border-b-2 border-[var(--accent-tiktok)] text-foreground" : "text-neutral-500"}`}>{t.recents}</button>
                        <button onClick={() => setActiveStudioTab("ai")} className={`pb-2 font-bold uppercase tracking-wider cursor-pointer ${activeStudioTab === "ai" ? "border-b-2 border-[var(--accent-tiktok)] text-foreground" : "text-neutral-500"}`}>{t.report}</button>
                      </div>

                      {activeStudioTab === "videos" && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {profileData?.videos?.map((vid) => {
                            const isVideoUrl = vid.thumb?.includes(".mp4") || videoFallbacks[vid.id];
                            return (
                              <div key={vid.id} className="rounded-xl border overflow-hidden flex flex-col justify-between bg-card border-border">
                                <div className="relative aspect-[9/16] bg-neutral-900 flex items-center justify-center overflow-hidden">
                                  {vid.thumb ? (
                                    isVideoUrl ? (
                                      <video src={getProxyImg(vid.thumb)} muted loop playsInline autoPlay className="w-full h-full object-cover" />
                                    ) : (
                                      <img src={getProxyImg(vid.thumb)} alt="Miniature" crossOrigin="anonymous" onError={() => setVideoFallbacks(prev => ({ ...prev, [vid.id]: true }))} className="w-full h-full object-cover" />
                                    )
                                  ) : (
                                    <span className="text-[10px] text-neutral-600">Image indisponible</span>
                                  )}
                                  <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[10px] font-bold text-white">▶ {vid.views}</div>
                                </div>
                                <div className="p-3">
                                  <p className="text-[11px] line-clamp-2 text-neutral-300">{vid.title || "Sans titre"}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {activeStudioTab === "ai" && (
                        <div className="space-y-6">
                          <div className="p-5 rounded-xl border flex justify-between items-center bg-card border-border">
                            <div className="space-y-1">
                              <h3 className="text-xs font-bold uppercase tracking-wider">{t.diagnostic}</h3>
                              <p className="text-[11px] text-neutral-500 max-w-md">{t.calc}</p>
                            </div>
                            <div className="text-xl font-black text-[#10b981]">{profileData?.score || 0}/100</div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                            <div className="p-4 rounded-xl border bg-card border-border">
                              <span className="text-neutral-500">Ratio d'engagement</span>
                              <span className="block text-base font-bold mt-1 text-foreground">{profileData?.advancedAnalysis?.metrics?.likeRate || "0%"}</span>
                            </div>
                            <div className="p-4 rounded-xl border bg-card border-border">
                              <span className="text-neutral-500">Taux de Partage</span>
                              <span className="block text-base font-bold mt-1 text-[var(--accent-tiktok)]">{profileData?.advancedAnalysis?.metrics?.shareRate || "0%"}</span>
                            </div>
                            <div className="p-4 rounded-xl border bg-card border-border">
                              <span className="text-neutral-500">Durée des Contenus</span>
                              <span className="block text-base font-bold mt-1 text-blue-500">{profileData?.advancedAnalysis?.avgDuration || "N/A"}</span>
                            </div>
                          </div>

                          <div className="p-5 rounded-xl border space-y-4 bg-card border-border">
                            <h4 className="text-[11px] font-bold uppercase text-neutral-400 tracking-wider">Analyse Éditoriale par IA</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                              <div>
                                <p className="text-emerald-500 font-bold mb-2 uppercase text-[10px] tracking-wider">{t.points}</p>
                                {profileData?.advancedAnalysis?.strengths?.map((s, i) => (
                                  <div key={i} className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 mb-1.5">{s}</div>
                                ))}
                              </div>
                              <div>
                                <p className="text-amber-500 font-bold mb-2 uppercase text-[10px] tracking-wider">{t.weak}</p>
                                {profileData?.advancedAnalysis?.weaknesses?.map((w, i) => (
                                  <div key={i} className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/10 text-amber-400 mb-1.5">{w}</div>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="p-5 rounded-xl border space-y-4 bg-card border-border">
                            <h3 className="text-xs font-bold uppercase tracking-wider">{t.generator}</h3>
                            <p className="text-xs text-neutral-500">{t.genDesc}</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                              <button onClick={() => handleGenerateScriptFromStudio("Hook Hard")} className="p-3 text-left border border-border rounded-xl hover:border-[var(--accent-tiktok)] theme-transition cursor-pointer">
                                <strong className="block text-foreground mb-0.5">Hook Agressif</strong> Pour casser le scroll.
                              </button>
                              <button onClick={() => handleGenerateScriptFromStudio("Structure Rétention")} className="p-3 text-left border border-border rounded-xl hover:border-[var(--accent-tiktok)] theme-transition cursor-pointer">
                                <strong className="block text-foreground mb-0.5">Forte Rétention</strong> Pour rallonger le watchtime.
                              </button>
                              <button onClick={() => handleGenerateScriptFromStudio("CTA Stratégique")} className="p-3 text-left border border-border rounded-xl hover:border-[var(--accent-tiktok)] theme-transition cursor-pointer">
                                <strong className="block text-foreground mb-0.5">Débat d'idées</strong> Forcer l'espace commentaire.
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeSidebarTab === "pricing" && (
                <div className="max-w-3xl mx-auto w-full px-4 py-16 space-y-8">
                  <div className="text-center space-y-1">
                    <h2 className="text-xl font-bold uppercase tracking-tight">{t.pricingTitle}</h2>
                    <p className="text-xs text-neutral-500">{t.pricingDesc}</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6 items-stretch">
                    
                    {/* PLAN GRATUIT */}
                    <div className="border rounded-xl p-6 flex flex-col justify-between bg-card/60 border-border shadow-sm relative">
                      <div className="space-y-4">
                        <div>
                          <span className="text-[9px] font-bold text-neutral-400 bg-neutral-500/10 px-2 py-0.5 rounded-xl uppercase">ACCÈS STANDARD</span>
                          <div className="mt-2 flex items-baseline gap-0.5">
                            <span className="text-2xl font-black text-foreground">0€</span>
                            <span className="text-xs text-neutral-500">/toujours</span>
                          </div>
                          <p className="text-[10px] text-amber-500 font-medium mt-1">Contenu financé par la publicité</p>
                        </div>

                        <div className="pt-3 border-t border-border space-y-2 text-[11px] text-neutral-400">
                          <div className="flex items-center gap-1.5 text-neutral-300">✓ 15 messages max par jour</div>
                          <div className="flex items-center gap-1.5 text-neutral-300">✓ 1 analyse de profil max tous les 7 jours</div>
                          <div className="flex items-center gap-1.5 text-amber-400/90 font-medium">⚠️ Publicités Google Ads actives sur l'interface</div>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-border text-center">
                        <span className="text-xs text-emerald-500 font-bold block bg-emerald-500/10 py-2 rounded-xl">
                          {isSubscribed ? "Version standard disponible" : "Votre plan gratuit actuel"}
                        </span>
                      </div>
                    </div>

                    {/* PLAN PREMIUM PRO */}
                    <div className="border rounded-xl p-6 flex flex-col justify-between bg-card border-border shadow-md relative ring-1 ring-[var(--accent-tiktok)]/30">
                      <div className="space-y-4">
                        <div>
                          <span className="text-[9px] font-bold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-xl uppercase">{t.offerBadge}</span>
                          <div className="mt-2 flex items-baseline gap-0.5">
                            <span className="text-2xl font-black text-foreground">9,99€</span>
                            <span className="text-xs text-neutral-500">/mois</span>
                          </div>
                          <p className="text-[10px] text-emerald-500 font-medium mt-1">🚀 {t.trialText}</p>
                        </div>

                        <div className="pt-3 border-t border-border space-y-2 text-[11px] text-neutral-400">
                          <div className="flex items-center gap-1.5 text-emerald-400 font-bold">✓ ZÉRO PUBLICITÉ (Expérience 100% Pro)</div>
                          <div className="flex items-center gap-1.5 text-neutral-300">✓ Chat & Scripts IA <strong>Illimités</strong></div>
                          <div className="flex items-center gap-1.5 text-neutral-300">✓ Analyses de profils TikTok <strong>Illimitées</strong></div>
                          <div className="flex items-center gap-1.5 text-neutral-300">✓ Injection de niche automatique & sans restriction</div>
                        </div>
                      </div>

                      <div className="mt-6">
                        {isSubscribed ? (
                          <div className="space-y-2">
                            <span className="text-xs text-center text-blue-400 font-bold block bg-blue-500/10 py-2 rounded-xl">
                              {t.memberPro}
                            </span>
                            <button onClick={() => setIsSubscribed(false)} className="w-full py-1.5 text-[9px] font-bold uppercase rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/5 transition-all">
                              {t.cancelBtn}
                            </button>
                          </div>
                        ) : (
                          <button onClick={handleSubscribe} className="w-full py-2.5 text-[10px] font-bold uppercase rounded-xl theme-transition cursor-pointer bg-[var(--accent-tiktok)] text-white hover:opacity-90 shadow-sm active:scale-[0.98]">
                            {t.startTrial}
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </>
          )}

        </div>

        {/* Pied de page du chat */}
        {activeSidebarTab === "chat" && status === "authenticated" && (
          <footer className="p-4 px-6 bg-transparent">
            <div className="max-w-2xl mx-auto relative flex items-center rounded-2xl border border-border bg-card shadow-sm pr-2 pl-4 py-2">
              <input 
                type="text"
                placeholder="Demandez un concept, une idée ou un type de script..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage(inputMessage)}
                className="flex-1 bg-transparent border-none outline-none text-xs text-foreground pr-12 py-1"
              />
              <button 
                onClick={() => handleSendMessage(inputMessage)} 
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[var(--accent-tiktok)] text-white flex items-center justify-center transition-all hover:opacity-90 cursor-pointer shadow-sm active:scale-95"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                </svg>
              </button>
            </div>
          </footer>
        )}
      </main>
    </div>
  );
}