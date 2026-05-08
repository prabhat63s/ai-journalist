"use client";

import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Cpu, Car, Leaf, Volume2, VolumeX, RotateCcw, Image as ImageIcon, Check, Megaphone, Loader2, X, Maximize2, ExternalLink, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatInput, ArticleEditor } from '@/components/journalist';
import { ThemeToggle, StatusLoader, StyledMarkdownViewer } from '@/components/shared';
import { useAuth } from '@/context/AuthContext';
import { useJournalistStore } from '@/store';
import { generateContent, saveConversation, generateImage, generateSocialKit, getConversation } from '@/services/journalist.service';
import { cn } from '@/lib/utils';
import { Message, GroundingSource } from '@/types/journalist.types';
import { v4 as uuidv4 } from 'uuid';
import { useSearchParams, useRouter } from 'next/navigation';

export default function ChatPage() {
    const { user } = useAuth();
    const router = useRouter();
    const {
        messages,
        setMessages,
        activeSessionId,
        setActiveSessionId,
        loadSessions,
        dbSessions,
        selectedAssistantMsgId,
        setSelectedAssistantMsgId,
        showEditor,
        setShowEditor
    } = useJournalistStore();

    const searchParams = useSearchParams();
    const sessionIdParam = searchParams.get('session');

    // Chat Input State
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [sources, setSources] = useState<string[]>([]);
    const [groundingSources, setGroundingSources] = useState<GroundingSource[]>([]);
    const [persona, setPersona] = useState("Investigative");
    const [language, setLanguage] = useState("English");
    const [enableWebSearch, setEnableWebSearch] = useState(true);
    const [isGeneratingSocialKit, setIsGeneratingSocialKit] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isGenImage, setIsGenImage] = useState(false);
    const [isGenKit, setIsGenKit] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const abortControllerRef = useRef<AbortController | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Sync with URL session param
    useEffect(() => {
        if (sessionIdParam && sessionIdParam !== activeSessionId) {
            setActiveSessionId(sessionIdParam);
        }
    }, [sessionIdParam, activeSessionId, setActiveSessionId]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Load session messages when activeSessionId changes
    useEffect(() => {
        const loadSessionData = async () => {
            if (activeSessionId && user?.email) {
                // If messages already belong to this session, don't reload unless force is needed
                // This is a simple heuristic; a better one would track the loaded session ID
                try {
                    const conv = await getConversation(activeSessionId, user.email);
                    if (conv && conv.messages) {
                        const formattedMessages: Message[] = conv.messages.map((m: any) => ({
                            id: m.id,
                            role: m.role,
                            content: m.content,
                            articleData: m.article_data,
                            imageUrl: m.image_url,
                            socialKit: m.social_kit,
                            updatedAt: new Date(m.created_at).getTime()
                        }));
                        setMessages(formattedMessages);

                        // Auto-select the latest message with article data to show in editor
                        const latestArticleMsg = [...formattedMessages].reverse().find(m => m.articleData);
                        if (latestArticleMsg) {
                            setSelectedAssistantMsgId(latestArticleMsg.id);
                        } else {
                            setSelectedAssistantMsgId(null);
                        }
                    }
                } catch (err: any) {
                    console.error("Failed to load conversation:", err);
                    if (err.message?.includes("not found") || err.message?.includes("404")) {
                        setActiveSessionId(null);
                        router.push('/chat');
                    }
                }
            }
        };
        loadSessionData();
    }, [activeSessionId, user?.email, setMessages]);

    const handleSendMessage = async () => {
        if ((!input.trim() && sources.length === 0 && groundingSources.length === 0) || !user?.email || isLoading) return;

        const currentSessionId = activeSessionId || uuidv4();
        if (!activeSessionId) setActiveSessionId(currentSessionId);

        const messageContent = input.trim() || (sources.length > 0 || groundingSources.length > 0 ? "Analyze the provided sources." : "");
        if (!messageContent && !user?.email) return;

        const userMessage: Message = {
            id: uuidv4(),
            role: 'user',
            content: messageContent,
            updatedAt: Date.now()
        };

        const assistantMessageId = uuidv4();
        const initialAssistantMessage: Message = {
            id: assistantMessageId,
            role: 'assistant',
            content: "",
            pending: true,
            pendingStatuses: ["Initializing research..."],
            updatedAt: Date.now()
        };

        setMessages((prev) => [...prev, userMessage, initialAssistantMessage]);
        setInput("");
        setIsLoading(true);

        abortControllerRef.current = new AbortController();

        try {
            const history = messages.map(m => ({ role: m.role, content: m.content }));

            const result = await generateContent(
                user.email,
                {
                    query: messageContent,
                    category: "General",
                    tone: "Professional",
                    persona: persona,
                    enable_web_search: enableWebSearch,
                    target_audience: "General",
                    sources: sources,
                    grounding_sources: groundingSources.map(s => ({ name: s.name, content: s.content })),
                    history: history,
                    language: language,
                    session_id: currentSessionId
                },
                (status) => {
                    setMessages((prev) => prev.map(m =>
                        m.id === assistantMessageId
                            ? { ...m, pendingStatuses: [...(m.pendingStatuses || []), status] }
                            : m
                    ));
                },
                (chunk) => {
                    setMessages((prev) => prev.map(m =>
                        m.id === assistantMessageId
                            ? { ...m, content: m.content + chunk }
                            : m
                    ));
                },
                abortControllerRef.current.signal
            );

            const finalAssistantMessage: Message = {
                ...initialAssistantMessage,
                content: result.markdown_content,
                articleData: result,
                pending: false,
                updatedAt: Date.now()
            };

            setMessages((prev) => {
                const newMessages = prev.map(m => m.id === assistantMessageId ? finalAssistantMessage : m);
                // Background save
                saveConversation(currentSessionId, user.email, newMessages, result.topic || input.slice(0, 30));
                return newMessages;
            });

            // Refresh sessions list in sidebar
            loadSessions(user.email, true);

        } catch (err: any) {
            if (err.name === 'AbortError') return;
            setMessages((prev) => prev.map(m =>
                m.id === assistantMessageId
                    ? { ...m, content: `Error: ${err.message}`, pending: false }
                    : m
            ));
        } finally {
            setIsLoading(false);
            abortControllerRef.current = null;
        }
    };

    const handleStop = () => {
        abortControllerRef.current?.abort();
        setIsLoading(false);
    };

    const handleManualSave = async (content: string) => {
        // Implementation for manual save
        console.log("Saving content:", content);
    };

    const handleSpeech = (msg: Message) => {
        if (isSpeaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            return;
        }
        const utterance = new SpeechSynthesisUtterance(msg.content);
        utterance.onend = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
        setIsSpeaking(true);
    };

    const onRewrite = (msg: Message) => {
        setInput(`Refine and rewrite the following report for better clarity: \n\n${msg.content.slice(0, 500)}...`);
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const onGenerateImage = async (msg: Message) => {
        if (!user?.email || !msg.articleData) return;
        setIsGenImage(true);
        try {
            const url = await generateImage(msg.articleData.topic || "Investigation", "News", user.email, msg.content, msg.articleData.id);
            setMessages(prev => prev.map(m => m.id === msg.id ? {
                ...m,
                articleData: m.articleData ? { ...m.articleData, image_url: url } : undefined,
                imageUrl: url
            } : m));
        } catch (err) {
            console.error(err);
        } finally {
            setIsGenImage(false);
        }
    };

    const onGenerateSocialKit = async (msg: Message) => {
        if (!user?.email || !msg.articleData) return;
        setIsGenKit(true);
        try {
            const kit = await generateSocialKit(msg.content, user.email, msg.articleData.id);
            setMessages(prev => prev.map(m => m.id === msg.id ? {
                ...m,
                articleData: m.articleData ? { ...m.articleData, social_kit: kit } : undefined,
                socialKit: kit
            } : m));
        } catch (err) {
            console.error(err);
        } finally {
            setIsGenKit(false);
        }
    };

    const handleLinkClick = (href: string) => {
        if (!showEditor) {
            setPreviewUrl(href);
        } else {
            window.open(href, '_blank', 'noopener,noreferrer');
        }
    };

    const currentArticleMsg = messages.find(m => m.id === selectedAssistantMsgId) || [...messages].reverse().find(m => m.role === "assistant" && m.articleData);

    return (
        <div className='flex-1 flex flex-col overflow-hidden bg-background'>
            {currentArticleMsg && (
                <div className="flex items-center h-12 border-b border-border/40 bg-background px-4 shrink-0 z-30 overflow-hidden">
                    {/* Chat Title / Topic */}
                    <div className="flex-1 flex items-center min-w-0">
                        {activeSessionId && (
                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-500">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
                                <h2 className="text-[14px] font-semibold capitalize text-foreground truncate max-w-[250px] md:max-w-[400px]">
                                    {dbSessions.find(s => s.session_id === activeSessionId)?.topic || "New Investigation"}
                                </h2>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowEditor(!showEditor)}
                            className="p-1.5 px-3 rounded-lg border border-border/60 bg-background hover:bg-surface hover:border-primary/30 transition-all flex items-center gap-2 text-[11px] font-bold text-primary shadow-sm"
                        >
                            {showEditor ? <X size={14} /> : <Maximize2 size={14} />}
                            <span className="uppercase tracking-wider">{showEditor ? "CLOSE EDITOR" : "OPEN EDITOR"}</span>
                        </button>
                        <ThemeToggle />
                    </div>
                </div>
            )}

            <div className="flex-1 flex overflow-hidden">
                {/* Left: Chat Panel */}
                <div className={cn(
                    "flex flex-col border-r border-border/40 transition-all duration-300",
                    currentArticleMsg && showEditor ? "w-full md:w-[350px]" : "w-full items-center"
                )}>
                {/* Scrollable Content */}
                <div className="flex-1 w-full overflow-y-auto hide-scrollbar">
                    <div className={cn(
                        "w-full px-4 transition-all duration-300",
                        currentArticleMsg && showEditor ? "max-w-full" : "max-w-3xl mx-auto"
                    )}>
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center min-h-screen text-center py-20">
                                <div className="mb-4 flex flex-col items-center">
                                    <h1 className="text-[42px] font-serif font-medium text-[#1a1a1a] tracking-tight">
                                        Good evening, {user?.name?.split(' ')[0] || 'Researcher'}
                                    </h1>
                                </div>

                                <div className="w-full transform translate-y-2">
                                    <ChatInput
                                        input={input}
                                        setInput={setInput}
                                        onSend={handleSendMessage}
                                        onStop={handleStop}
                                        isLoading={isLoading}
                                        email={user?.email || ""}
                                        sources={sources}
                                        setSources={setSources}
                                        groundingSources={groundingSources}
                                        setGroundingSources={setGroundingSources}
                                        persona={persona}
                                        setPersona={setPersona}
                                        language={language}
                                        setLanguage={setLanguage}
                                        enableWebSearch={enableWebSearch}
                                        setEnableWebSearch={setEnableWebSearch}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 px-4 w-full">
                                    {[
                                        {
                                            text: "Investigate the impact of new semiconductor subsidies on India's hardware startups.",
                                            icon: <Cpu size={20} />,
                                            color: "blue"
                                        },
                                        {
                                            text: "Analyze how the shift to EV is disrupting traditional auto-component hubs in Pune.",
                                            icon: <Car size={20} />,
                                            color: "purple"
                                        },
                                        {
                                            text: "Draft an investigative report on the sustainability of green hydrogen in India's heavy industry.",
                                            icon: <Leaf size={20} />,
                                            color: "green"
                                        },
                                    ].map((s, i) => (
                                        <motion.button
                                            key={i}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.1 * i, duration: 0.4 }}
                                            onClick={() => setInput(s.text)}
                                            className="group relative flex flex-col items-start p-4 rounded-2xl border border-border/40 bg-white hover:border-primary/30 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all text-left h-full"
                                        >
                                            <div className={cn(
                                                "w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110",
                                                s.color === 'blue' ? "bg-blue-50 text-blue-600" :
                                                    s.color === 'purple' ? "bg-purple-50 text-purple-600" :
                                                        "bg-green-50 text-green-600"
                                            )}>
                                                {s.icon}
                                            </div>
                                            <span className="text-[14px] leading-relaxed text-[#444444] group-hover:text-[#1a1a1a] transition-colors">
                                                {s.text}
                                            </span>
                                            <div className="mt-auto pt-4 flex items-center text-[12px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0">
                                                Start Investigation
                                                <ArrowRight size={14} className="ml-1" />
                                            </div>
                                        </motion.button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div>
                                {messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        onClick={() => msg.role === 'assistant' && msg.articleData && setSelectedAssistantMsgId(msg.id)}
                                        className={cn(
                                            "flex w-full group",
                                            msg.role === 'user' ? "justify-end" : "justify-start"
                                        )}
                                    >
                                        <div className={cn(
                                            msg.role === 'user' ? "ml-auto my-4 max-w-[85%]" : "flex-1 cursor-pointer"
                                        )}>
                                            {msg.pending ? (
                                                <StatusLoader statuses={msg.pendingStatuses || []} />
                                            ) : (
                                                <div className={cn(
                                                    "max-w-none p-4 rounded-2xl transition-all",
                                                    msg.role === 'user' ? "bg-surface text-foreground" : "bg-transparent group-hover:bg-surface/30",
                                                    selectedAssistantMsgId === msg.id && "bg-surface-hover/50 border-l-2 border-primary"
                                                )}>
                                                    <StyledMarkdownViewer 
                                                        markdown={msg.content} 
                                                        onLinkClick={handleLinkClick}
                                                    />
                                                    {msg.articleData && !msg.pending && (
                                                        <div className="flex w-full items-center gap-2 overflow-x-auto flex-nowrap no-scrollbar mt-4 pb-1">
                                                            <button
                                                                onClick={() => handleSpeech(msg)}
                                                                className="shrink-0 p-1.5 rounded-lg bg-foreground/10 border border-border/40 text-[10px] font-bold text-muted hover:text-foreground hover:border-primary/50 transition-all active:scale-95"
                                                            >
                                                                {isSpeaking ? <VolumeX size={12} /> : <Volume2 size={12} />}
                                                            </button>
                                                            <button
                                                                onClick={() => onRewrite(msg)}
                                                                className="shrink-0 p-1.5 rounded-lg bg-foreground/10 border border-border/40 text-[10px] font-bold text-muted hover:text-foreground hover:border-primary/50 transition-all active:scale-95"
                                                            >
                                                                <RotateCcw size={12} />
                                                            </button>
                                                            <button
                                                                onClick={() => onGenerateImage(msg)}
                                                                disabled={isGenImage || !!msg.imageUrl}
                                                                className={`shrink-0 p-1.5 rounded-lg border text-[10px] font-bold transition-all active:scale-95 ${msg.imageUrl
                                                                    ? "bg-success/5 border-success/20 text-success pointer-events-none"
                                                                    : "bg-foreground/10 border-border/40 text-muted hover:text-foreground hover:border-primary/50"
                                                                    }`}
                                                            >
                                                                {isGenImage ? <Loader2 size={12} className="animate-spin" /> : (msg.imageUrl ? <Check size={12} /> : <ImageIcon size={12} />)}
                                                            </button>
                                                            <button
                                                                onClick={() => onGenerateSocialKit(msg)}
                                                                disabled={isGenKit || !!msg.socialKit}
                                                                title={msg.socialKit ? "Social kit created" : "Generate social media kit"}
                                                                className={`shrink-0 p-1.5 rounded-lg border text-[10px] font-bold transition-all active:scale-95 ${msg.socialKit
                                                                    ? "bg-success/5 border-success/20 text-success pointer-events-none"
                                                                    : "bg-foreground/10 border-border/40 text-muted hover:text-foreground hover:border-primary/50"
                                                                    }`}
                                                            >
                                                                {isGenKit ? <Loader2 size={12} className="animate-spin" /> : (msg.socialKit ? <Check size={12} /> : <Megaphone size={12} />)}
                                                            </button>

                                                            {/* Generation Timestamp */}
                                                            <div className="ml-auto text-[10px] font-medium text-muted/50 tracking-tight">
                                                                {new Date(msg.articleData?.created_at || msg.updatedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* Bottom Input Area */}
                {messages.length > 0 && (
                    <div className="w-full">
                        <ChatInput
                            input={input}
                            setInput={setInput}
                            onSend={handleSendMessage}
                            onStop={handleStop}
                            isLoading={isLoading}
                            email={user?.email || ""}
                            sources={sources}
                            setSources={setSources}
                            groundingSources={groundingSources}
                            setGroundingSources={setGroundingSources}
                            persona={persona}
                            setPersona={setPersona}
                            language={language}
                            setLanguage={setLanguage}
                            enableWebSearch={enableWebSearch}
                            setEnableWebSearch={setEnableWebSearch}
                        />
                    </div>
                )}
            </div>

            {/* Right Side: Article Editor or Link Preview */}
            <AnimatePresence mode="wait">
                {showEditor ? (
                    <motion.div
                        key="editor"
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="flex-1 flex flex-col min-w-0"
                    >
                        {currentArticleMsg && (
                            <ArticleEditor
                                id={currentArticleMsg.id}
                                content={currentArticleMsg.articleData?.markdown_content || currentArticleMsg.content}
                                imageUrl={currentArticleMsg.articleData?.image_url}
                                socialKit={currentArticleMsg.articleData?.social_kit}
                                audit={currentArticleMsg.articleData?.audit}
                                sources={currentArticleMsg.articleData?.sources}
                                articleData={currentArticleMsg.articleData}
                                onSave={(newContent) => {
                                    setMessages(messages.map(m =>
                                        m.id === currentArticleMsg.id
                                            ? { ...m, content: newContent, articleData: m.articleData ? { ...m.articleData, markdown_content: newContent } : undefined }
                                            : m
                                    ));
                                }}
                                onManualSave={handleManualSave}
                                onGenerateImage={async (topic, category, articleContent, reportId) => {
                                    if (!currentArticleMsg) return;
                                    await onGenerateImage(currentArticleMsg);
                                }}
                                onGenerateSocialKit={async (content, reportId, options) => {
                                    if (!currentArticleMsg) return;
                                    setIsGenKit(true);
                                    try {
                                        const kit = await generateSocialKit(content, user?.email || "", reportId, options);
                                        setMessages(prev => prev.map(m => m.id === currentArticleMsg.id ? {
                                            ...m,
                                            articleData: m.articleData ? { ...m.articleData, social_kit: kit } : undefined,
                                            socialKit: kit
                                        } : m));
                                    } catch (err) {
                                        console.error(err);
                                    } finally {
                                        setIsGenKit(false);
                                    }
                                }}
                                isGeneratingSocialKit={isGenKit}
                                persona={persona}
                                email={user?.email || ""}
                            />
                        )}
                    </motion.div>
                ) : previewUrl ? (
                    <motion.div
                        key="preview"
                        initial={{ x: '100%', opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0 }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className="w-full md:w-[40%] border-l border-border/40 bg-background flex flex-col z-40"
                    >
                        {/* Preview Header */}
                        <div className="flex items-center justify-between p-3 border-b border-border/40 bg-surface/10">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="p-2 rounded-lg bg-background border border-border/60">
                                    <ExternalLink size={16} className="text-primary" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[10px] font-bold text-muted-dark uppercase tracking-wider">Source Preview</span>
                                    <span className="text-[12px] font-medium text-foreground truncate max-w-[200px] md:max-w-[400px]">{previewUrl}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => window.open(previewUrl, '_blank')}
                                    className="p-2 rounded-lg hover:bg-background transition-all text-muted-dark hover:text-primary"
                                    title="Open in new tab"
                                >
                                    <Maximize2 size={16} />
                                </button>
                                <button
                                    onClick={() => setPreviewUrl(null)}
                                    className="p-2 rounded-lg hover:bg-red-50 transition-all text-muted-dark hover:text-red-500"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>
                        {/* Iframe Content */}
                        <div className="flex-1 bg-surface/5 relative overflow-hidden">
                            <iframe 
                                src={previewUrl} 
                                className="w-full h-full border-none"
                                title="Source Preview"
                                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                            />
                            {/* Security Warning Overlay (Behind iframe unless blocked) */}
                            <div className="absolute inset-0 -z-10 flex flex-col items-center justify-center p-10 text-center select-none">
                                <div className="p-4 rounded-full bg-border/10 mb-4">
                                    <ShieldAlert size={48} className="text-muted-dark/30" />
                                </div>
                                <p className="text-sm font-medium text-muted-dark">Link Preview restricted by source</p>
                                <p className="text-xs text-muted">Some websites prevent embedding for security. Use the external link icon above to view the full page.</p>
                            </div>
                        </div>
                    </motion.div>
                ) : null}
            </AnimatePresence>
            </div>
        </div>
    );
}
