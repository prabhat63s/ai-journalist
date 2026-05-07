"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { Newspaper, ArrowRight, Plus, History, ChevronLeft, CheckCircle2, Loader2, LogOut, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { getFriendlyErrorText, toastError, toastSuccess, toastInfo } from "@/lib/friendly-errors";
import { useAuth } from "@/context/AuthContext";
import { Message, GroundingSource, ArticleData } from "@/types/journalist.types";
import { useRouter, useParams } from "next/navigation";
import {
  generateContent,
  generateImage,
  generateSocialKit,
  getReports,
  deleteReport,
  saveReport,
  getConversation,
  saveConversation,
  getConversations
} from "@/services/journalist.service";
import {
  MobileViewToggle,
  MessageBubble,
  ChatInput,
  ArticleEditor,
  HistoryPanel,
  ThemeToggle
} from "@/components/journalist";
import { AuthModal } from "@/components/auth/AuthModal";
import { useJournalistStore } from "@/store";

export default function Newsroom() {
  const { user, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const convId = params?.id as string | undefined;

  // State
  const {
    messages,
    setMessages,
    dbReports,
    setDbReports,
    dbSessions,
    activeReportId,
    setActiveReportId,
    activeSessionId,
    setActiveSessionId,
    selectedAssistantMsgId,
    setSelectedAssistantMsgId,
    loadSessions,
  } = useJournalistStore();

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [mobileView, setMobileView] = useState<"chat" | "editor">("chat");
  const [input, setInput] = useState("");
  const [sources, setSources] = useState<string[]>([]);
  const [groundingSources, setGroundingSources] = useState<GroundingSource[]>([]);
  const [persona, setPersona] = useState("Analytical");
  const [brandVoice, setBrandVoice] = useState("Default");
  const [language, setLanguage] = useState("English");
  const [enableWebSearch, setEnableWebSearch] = useState(true);
  const [isGeneratingSocialKit, setIsGeneratingSocialKit] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentSessionReportIdRef = useRef<number | null>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle loading specific conversation if ID is in URL
  useEffect(() => {
    const fetchConv = async () => {
      if (convId && user?.email) {
        try {
          const conv = await getConversation(convId, user.email);
          if (conv && conv.messages) {
            const formattedMessages = conv.messages.map((m: any) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              articleData: m.article_data,
              imageUrl: m.image_url,
              socialKit: m.social_kit,
              updatedAt: m.created_at ? new Date(m.created_at).getTime() : Date.now()
            }));
            setMessages(formattedMessages);
            setActiveSessionId(convId);
            
            // Find latest assistant report to show in editor
            const lastAssistantMsg = [...formattedMessages].reverse().find(m => m.role === "assistant" && m.articleData);
            if (lastAssistantMsg) {
              setSelectedAssistantMsgId(lastAssistantMsg.id);
              currentSessionReportIdRef.current = lastAssistantMsg.articleData.id;
              setActiveReportId(lastAssistantMsg.articleData.id);
            }
          }
        } catch (err) {
          console.error("Failed to load conversation:", err);
        }
      }
    };
    fetchConv();
  }, [convId, user?.email, setMessages, setActiveSessionId, setSelectedAssistantMsgId, setActiveReportId]);

  useEffect(() => {
    if (user?.email) {
      loadSessions(user.email);
    }
  }, [user?.email, loadSessions]);

  const handleStopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      toastInfo("Generation stopped by user.");
    }
  }, []);

  const handleSend = useCallback(async () => {
    if ((!input.trim() && sources.length === 0 && groundingSources.length === 0) || isLoading) return;

    const userText = input.trim();
    setInput("");
    setSources([]);
    setGroundingSources([]);

    const userMsgId = Math.random().toString(36).slice(2);
    const pendingId = Math.random().toString(36).slice(2);

    const history = messages.map(m => ({ role: m.role, content: m.content }));

    // Always append new user and assistant messages for every query
    setMessages(prev => [
      ...prev,
      { id: userMsgId, role: "user", content: userText },
      {
        id: pendingId,
        role: "assistant",
        content: "Generation initializing...",
        pending: true,
        pendingStatuses: ["Contacting Newsroom..."]
      },
    ]);

      const currentSessionId = activeSessionId || crypto.randomUUID();
      
      // If it's a new conversation, redirect to the new UUID URL
      if (!activeSessionId) {
        setActiveSessionId(currentSessionId);
        window.history.pushState({}, "", `/c/${currentSessionId}`);
      }

    setIsLoading(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const result = await generateContent(
        user?.email || "",
        {
          query: userText,
          category: "Technology",
          tone: "Journalistic",
          persona,
          enable_web_search: enableWebSearch,
          target_audience: "General Professionals",
          sources,
          grounding_sources: groundingSources,
          history,
          brand_voice: brandVoice !== "Default" ? brandVoice : undefined,
          language,
          report_id: currentSessionReportIdRef.current ?? undefined,
          session_id: currentSessionId
        },
        (statusMsg) => {
          setMessages(prev => prev.map(m =>
            m.id === pendingId
              ? { ...m, pendingStatuses: [...(m.pendingStatuses || []), statusMsg] }
              : m
          ));
        },
        (chunk) => {
          setMessages(prev => prev.map(m =>
            m.id === pendingId
              ? {
                ...m,
                content: m.content === "Generation initializing..." ? chunk : m.content + chunk
              }
              : m
          ));
        },
        controller.signal
      );
      setMessages(prev => prev.map(m => {
        if (m.id === pendingId) {
          const newVersions = [result];
          return {
            ...m,
            pending: false,
            content: result.markdown_content,
            articleData: result,
            imageUrl: result.image_url || null,
            socialKit: result.social_kit || null,
            versions: newVersions,
            activeVersionIndex: 0,
            updatedAt: Date.now()
          };
        }
        return m;
      }));

      // UPSERT: If we just created the first report in a session, track its ID.
      // If result.id changed, we update the list.
      if (result.id) {
        setActiveReportId(result.id);
        currentSessionReportIdRef.current = result.id;
        setDbReports(prev => {
          const index = prev.findIndex(r => r.id === result.id);
          if (index !== -1) {
            const updated = [...prev];
            updated[index] = result;
            return updated;
          }
          return [result, ...prev];
        });
      }

      setSelectedAssistantMsgId(pendingId);
      setMobileView("editor");

      // Refresh sessions in background so history panel shows updated version count
      if (user?.email) loadSessions(user.email, true);

      // --- SAVE FULL CONVERSATION TO DB ---
      if (user?.email) {
        const title = messages[0]?.content || userText;
        const updatedMessages = [
          ...messages,
          { id: userMsgId, role: "user", content: userText },
          {
            id: pendingId,
            role: "assistant",
            content: result.markdown_content,
            articleData: result,
            imageUrl: result.image_url || null,
            socialKit: result.social_kit || null,
            updatedAt: Date.now()
          }
        ];
        saveConversation(currentSessionId, user.email, updatedMessages, title, "Technology").catch(e => console.error("Auto-save failed:", e));
      }

    } catch (err) {
      if ((err as Error).name === "AbortError") {
        setMessages(prev => prev.map(m => m.id === pendingId ? { ...m, pending: false, content: "Generation cancelled by user." } : m));
        return;
      }
      const msg = getFriendlyErrorText(err, "generate_content");
      // Surface API key errors as a persistent banner so users can't miss them
      const errStr = (err instanceof Error ? err.message : String(err)).toLowerCase();
      if (errStr.includes("missing ai provider") || errStr.includes("api key") || errStr.includes("provider key")) {
        setApiKeyError(msg);
      }
      setMessages(prev => prev.map(m =>
        m.id === pendingId
          ? {
            ...m,
            pending: false,
            content: `### Editorial Update Required\n\n${msg}`
          }
          : m
      ));
      toastError(err, "generate_content");
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [input, sources, groundingSources, isLoading, messages, persona, enableWebSearch, user?.email, brandVoice, language]);

  const handleNewChat = () => {
    setMessages([]);
    setSelectedAssistantMsgId(null);
    setIsHistoryOpen(false);
    setActiveReportId(null);
    setActiveSessionId(null);
    currentSessionReportIdRef.current = null;
    router.push("/");
  };

  const handleImageGenerate = async (msgId: string, topic: string, category: string, articleContent?: string, reportId?: number) => {
    try {
      const url = await generateImage(topic, category, user?.email || "", articleContent, reportId);
      if (url) {
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, imageUrl: url } : m));
        // Update archive list
        if (reportId) {
          setDbReports(prev => prev.map(r => r.id === reportId ? { ...r, image_url: url } : r));
        }
        toastSuccess("AI Cover Image generated successfully! do check in editor section!");
      }
    } catch (err) {
      toastError(err, "generate_image");
    }
  };

  const handleSocialKitGenerate = async (msgId: string, content: string, reportId?: number, options?: { platforms: string[], moreHashtags: boolean, prompt?: string }) => {
    try {
      setIsGeneratingSocialKit(true);
      const kit = await generateSocialKit(content, user?.email || "", reportId, options);
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, socialKit: kit } : m));
      // Update archive list
      if (reportId) {
        setDbReports(prev => prev.map(r => r.id === reportId ? { ...r, social_kit: kit } : r));
      }
      toastSuccess("Social Media Kit generated successfully! do check in editor section!");
    } catch {
      toastError("Failed to generate social media kit.");
    } finally {
      setIsGeneratingSocialKit(false);
    }
  };

  const handleManualSave = async (content: string) => {
    if (!currentSessionReportIdRef.current || !user?.email || isSaving) return;

    try {
      setIsSaving(true);
      const res = await saveReport(
        currentSessionReportIdRef.current,
        user.email,
        content
      );

      if (res) {
        toastSuccess("Content saved successfully!");
        loadSessions(user.email, true);
      }
    } catch (err) {
      toastError(err, "save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteReport = async (reportId: number) => {
    try {
      if (!user?.email) return;
      await deleteReport(reportId, user.email);

      // Update local states
      setDbReports(prev => prev.filter(r => r.id !== reportId));
      setMessages(prev => prev.filter(m => {
        // Remove both the user query and assistant report associated with this ID
        const suffix = `-${reportId}`;
        return !m.id.endsWith(suffix);
      }));

      if (selectedAssistantMsgId === `report-${reportId}`) {
        setSelectedAssistantMsgId(null);
      }

      toastSuccess("Report deleted successfully.");
    } catch (err) {
      console.error("Failed to delete report:", err);
      toastError(err, "delete_report");
    }
  };

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <AuthModal />;
  }

  const currentArticleMsg = messages.find(m => m.id === selectedAssistantMsgId) || [...messages].reverse().find(m => m.role === "assistant" && m.articleData);

  return (
    <div className="relative flex flex-col h-full bg-background overflow-hidden font-sans">
      {/* Ambient Background Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-5%] left-[-5%] w-[35%] h-[35%] bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[35%] h-[35%] bg-primary/5 rounded-full blur-[100px]" />
      </div>

      <MobileViewToggle
        view={mobileView}
        setView={setMobileView}
        onNewChat={handleNewChat}
        onHistoryOpen={() => setIsHistoryOpen(true)}
      />

      <div className="relative z-10 flex flex-1 overflow-hidden">

        {/* LEFT: Chat Panel */}
        <div className={`w-full md:w-[400px] shrink-0 flex flex-col bg-(--bg-primary) border-r border-border/40 ${mobileView === "chat" ? "flex" : "hidden md:flex"}`}>

          {/* Chat Panel Header - Premium Controls (Hidden on mobile as it's now in the unified top header) */}
          <div className="sticky top-0 z-40 hidden md:flex items-center justify-between px-3 py-2.5 bg-background/60 backdrop-blur-xl border-b border-border/10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 shadow-sm">
                <Newspaper size={16} className="text-primary" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-foreground/80">Newsroom</span>
            </div>

            <div className="flex items-center gap-1.5">
              <ThemeToggle />
              <button
                onClick={handleNewChat}
                className="flex items-center gap-2 p-2 rounded-lg text-[9px] font-bold uppercase tracking-widest bg-primary text-white hover:bg-primary/90 transition-all active:scale-95"
              >
                <Plus size={14} strokeWidth={3} />
                <span className="hidden xs:inline">New Chat</span>
              </button>
              <button
                onClick={() => setIsHistoryOpen(true)}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-muted hover:bg-surface/80 hover:text-foreground border border-transparent hover:border-border/40 transition-all"
                title="View History"
              >
                <History size={16} />
              </button>
            </div>
          </div>

          {/* Persistent API key error banner */}
          {apiKeyError && (
            <div className="mx-3 mt-2 flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-[11px] text-red-400">
              <span className="mt-0.5 shrink-0 text-red-400">⚠</span>
              <div className="flex-1">
                <span className="font-semibold">API Key Required — </span>
                {apiKeyError}
              </div>
              <button onClick={() => setApiKeyError(null)} className="shrink-0 text-red-400/60 hover:text-red-300 transition-colors text-base leading-none">×</button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
            {isHistoryOpen ? (
              <HistoryPanel
                sessions={dbSessions}
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
                onSelect={(idStr) => {
                  if (idStr.startsWith("session-")) {
                    const sid = idStr.replace("session-", "");
                    router.push(`/c/${sid}`);
                  } else {
                    const numericId = parseInt(idStr.split("-")[1]);
                    const selectedReport = dbReports.find(r => r.id === numericId);
                    if (selectedReport?.session_id) {
                      router.push(`/c/${selectedReport.session_id}`);
                    } else if (selectedReport?.id) {
                      router.push(`/c/sess-${selectedReport.id}`);
                    }
                  }
                  setIsHistoryOpen(false);
                }}
                onDelete={handleDeleteReport}
                inline
              />
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-b from-transparent to-surface/5">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-20 h-20 p-5 rounded-[2.5rem] bg-gradient-to-br from-primary via-primary/80 to-primary/40 flex items-center justify-center mb-4 shadow-[0_20px_50px_rgba(var(--primary-rgb),0.3)] relative group"
                >
                  <Newspaper className="w-8 h-8 text-white relative z-10" />
                  <div className="absolute inset-0 rounded-[2.5rem] bg-primary animate-pulse blur-2xl opacity-20" />
                  <div className="absolute -inset-1 rounded-[2.6rem] bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.div>
                <h2 className="text-[28px] font-bold text-foreground mb-2 tracking-tight">AI Journalist</h2>
                <p className="text-[10px] font-bold text-primary mb-12 max-w-[260px] leading-relaxed uppercase tracking-[0.3em] opacity-80">
                  Autonomous Editorial Engine
                </p>
                <div className="w-full flex flex-col gap-4">
                  {[
                    "Investigate the impact of new semiconductor subsidies on India's hardware startups.",
                    "Analyze how the shift to EV is disrupting traditional auto-component hubs in Pune.",
                    "Draft an investigative report on the sustainability of green hydrogen in India's heavy industry.",
                  ].map((s, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * i }}
                      onClick={() => setInput(s)}
                      className="w-full text-left p-6 rounded-xl border border-border/20 bg-surface/30 hover:border-primary/40 hover:bg-surface/50 transition-all text-xs text-muted-dark hover:text-foreground flex items-center justify-between group backdrop-blur-md"
                    >
                      <span className="leading-snug pr-6">{s}</span>
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary opacity-0 group-hover:opacity-100 transition-all shrink-0 -translate-x-2 group-hover:translate-x-0">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-2">
                {messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    isSelected={selectedAssistantMsgId === msg.id}
                    onSelect={() => setSelectedAssistantMsgId(msg.id)}
                    onRewrite={() => {
                      if (msg.articleData) {
                        const cleanTopic = msg.articleData.topic.replace(/^Please rewrite the article about\s*["']?|["']?\s*$/gi, '').trim();
                        setInput(`Please rewrite the article about "${cleanTopic}"`);
                      }
                    }}
                    onGenerateImage={() => msg.articleData && handleImageGenerate(msg.id, msg.articleData.topic, msg.articleData.category, msg.articleData.markdown_content, msg.articleData.id)}
                    onGenerateSocialKit={() => msg.articleData && handleSocialKitGenerate(msg.id, msg.articleData.markdown_content, msg.articleData.id)}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <ChatInput
            input={input}
            setInput={setInput}
            onSend={handleSend}
            onStop={handleStopGeneration}
            isLoading={isLoading}
            email={user?.email || ""}
            sources={sources}
            setSources={setSources}
            groundingSources={groundingSources}
            setGroundingSources={setGroundingSources}
            persona={persona}
            setPersona={setPersona}
            brandVoice={brandVoice}
            setBrandVoice={setBrandVoice}
            language={language}
            setLanguage={setLanguage}
            enableWebSearch={enableWebSearch}
            setEnableWebSearch={setEnableWebSearch}
          />
          
          <div className="p-3 border-t border-border/40 bg-surface/50 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3 px-2">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 border border-primary/30">
                  <User size={14} className="text-primary" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-bold text-foreground truncate">{user?.name || 'Journalist'}</span>
                  <span className="text-[9px] text-muted truncate">{user?.email}</span>
                </div>
              </div>
              <button
                onClick={logout}
                className="p-2 rounded-lg text-muted hover:bg-red-500/10 hover:text-red-500 transition-all active:scale-95 group"
                title="Logout"
              >
                <LogOut size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: Editor Panel */}
        <div className={`flex-1 flex flex-col min-w-0 bg-[var(--bg-primary)] ${mobileView === "editor" ? "flex" : "hidden md:flex"}`}>
          {currentArticleMsg ? (
            <ArticleEditor
              key={`${currentArticleMsg.id}-${currentArticleMsg.activeVersionIndex || 0}`}
              id={currentArticleMsg.id}
              content={currentArticleMsg.articleData?.markdown_content || currentArticleMsg.content}
              imageUrl={currentArticleMsg.imageUrl}
              socialKit={currentArticleMsg.socialKit}
              audit={currentArticleMsg.articleData?.audit}
              sources={currentArticleMsg.articleData?.sources}
              articleData={currentArticleMsg.articleData}
              onGenerateImage={(t, c, content, rId) => handleImageGenerate(currentArticleMsg.id, t, c, content, rId)}
              onGenerateSocialKit={(content, rId, options) => handleSocialKitGenerate(currentArticleMsg.id, content, rId, options)}
              isGeneratingSocialKit={isGeneratingSocialKit}
              onManualSave={handleManualSave}
              isSaving={isSaving}
              onSave={(newContent) => {
                setMessages(prev => prev.map(m =>
                  m.id === currentArticleMsg.id
                    ? { ...m, content: newContent, articleData: m.articleData ? { ...m.articleData, markdown_content: newContent } : undefined }
                    : m
                ));
              }}
              brandVoice={brandVoice}
              persona={persona}
              email={user?.email || ""}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center relative bg-background px-8 text-center overflow-hidden">
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)", backgroundSize: "32px 32px" }} />
              <div className="relative z-10 flex flex-col items-center max-w-[440px]">
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="w-24 h-24 mb-10 rounded-[2.5rem] bg-gradient-to-br from-surface to-transparent flex items-center justify-center border border-border/40 shadow-2xl relative"
                >
                  <Newspaper className="w-12 h-12 text-primary" />
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-lg bg-success/20 border border-success/40 flex items-center justify-center">
                    <CheckCircle2 className="w-3 h-3 text-success" />
                  </div>
                </motion.div>
                <h2 className="text-[24px] font-bold text-foreground mb-3 tracking-tighter">Your Canvas Awaits</h2>
                <p className="text-[14px] text-muted leading-relaxed mb-10 text-pretty font-medium opacity-80">
                  Describe a topic in the chat panel to generate a deep-dive semantic article with visuals and social assets.
                </p>
                <div className="flex gap-3 flex-wrap justify-center">
                  {["SEO Optimization", "Research Grounding", "AI Visuals", "Social Kits"].map(tag => (
                    <div key={tag} className="px-4 py-2 rounded-2xl border border-border/40 bg-surface/50 text-xs uppercase tracking-widest text-muted flex items-center gap-2.5 hover:border-primary/30 transition-colors">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                      {tag}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
