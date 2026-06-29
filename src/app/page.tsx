"use client";

import React, { useState, useEffect, useRef } from "react";

// Types pour l'application
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
}

interface Video {
  id: string;
  title: string;
  views: string;
  thumb: string;
}

interface ProfileData {
  username: string;
  nickname: string;
  signature: string;
  followers: string;
  score: number;
  advancedAnalysis: {
    creatorType: string;
    avgDuration: string;
    metrics: {
      likeRate: string;
      shareRate: string;
    };
    strengths: string[];
    weaknesses: string[];
  };
  videos: Video[];
}

export default function WorkspacePage() {
  // --- ÉTATS (STATES) ---
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeSidebarTab, setActiveSidebarTab] = useState<"chat" | "analyze" | "pricing">("chat");
  const [activeStudioTab, setActiveStudioTab] = useState<"videos" | "ai">("videos");
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  // Authentification & Limites (Simulées pour la structure)
  const [status, setStatus] = useState<"authenticated" | "unauthenticated">("authenticated");
  const [session, setSession] = useState({ user: { name: "Créateur", email: "contact@audia.ai" } });
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [hasUsedTrial, setHasUsedTrial] = useState(false);
  const [messageCount, setMessageCount] = useState(5);
  const [loadingSubscription, setLoadingSubscription] = useState(false);

  // Gestion des Chats
  const [chats, setChats] = useState<Chat[]>([
    { id: "1", title: "Script TikTok - Idées", messages: [{ id: "m1", role: "assistant", content: "Salut ! Quel type de concept veux-tu créer aujourd'hui ?" }] }
  ]);
  const [activeChatId, setActiveChatId] = useState<string>("1");
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitleInput, setEditTitleInput] = useState("");
  const [inputMessage, setInputMessage] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);

  // Analyse TikTok
  const [tiktokUsername, setTiktokUsername] = useState("");
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [videoFallbacks, setVideoFallbacks] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- TRADUCTIONS SIMPLIFIÉES (i18n) ---
  const t = {
    statusPro: "Version PRO",
    statusFree: "crédits restants",
    logout: "Déconnexion",
    login: "Connexion",
    analyzeTitle: "Analyse d'Audience TikTok",
    analyzeDesc: "Entre un nom d'utilisateur pour décoder sa stratégie de contenu.",
    analyzeLabel: "Nom d'utilisateur TikTok",
    analyzeBtn: "Lancer l'analyse",
    back: "Retour",
    followers: "Abonnés",
    recents: "Vidéos Récentes",
    report: "Rapport IA",
    diagnostic: "Score d'Optimisation du Compte",
    calc: "Calculé à partir des ratios de rétention et d'engagement de l'algorithme.",
    points: "Points Forts (Rétention)",
    weak: "Axes d'Amélioration",
    generator: "Générateur de Scripts",
    genDesc: "Génère un script sur-mesure basé sur la thématique de ce profil :",
    pricingTitle: "Passe à la vitesse supérieure",
    pricingDesc: "Des outils professionnels pour maximiser ta rétention et exploser dans l'algorithme.",
    offerBadge: "Offre de Lancement",
    trialText: "Essai gratuit de 3 jours disponible",
    startTrial: "Commencer l'essai gratuit",
    memberPro: "Vous êtes membre PRO",
    cancelBtn: "Résilier l'abonnement"
  };

  // --- EFFETS ---
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chats, isAiTyping]);

  // --- FONCTIONS LOGIQUES ---
  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;
    
    setChats(prev => prev.map(c => {
      if (c.id === activeChatId) {
        return {
          ...c,
          messages: [...c.messages, { id: Date.now().toString(), role: "user", content: text }]
        };
      }
      return c;
    }));
    setInputMessage("");
    setIsAiTyping(true);

    setTimeout(() => {
      setChats(prev => prev.map(c => {
        if (c.id === activeChatId) {
          return {
            ...c,
            messages: [...c.messages, { id: (Date.now() + 1).toString(), role: "assistant", content: `Voici une analyse pour ton idée : "${text}". Pour optimiser le watchtime, commence directement par un hook visuel fort sans introduction.` }]
          };
        }
        return c;
      }));
      setIsAiTyping(false);
      setMessageCount(prev => prev + 1);
    }, 1200);
  };

  const handleStartAnalysis = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tiktokUsername.trim()) return;
    setLoadingAnalysis(true);
    setAnalysisError("");

    setTimeout(() => {
      setProfileData({
        username: tiktokUsername,
        nickname: `${tiktokUsername.toUpperCase()} Studio`,
        signature: "Créateur de contenu tech & productivité. Business en bio 🚀",
        followers: "124.5K",
        score: 78,
        advancedAnalysis: {
          creatorType: "Éducation / Tech",
          avgDuration: "42s",
          metrics: { likeRate: "8.4%", shareRate: "2.1%" },
          strengths: ["Excellente accroche (hook) de moins de 2 secondes", "Rythme de cut dynamique", "Sous-titres contrastés et lisibles"],
          weaknesses: ["Fin de vidéo trop abrupte (manque de Call to Action)", "Baisse de rétention entre la 15e et la 20e seconde"]
        },
        videos: [
          { id: "v1", title: "Cette astuce va changer votre setup en 2026 ! 💻", views: "45.2K", thumb: "" },
          { id: "v2", title: "3 erreurs de débutant en montage vidéo ❌", views: "120K", thumb: "" },
          { id: "v3", title: "Le secret de l'algorithme TikTok expliqué", views: "89.1K", thumb: "" },
          { id: "v4", title: "Mon outil secret pour gagner 2h par jour", views: "15.4K", thumb: "" }
        ]
      });
      setLoadingAnalysis(false);
    }, 2000);
  };

  const handleGenerateScriptFromStudio = (type: string) => {
    setActiveSidebarTab("chat");
    handleSendMessage(`Génère-moi un script de type "${type}" adapté pour le profil @${profileData?.username}`);
  };

  const startRenameChat = (id: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChatId(id);
    setEditTitleInput(currentTitle);
  };

  const saveChatTitle = (id: string) => {
    if (editTitleInput.trim()) {
      setChats(prev => prev.map(c => c.id === id ? { ...c, title: editTitleInput } : c));
    }
    setEditingChatId(null);
  };

  const handleDeleteChat = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setChats(prev => prev.filter(c => c.id !== id));
  };

  const handleSubscribe = () => {
    setLoadingSubscription(true);
    setTimeout(() => {
      setIsSubscribed(!isSubscribed);
      if (!isSubscribed) setHasUsedTrial(true);
      setLoadingSubscription(false);
    }, 1500);
  };

  const handleLogoutAction = () => setStatus("unauthenticated");
  const signIn = (provider: string) => setStatus("authenticated");
  const getProxyImg = (url: string) => url;

  const activeChat = chats.find(c => c.id === activeChatId);

  const formatMessageContent = (content: string) => {
    return <p className="leading-relaxed whitespace-pre-line">{content}</p>;
  };

  return (
    <div className={`flex h-screen w-full overflow-hidden text-foreground ${isDarkMode ? "dark bg-neutral-950 text-neutral-100" : "bg-neutral-50 text-neutral-900"}`} style={{ ["--accent-tiktok" as any]: "#fe2c55" }}>
      
      {/* 1. SIDEBAR */}
      <div className={`w-64 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 flex flex-col justify-between transition-all ${isSidebarOpen ? "block" : "hidden"}`}>
        <div className="space-y-4 flex-1 flex flex-col min-h-0">
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500">Navigation</span>
            <button onClick={() => setIsSidebarOpen(false)} className="text-neutral-500 hover:text-neutral-300 text-xs cursor-pointer">«</button>
          </div>

          <div className="flex flex-col gap-1">
            <button onClick={() => setActiveSidebarTab("chat")} className={`w-full text-left py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer ${activeSidebarTab === "chat" ? "bg-neutral-100 dark:bg-neutral-800 text-[var(--accent-tiktok)]" : "text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"}`}>💬 Assistant IA</button>
            <button onClick={() => setActiveSidebarTab("analyze")} className={`w-full text-left py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer ${activeSidebarTab === "analyze" ? "bg-neutral-100 dark:bg-neutral-800 text-[var(--accent-tiktok)]" : "text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"}`}>📊 TikTok Studio</button>
            <button onClick={() => setActiveSidebarTab("pricing")} className={`w-full text-left py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer ${activeSidebarTab === "pricing" ? "bg-neutral-100 dark:bg-neutral-800 text-[var(--accent-tiktok)]" : "text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"}`}>💎 Premium</button>
          </div>
          
          {activeSidebarTab === "chat" && (
            <div className="flex-1 flex flex-col min-h-0 border-t border-neutral-200 dark:border-neutral-800 pt-3">
              <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 mb-2 px-1">Discussions Récentes</span>
              <div className="flex-1 overflow-y-auto pr-1 space-y-1 max-h-[220px] md:max-h-[300px]">
                {chats.map((c) => (
                  <div 
                    key={c.id} 
                    onClick={() => setActiveChatId(c.id)}
                    className={`group w-full flex items-center justify-between py-1.5 px-2.5 rounded-xl text-xs font-medium cursor-pointer transition-all border border-transparent ${activeChatId === c.id ? "bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-[var(--accent-tiktok)]" : "text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"}`}
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
        </div>

        <div className="space-y-4 border-t pt-4 border-neutral-200 dark:border-neutral-800 flex justify-center shrink-0">
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 text-center rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 cursor-pointer hover:opacity-80 transition-all text-sm flex items-center justify-center w-10 h-10 shadow-sm">
            {isDarkMode ? "☀️" : "🌙"}
          </button>
        </div>
      </div>

      {!isSidebarOpen && (
        <button onClick={() => setIsSidebarOpen(true)} className="absolute left-4 top-[21px] z-30 font-bold text-xs border border-neutral-200 dark:border-neutral-800 px-2 py-1 rounded bg-white dark:bg-neutral-900 backdrop-blur-sm cursor-pointer">»</button>
      )}

      {/* 2. MAIN SPACE */}
      <main className="flex-1 z-10 flex flex-col relative h-screen overflow-hidden">
        
        <header className="p-4 px-6 border-b flex justify-between items-center bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
          <div className={`flex items-center gap-3.5 ${!isSidebarOpen ? "pl-10 transition-all" : ""}`}>
            <div className="p-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-sm flex items-center justify-center">
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
                <span className="text-xs font-medium text-neutral-500 dark:text-neutral-300">
                  {session.user?.name || session.user?.email}
                </span>
                <button onClick={handleLogoutAction} className="text-[10px] font-bold border px-2.5 py-1 rounded-lg border-red-500/30 text-red-400 hover:bg-red-500/10 cursor-pointer">
                  {t.logout}
                </button>
              </div>
            ) : (
              <button onClick={() => signIn("google")} className="text-xs font-bold border px-4 py-2 rounded-xl bg-[var(--accent-tiktok)] hover:opacity-90 text-white border-none cursor-pointer">
                {t.login}
              </button>
            )}
          </div>
        </header>

        {/* ECOSYSTEM FILTRÉ PAR LA CONNEXION */}
        <div className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-950">
          
          {status !== "authenticated" ? (
            <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center px-4 space-y-5">
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm flex items-center justify-center text-xl">🔒</div>
              <div className="space-y-1.5">
                <h2 className="text-base font-bold tracking-tight">Accès Privé</h2>
                <p className="text-xs text-neutral-500 leading-relaxed">Connecte-toi via Google pour débloquer de manière sécurisée ton tableau de bord et sauvegarder tes quotas.</p>
              </div>
              <button onClick={() => signIn("google")} className="w-full py-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-bold shadow-sm hover:bg-neutral-100 flex items-center justify-center gap-2 cursor-pointer">
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
                            <div className="px-4 py-2.5 rounded-2xl text-xs font-medium tracking-wide shadow-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
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
                      <form onSubmit={handleStartAnalysis} className="border p-6 space-y-4 rounded-xl bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold tracking-wider uppercase text-neutral-500">{t.analyzeLabel}</label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-3 flex items-center text-xs font-bold text-[var(--accent-tiktok)]">@</span>
                            <input type="text" required value={tiktokUsername} onChange={(e) => setTiktokUsername(e.target.value)} placeholder="nom_d_utilisateur" className="w-full pl-7 pr-3 py-2 text-xs rounded-xl border bg-transparent focus:outline-none focus:border-[var(--accent-tiktok)] border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100" />
                          </div>
                        </div>
                        {analysisError && <p className="text-xs text-red-500 font-medium bg-red-500/10 p-2.5 rounded-xl border border-red-500/20">{analysisError}</p>}
                        <button type="submit" className="w-full py-2.5 text-[11px] font-bold tracking-widest uppercase rounded-xl text-white bg-[var(--accent-tiktok)] hover:opacity-90 cursor-pointer">
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
                      <div className="p-6 rounded-xl border bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
                        <div className="flex justify-between items-start flex-wrap gap-4">
                          <div>
                            <h1 className="text-xl font-bold tracking-tight">{profileData?.nickname || profileData?.username}</h1>
                            <p className="text-xs text-[var(--accent-tiktok)] font-semibold mt-0.5">@{profileData?.username}</p>
                            {profileData?.signature && <p className="text-xs text-neutral-400 mt-2 max-w-xl">{profileData?.signature}</p>}
                          </div>
                          <button onClick={() => { setProfileData(null); setTiktokUsername(""); }} className="text-xs font-bold border border-neutral-200 dark:border-neutral-800 px-3 py-1.5 rounded-xl hover:border-[var(--accent-tiktok)] cursor-pointer">
                            {t.back}
                          </button>
                        </div>
                        <div className="flex gap-6 mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-800 text-xs">
                          <div><strong className="text-foreground">{profileData?.followers}</strong> {t.followers}</div>
                          <div>Thématique : <strong className="text-blue-400 font-bold uppercase">{profileData?.advancedAnalysis?.creatorType}</strong></div>
                        </div>
                      </div>

                      <div className="flex gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-px text-xs">
                        <button onClick={() => setActiveStudioTab("videos")} className={`pb-2 font-bold uppercase tracking-wider cursor-pointer ${activeStudioTab === "videos" ? "border-b-2 border-[var(--accent-tiktok)] text-foreground" : "text-neutral-500"}`}>{t.recents}</button>
                        <button onClick={() => setActiveStudioTab("ai")} className={`pb-2 font-bold uppercase tracking-wider cursor-pointer ${activeStudioTab === "ai" ? "border-b-2 border-[var(--accent-tiktok)] text-foreground" : "text-neutral-500"}`}>{t.report}</button>
                      </div>

                      {activeStudioTab === "videos" && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {profileData?.videos?.map((vid) => {
                            const isVideoUrl = vid.thumb?.includes(".mp4") || videoFallbacks[vid.id];
                            return (
                              <div key={vid.id} className="rounded-xl border overflow-hidden flex flex-col justify-between bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
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
                                  <p className="text-[11px] line-clamp-2 text-neutral-400">{vid.title || "Sans titre"}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {activeStudioTab === "ai" && (
                        <div className="space-y-6">
                          <div className="p-5 rounded-xl border flex justify-between items-center bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
                            <div className="space-y-1">
                              <h3 className="text-xs font-bold uppercase tracking-wider">{t.diagnostic}</h3>
                              <p className="text-[11px] text-neutral-500 max-w-md">{t.calc}</p>
                            </div>
                            <div className="text-xl font-black text-[#10b981]">{profileData?.score || 0}/100</div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                            <div className="p-4 rounded-xl border bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
                              <span className="text-neutral-500">Ratio d'engagement</span>
                              <span className="block text-base font-bold mt-1 text-foreground">{profileData?.advancedAnalysis?.metrics?.likeRate || "0%"}</span>
                            </div>
                            <div className="p-4 rounded-xl border bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
                              <span className="text-neutral-500">Taux de Partage</span>
                              <span className="block text-base font-bold mt-1 text-[var(--accent-tiktok)]">{profileData?.advancedAnalysis?.metrics?.shareRate || "0%"}</span>
                            </div>
                            <div className="p-4 rounded-xl border bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
                              <span className="text-neutral-500">Durée des Contenus</span>
                              <span className="block text-base font-bold mt-1 text-blue-500">{profileData?.advancedAnalysis?.avgDuration || "N/A"}</span>
                            </div>
                          </div>

                          <div className="p-5 rounded-xl border space-y-4 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
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

                          <div className="p-5 rounded-xl border space-y-4 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
                            <h3 className="text-xs font-bold uppercase tracking-wider">{t.generator}</h3>
                            <p className="text-xs text-neutral-500">{t.genDesc}</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                              <button onClick={() => handleGenerateScriptFromStudio("Hook Hard")} className="p-3 text-left border border-neutral-200 dark:border-neutral-800 rounded-xl hover:border-[var(--accent-tiktok)] cursor-pointer">
                                <strong className="block text-foreground mb-0.5">Hook Agressif</strong> Pour casser le scroll.
                              </button>
                              <button onClick={() => handleGenerateScriptFromStudio("Structure Rétention")} className="p-3 text-left border border-neutral-200 dark:border-neutral-800 rounded-xl hover:border-[var(--accent-tiktok)] cursor-pointer">
                                <strong className="block text-foreground mb-0.5">Forte Rétention</strong> Pour rallonger le watchtime.
                              </button>
                              <button onClick={() => handleGenerateScriptFromStudio("CTA Stratégique")} className="p-3 text-left border border-neutral-200 dark:border-neutral-800 rounded-xl hover:border-[var(--accent-tiktok)] cursor-pointer">
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
                    <div className="border rounded-xl p-6 flex flex-col justify-between bg-white dark:bg-neutral-900/60 border-neutral-200 dark:border-neutral-800 shadow-sm relative">
                      <div className="space-y-4">
                        <div>
                          <span className="text-[9px] font-bold text-neutral-400 bg-neutral-500/10 px-2 py-0.5 rounded-xl uppercase">ACCÈS STANDARD</span>
                          <div className="mt-2 flex items-baseline gap-0.5">
                            <span className="text-2xl font-black text-foreground">0€</span>
                            <span className="text-xs text-neutral-500">/toujours</span>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 space-y-2 text-[11px] text-neutral-400">
                          <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-300">✓ 15 messages max par jour</div>
                          <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-300">✓ 1 analyse de profil max tous les 7 jours</div>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-800 text-center">
                        <span className="text-xs text-emerald-500 font-bold block bg-emerald-500/10 py-2 rounded-xl">
                          {isSubscribed ? "Version standard disponible" : "Votre plan gratuit actuel"}
                        </span>
                      </div>
                    </div>

                    {/* PLAN PREMIUM PRO */}
                    <div className="border rounded-xl p-6 flex flex-col justify-between bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 shadow-md relative ring-1 ring-[var(--accent-tiktok)]/30">
                      <div className="space-y-4">
                        <div>
                          <span className="text-[9px] font-bold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-xl uppercase">{t.offerBadge}</span>
                          <div className="mt-2 flex items-baseline gap-0.5">
                            <span className="text-2xl font-black text-foreground">9,99€</span>
                            <span className="text-xs text-neutral-500">/mois</span>
                          </div>
                          {!isSubscribed && !hasUsedTrial && (
                            <p className="text-[10px] text-emerald-500 font-medium mt-1">🚀 {t.trialText}</p>
                          )}
                          {!isSubscribed && hasUsedTrial && (
                            <p className="text-[10px] text-amber-500 font-medium mt-1">Éligibilité : Paiement immédiat (Essai déjà consommé)</p>
                          )}
                        </div>

                        <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 space-y-2 text-[11px] text-neutral-400">
                          <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-300">✓ Chat & Scripts IA <strong>Illimités</strong></div>
                          <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-300">✓ Analyses de profils TikTok <strong>Illimitées</strong></div>
                          <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-300">✓ Injection de niche automatique & sans restriction</div>
                        </div>
                      </div>

                      <div className="mt-6">
                        {isSubscribed ? (
                          <div className="space-y-2">
                            <span className="text-xs text-center text-blue-400 font-bold block bg-blue-500/10 py-2 rounded-xl">
                              {t.memberPro}
                            </span>
                            <button 
                              onClick={handleSubscribe} 
                              disabled={loadingSubscription}
                              className="w-full py-1.5 text-[9px] font-bold uppercase rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/5 transition-all cursor-pointer disabled:opacity-50"
                            >
                              {loadingSubscription ? "Chargement..." : t.cancelBtn}
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={handleSubscribe} 
                            disabled={loadingSubscription}
                            className="w-full py-2.5 text-[10px] font-bold uppercase rounded-xl cursor-pointer bg-[var(--accent-tiktok)] text-white hover:opacity-90 shadow-sm active:scale-[0.98] disabled:opacity-50"
                          >
                            {loadingSubscription ? "Redirection..." : hasUsedTrial ? "S'abonner maintenant" : t.startTrial}
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
            <div className="max-w-2xl mx-auto relative flex items-center rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm pr-2 pl-4 py-2">
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