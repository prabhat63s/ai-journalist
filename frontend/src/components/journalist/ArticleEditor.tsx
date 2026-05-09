"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useEditor } from '@tiptap/react';
import {
  Copy,
  Check,
  Save,
  Download,
  FileDown,
  Target,
  CheckCircle2,
  BarChart3,
  Zap,
  ShieldAlert,
  Users2,
  Lightbulb,
  AlertCircle,
  TrendingUp,
  Users,
  ExternalLink,
  Info,
  Newspaper,
  Mic2,
  Activity,
  Loader2,
  Languages,
  Link2,
  Image as ImageIcon,
  Type,
  Layout,
  Megaphone,
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { AuditReport, SocialKit, ArticleData, ArticleStats } from '@/types/journalist.types';
import { defaultExtensions, EditorWorkspace, NewspaperCutout, SocialMediaKit } from '@/components/editor';
import { calculateStats, useArticleStats } from '@/hooks/use-article-stats';
import { handleDownloadImage, handleExportPDF, handleExportWord } from '@/lib/exports';
import { translateArticle, generateAudioBriefing } from '@/services/journalist.service';
import { toastSuccess, toastInfo, toastError } from '@/lib/friendly-errors';
import { AnimatePresence, motion } from 'framer-motion';
import { LANGUAGES } from '@/constants/journalist';
import { SEOAnalyzer } from './SEOAnalyzer';
import { AudioBriefingPlayer } from './AudioBriefingPlayer';
import { FaFilePdf } from 'react-icons/fa6';

interface ArticleEditorProps {
  id: string;
  title?: string;
  content: string;
  imageUrl?: string | null;
  socialKit?: SocialKit | null;
  audit?: AuditReport | null;
  sources?: Array<{ title: string; url: string; description: string }> | null;
  onSave: (newContent: string) => void;
  onClose?: () => void;
  onStatsChange?: (stats: { words: number; readingTime: number; score: number }) => void;
  onImageUpdate?: (url: string) => void;
  onGenerateImage?: (topic: string, category: string, articleContent?: string, reportId?: string) => Promise<void>;
  onGenerateSocialKit?: (content: string, reportId?: string, options?: { platforms: string[], moreHashtags: boolean, prompt?: string }) => Promise<void>;
  isGeneratingSocialKit?: boolean;
  onManualSave?: (content: string) => Promise<void>;
  isSaving?: boolean;
  persona?: string;
  email?: string;
  articleData?: ArticleData | null;
}

export default function ArticleEditor({
  id: _id,
  title = 'Article',
  content,
  imageUrl,
  socialKit,
  audit,
  sources,
  onSave,
  onClose: _onClose,
  onStatsChange,
  onImageUpdate: _onImageUpdate,
  onGenerateImage,
  onGenerateSocialKit,
  isGeneratingSocialKit = false,
  onManualSave,
  isSaving = false,
  persona = "Analytical",
  email = "",
  articleData
}: ArticleEditorProps) {
  const [copied, setCopied] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("Cover image generated via AI based on article content.");

  const [activeTab, setActiveTab] = useState<'facts' | 'stats' | 'trends' | 'perspectives' | 'stakeholders' | 'examples'>('facts');
  const [activeEditorialTab, setActiveEditorialTab] = useState<'insights' | 'audit' | 'sources'>('insights');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'link' | 'image' | 'language'>('link');
  const [modalUrl, setModalUrl] = useState("");
  const [viewMode, setViewMode] = useState<'editor' | 'newspaper' | 'social'>('editor');
  const prevSocialKitRef = useRef(socialKit);
  const [showSEO, setShowSEO] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isAudioPlayerOpen, setIsAudioPlayerOpen] = useState(false);
  const [language, setLanguage] = useState("English");
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    if (socialKit && !prevSocialKitRef.current) {
      setViewMode('social');
    }
    prevSocialKitRef.current = socialKit;
  }, [socialKit]);

  // Load existing audio briefing if available
  useEffect(() => {
    if (articleData?.audio_briefing?.audio_b64 && !audioUrl) {
      try {
        const audioBlob = new Blob(
          [Uint8Array.from(atob(articleData.audio_briefing.audio_b64), c => c.charCodeAt(0))],
          { type: 'audio/wav' }
        );
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
      } catch (err) {
        console.error("Failed to load existing audio briefing:", err);
      }
    }
  }, [articleData?.audio_briefing, audioUrl]);

  const { updateStats } = useArticleStats();

  const handleRegenerateImage = async () => {
    if (onGenerateImage && articleData) {
      setIsGeneratingImage(true);
      try {
        await onGenerateImage(articleData.topic, articleData.category || "General", articleData.markdown_content, articleData.id);
      } finally {
        setIsGeneratingImage(false);
      }
    }
  };

  const handleEditPrompt = async (newPrompt: string) => {
    if (newPrompt && newPrompt.trim() !== "" && newPrompt !== imagePrompt) {
      setImagePrompt(newPrompt);
      if (onGenerateImage && articleData) {
        setIsGeneratingImage(true);
        try {
          await onGenerateImage(newPrompt, articleData.category || "General", articleData.markdown_content, articleData.id);
        } finally {
          setIsGeneratingImage(false);
        }
      }
    }
  };

  const editor = useEditor({
    extensions: defaultExtensions,
    content: content.split(/#+\s*(?:References|Sources)/i)[0].replace(/^---$/gm, '').trim(),
    contentType: 'markdown',
    editorProps: {
      attributes: {
        class: 'prose prose-premium dark:prose-invert max-w-none focus:outline-none min-h-[600px] text-foreground',
      },
    },
    immediatelyRender: false,
    onTransaction: ({ editor }) => {
      setCanUndo(editor.can().undo());
      setCanRedo(editor.can().redo());
    },
    onUpdate: ({ editor }) => {
      const markdown = (editor as unknown as { getMarkdown: () => string }).getMarkdown();
      const text = editor.getText();
      const newStats = updateStats(text);

      onStatsChange?.({
        words: newStats.words,
        readingTime: newStats.readingTime,
        score: newStats.score
      });

      // Notify parent of content changes
      onSave(markdown);
    }
  });



  // Update editor content when content prop changes
  React.useEffect(() => {
    if (editor && content !== undefined) {
      const currentMarkdown = (editor as unknown as { getMarkdown: () => string }).getMarkdown();
      const newContent = content.split(/#+\s*(?:References|Sources)/i)[0].replace(/^---$/gm, '').trim();

      if (newContent !== currentMarkdown.trim()) {
        editor.commands.setContent(newContent);
      }
    }
  }, [content, editor]);

  const handleCopy = () => {
    if (!editor) return;
    const markdown = (editor as unknown as { getMarkdown: () => string }).getMarkdown();
    const cleanContent = markdown.replace(/^#+\s/gm, '');
    navigator.clipboard.writeText(cleanContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopySocialContent = (type: string, content: string | string[]) => {
    let textToCopy = "";
    if (type === 'X' && Array.isArray(content)) {
      textToCopy = content.map((post, i) => `${i + 1}/ ${post}`).join('\n\n');
    } else {
      textToCopy = Array.isArray(content) ? content.join('\n\n') : content;
    }
    navigator.clipboard.writeText(textToCopy);
  };

  const setLink = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    setModalUrl(previousUrl || "");
    setModalType('link');
    setModalOpen(true);
  };

  const insertImage = () => {
    setModalUrl("");
    setModalType('image');
    setModalOpen(true);
  };

  const openLanguageModal = () => {
    setModalType('language');
    setModalOpen(true);
  };

  const handleApplyModal = () => {
    if (!editor) return;
    if (modalType === 'link') {
      if (modalUrl === '') {
        editor.chain().focus().extendMarkRange('link').unsetLink().run();
      } else {
        editor.chain().focus().extendMarkRange('link').setLink({ href: modalUrl }).run();
      }
    } else {
      if (modalUrl) {
        editor?.chain().focus().setImage({ src: modalUrl }).run();
      }
    }
    setModalOpen(false);
  };

  const handleGenerateAudio = async () => {
    if (!email || !editor) return;

    // 1. Check if audio is already loaded and we just need to play it
    if (audioUrl) {
      setIsAudioPlayerOpen(true);
      return;
    }

    // 2. Check if audio exists in the report data from DB
    if (articleData?.audio_briefing?.audio_b64) {
      try {
        const audioBlob = new Blob(
          [Uint8Array.from(atob(articleData.audio_briefing.audio_b64), c => c.charCodeAt(0))],
          { type: 'audio/wav' }
        );
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        setIsAudioPlayerOpen(true);
        return;
      } catch (err) {
        console.error("Failed to recover audio from DB:", err);
      }
    }

    // 3. Otherwise, generate it
    setIsGeneratingAudio(true);
    toastInfo("Initializing AI Newsroom for audio briefing...");

    try {
      const markdown = editor.getText({ blockSeparator: "\n\n" });
      const result = await generateAudioBriefing(markdown, email, articleData?.id || _id);

      if (result.audio_b64) {
        const audioBlob = new Blob(
          [Uint8Array.from(atob(result.audio_b64), c => c.charCodeAt(0))],
          { type: 'audio/wav' }
        );
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        setIsAudioPlayerOpen(true);
        toastSuccess("AI Audio Briefing is ready to play!");
      }
    } catch (err) {
      toastError(err, "audio_briefing");
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const handleTranslate = async (lang: string) => {
    if (lang === language || !editor) return;
    setIsTranslating(true);
    toastInfo(`Translating article to ${lang}...`);
    try {
      const markdown = (editor as any).getMarkdown();
      const result = await translateArticle(markdown, lang, email);
      if (result.translated_content) {
        editor.commands.setContent(result.translated_content);
        onSave(result.translated_content);
        setLanguage(lang);
        toastSuccess(`Article translated to ${lang}!`);
      }
    } catch (err) {
      toastError(err, "translate");
    } finally {
      setIsTranslating(false);
    }
  };

  const handleManualSaveInternal = async () => {
    if (!editor || !onManualSave || isSaving) return;

    try {
      const markdown = (editor as any).getMarkdown();
      await onManualSave(markdown);
      toastSuccess("Investigation version saved successfully!");
    } catch (err) {
      toastError(err, "save_article");
    }
  };

  const stats: ArticleStats | null = editor ? calculateStats(editor.getText()) : null;

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden h-full selection:bg-primary/20 selection:text-primary">
      {/* Sticky Header - Premium Editorial Bar */}
      <div className="sticky top-0 z-50 border-b border-border/40 no-print bg-background/90 backdrop-blur-xl px-4">
        <div className="flex items-center justify-between gap-6 w-full overflow-x-scroll">
          {/* Left: Article Status & Stats */}
          <div className="flex items-center gap-4 shrink-0">
            {stats && (
              <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-surface/40 border border-border/20 transition-all hover:bg-surface/60">
                <div className="flex items-center gap-2 text-[10px] font-bold tracking-tight text-muted-dark">
                  <Type size={12} className="text-primary/60" />
                  <span>{stats.words} WORDS</span>
                </div>
                <div className="w-px h-3 bg-border/40" />
                <div className="flex items-center gap-2 text-[10px] font-bold tracking-tight text-muted-dark">
                  <Layout size={12} className="text-primary/60" />
                  <span>{stats.readingTime} MIN READ</span>
                </div>
              </div>
            )}

            <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10 text-[10px] font-bold uppercase tracking-wider text-primary">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              {persona}
            </div>
          </div>

          {/* Right: Actions & Tools Grouped */}
          <div className="flex items-center gap-2 py-1">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 px-1">
              <button
                onClick={() => setViewMode(v => v === 'editor' ? 'newspaper' : 'editor')}
                className={`p-2 rounded-lg transition-all active:scale-90 ${viewMode === 'newspaper' ? 'text-primary bg-primary/10' : 'text-muted-dark hover:bg-surface hover:text-foreground'}`}
                title="Newspaper View"
              >
                <Newspaper size={16} />
              </button>
              <button
                onClick={() => setViewMode(v => v === 'social' ? 'editor' : 'social')}
                className={`p-2 rounded-lg transition-all active:scale-90 ${viewMode === 'social' ? 'text-primary bg-primary/10' : 'text-muted-dark hover:bg-surface hover:text-foreground'}`}
                title="Social Media Kit"
              >
                <Megaphone size={16} />
              </button>
            </div>

            {/* Analysis & Intelligence */}
            <div className="flex items-center gap-1 px-1">
              <button
                onClick={() => setShowSEO(p => !p)}
                className={`p-2 rounded-lg transition-all active:scale-90 ${showSEO ? 'text-primary bg-primary/10' : 'text-muted-dark hover:bg-surface hover:text-foreground'}`}
                title="SEO & Intelligence"
              >
                <Activity size={16} />
              </button>
              <button
                onClick={handleGenerateAudio}
                disabled={isGeneratingAudio}
                className={`p-2 rounded-lg transition-all active:scale-90 ${isGeneratingAudio ? 'bg-primary/10 text-primary' : 'text-muted-dark hover:bg-surface hover:text-foreground'}`}
                title="AI Audio Briefing"
              >
                {isGeneratingAudio ? <Loader2 size={16} className="animate-spin" /> : <Mic2 size={16} />}
              </button>
            </div>

            {/* Language & Versions */}
            <div className="flex items-center gap-1 px-1">
              <button
                onClick={openLanguageModal}
                className={`p-2 rounded-lg transition-all active:scale-90 ${isTranslating ? 'animate-pulse text-primary' : 'text-muted-dark hover:bg-surface hover:text-foreground'}`}
                title="Translate"
              >
                <Languages size={16} />
              </button>
              {onManualSave && (
                <button
                  onClick={handleManualSaveInternal}
                  disabled={isSaving}
                  className={`p-2 rounded-lg transition-all active:scale-90 ${isSaving ? 'bg-primary/10 text-primary' : 'text-muted-dark hover:bg-primary/10 hover:text-primary'}`}
                  title="Save Version"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                </button>
              )}
            </div>

            {/* Export & Share */}
            <div className="flex items-center gap-1 px-1">
              <button
                onClick={handleCopy}
                className={`p-2 rounded-lg transition-all active:scale-90 ${copied ? 'text-success bg-success/10' : 'text-muted-dark hover:bg-surface hover:text-foreground'}`}
                title="Copy Text"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-2 rounded-lg text-muted-dark hover:bg-surface hover:text-foreground transition-all active:scale-90" title="Export">
                    <Download size={16} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-background/95 backdrop-blur-xl border-border/40 rounded-xl p-1 shadow-2xl min-w-[160px] z-[999]">
                  <DropdownMenuItem
                    onClick={() => {
                      const allSources = [...(sources || []), ...(articleData?.research_summary?.sources || []), ...(articleData?.sources || [])];
                      const uniqueSources = allSources.filter((v, i, a) => a.findIndex(t => t.url === v.url) === i);
                      const dataInsights = [...(articleData?.data_insights || []), ...(articleData?.research_summary?.data_insights || [])];
                      const uniqueInsights = dataInsights.filter((v, i, a) => a.findIndex(t => t.label === v.label) === i);
                      handleExportWord(title, editor?.getHTML() || "", imageUrl, socialKit, audit, articleData?.research_summary, uniqueSources, uniqueInsights, articleData);
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:bg-surface focus:bg-surface"
                  >
                    <FileDown size={14} className="text-muted" />
                    <span className="text-[13px] font-medium">Word Document</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      const allSources = [...(sources || []), ...(articleData?.research_summary?.sources || []), ...(articleData?.sources || [])];
                      const uniqueSources = allSources.filter((v, i, a) => a.findIndex(t => t.url === v.url) === i);
                      const dataInsights = [...(articleData?.data_insights || []), ...(articleData?.research_summary?.data_insights || [])];
                      const uniqueInsights = dataInsights.filter((v, i, a) => a.findIndex(t => t.label === v.label) === i);
                      handleExportPDF(title, editor?.getHTML() || "", imageUrl, socialKit, audit, articleData?.research_summary, uniqueSources, uniqueInsights, articleData);
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:bg-surface focus:bg-surface"
                  >
                    <FaFilePdf size={14} className="text-muted" />
                    <span className="text-[13px] font-medium">PDF / Print</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        <EditorWorkspace
          editor={editor}
          viewMode={viewMode}
          title={title}
          content={content}
          imageUrl={imageUrl || ""}
          canUndo={canUndo}
          canRedo={canRedo}
          setLink={setLink}
          insertImage={insertImage}
          socialKit={socialKit}
          onCopySocial={handleCopySocialContent}
          onRegenerateSocial={(options) => onGenerateSocialKit && onGenerateSocialKit(content, articleData?.id, options)}
          isGeneratingSocial={isGeneratingSocialKit}
          stats={stats}
          onRegenerateImage={handleRegenerateImage}
          onEditImagePrompt={handleEditPrompt}
          onDownloadImage={() => handleDownloadImage(imageUrl || "", title)}
          isGeneratingImage={isGeneratingImage}
        />

        {/* Right Sidebar: Research & Editorial Intelligence */}
        <div className="hidden lg:block w-[350px] p-4 shrink-0 h-full border-l border-border/40 bg-surface/10 overflow-y-auto no-scrollbar">
          {/* Editorial Intelligence Dashboard (Tabs: Insights, Audit, Sources) */}
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-linear-to-r from-transparent via-border to-transparent" />
              <div className="px-4 py-1.5 rounded-full border border-border bg-surface/50 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                Editorial Intelligence
              </div>
              <div className="h-px flex-1 bg-linear-to-r from-transparent via-border to-transparent" />
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-surface/40 border border-border/50 overflow-x-auto no-scrollbar">
              {[
                { id: 'insights', label: 'Data', icon: BarChart3, color: 'text-primary' },
                { id: 'audit', label: 'Audit', icon: ShieldAlert, color: 'text-warning' },
                { id: 'sources', label: 'Sources', icon: Link2, color: 'text-success' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveEditorialTab(tab.id as 'insights' | 'audit' | 'sources')}
                  className={`w-full flex items-center justify-center border border-border/60 gap-2 px-4 py-2 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${activeEditorialTab === tab.id
                    ? 'bg-background text-foreground'
                    : 'text-muted hover:text-foreground hover:bg-background/40'
                    }`}
                >
                  <tab.icon size={14} className={activeEditorialTab === tab.id ? tab.color : 'text-muted/60'} />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="min-h-[200px]">
              {/* Data Insights Tab */}
              {activeEditorialTab === 'insights' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                  {(() => {
                    const dataInsights = [
                      ...(articleData?.data_insights || []),
                      ...(articleData?.research_summary?.data_insights || [])
                    ];
                    const uniqueInsights = dataInsights.filter((v, i, a) => a.findIndex(t => t.label === v.label) === i);
                    return uniqueInsights.length > 0 ? (
                      <div className="grid grid-cols-1 gap-3">
                        {uniqueInsights.map((insight, idx) => (
                          <div
                            key={idx}
                            className="group p-4 rounded-2xl bg-surface/40 border border-border/60 hover:border-primary/40 hover:bg-surface/60 transition-all duration-300"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary/60 group-hover:bg-primary transition-colors" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted group-hover:text-foreground transition-colors">
                                  {insight.label}
                                </span>
                              </div>
                              <div className="flex items-baseline gap-0.5">
                                <span className="text-lg font-black text-primary tabular-nums">
                                  {insight.value}
                                </span>
                                <span className="text-[10px] font-bold text-primary/60">%</span>
                              </div>
                            </div>

                            {/* Minimalist Progress Bar */}
                            <div className="h-1 w-full bg-border/30 rounded-full overflow-hidden mb-3">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${insight.value}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className="h-full bg-linear-to-r from-primary/80 to-primary"
                              />
                            </div>

                            <p className="text-[12px] text-muted-dark leading-relaxed bg-background/30 p-2.5 rounded-xl border border-border/20 group-hover:border-primary/10 transition-colors">
                              <span className="text-[9px] font-bold uppercase text-primary/40 block mb-1">Impact Analysis</span>
                              {insight.context}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-20 text-muted italic text-[12px]">No statistical insights extracted for this article.</div>
                    );
                  })()}
                </div>
              )}

              {/* Audit Tab */}
              {activeEditorialTab === 'audit' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className={`p-5 rounded-2xl bg-surface/30 border border-border/60 no-print transition-all duration-500 ${!audit ? 'opacity-50 grayscale' : 'opacity-100'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <AlertCircle size={18} className="text-primary" />
                        <h3 className="text-sm font-bold text-foreground">Journalist Pro Audit</h3>
                      </div>
                      {audit ? (
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${audit.status === 'Passed' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                          {audit.status}
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded bg-surface text-muted text-[10px] font-bold uppercase animate-pulse">Analyzing...</span>
                      )}
                    </div>

                    <div className="flex flex-col h-[200px] overflow-y-auto gap-4">
                      <div className="p-3 rounded-xl bg-background/50 border border-border/40">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp size={14} className="text-primary" />
                          <span className="text-[11px] font-bold uppercase text-muted">Sentiment & Tone</span>
                        </div>
                        <p className="text-[12px] text-muted-dark leading-relaxed">
                          {audit?.sentiment_tone || "Evaluating tone consistency and investigative depth..."}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-background/50 border border-border/40">
                        <div className="flex items-center gap-2 mb-2">
                          <Users size={14} className="text-primary" />
                          <span className="text-[11px] font-bold uppercase text-muted">Entity Coverage</span>
                        </div>
                        <p className="text-[12px] text-muted-dark leading-relaxed">
                          {audit?.entity_coverage || "Analyzing stakeholder coverage and grounding citations quality..."}
                        </p>
                      </div>
                      <div className="mt-4 p-3 rounded-xl bg-background border border-border/40">
                        <div className="flex items-center gap-2 mb-1">
                          <Target size={14} className="text-primary" />
                          <span className="text-[11px] font-bold text-primary">SEO Recommendation</span>
                        </div>
                        <p className="text-[11px] text-muted-dark italic">
                          {audit?.seo_recommendation || `Optimizing semantic relevance for "${title}"...`}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sources Tab */}
              {activeEditorialTab === 'sources' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                  {(() => {
                    const allSources = [
                      ...(sources || []),
                      ...(articleData?.research_summary?.sources || []),
                      ...(articleData?.sources || [])
                    ];
                    const normalizedSources = allSources.filter((source) =>
                      source &&
                      typeof source === "object" &&
                      typeof source.url === "string" &&
                      source.url.trim().length > 0
                    );
                    const uniqueSources = normalizedSources.filter((v, i, a) => a.findIndex(t => t.url === v.url) === i);
                    return uniqueSources.length > 0 ? (
                      <div className="p-4 rounded-2xl bg-surface/30 border border-border/60">
                        <h1 className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-6 flex items-center gap-2">
                          Verified Sources & References
                        </h1>
                        <div className="grid grid-cols-1 h-[200px] overflow-y-auto gap-x-12 gap-y-2">
                          {uniqueSources.map((source, i) => (
                            <div key={i} className="group flex gap-4">
                              <div className="flex flex-col items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-[10px] font-bold text-muted group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                                  {i + 1}
                                </div>
                                <div className="flex-1 w-px bg-border/40 group-last:hidden" />
                              </div>
                              <div className="pb-4">
                                <a
                                  href={source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[14px] font-bold text-foreground hover:text-primary transition-colors flex items-center gap-2 mb-1.5 underline decoration-border group-hover:decoration-primary/40 underline-offset-4"
                                >
                                  {source.title}
                                  <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                </a>
                                <p className="text-[12px] text-muted-dark leading-relaxed line-clamp-2">
                                  {source.description}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-20 text-muted italic text-[12px]">No verified sources recorded for this report.</div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* Research & Intelligence Dashboard */}
          {articleData?.research_summary && (
            <div className="space-y-6 mt-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                <div className="px-4 py-1.5 rounded-full border border-border bg-surface/50 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                  Research Intelligence
                </div>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
              </div>

              {/* Tab Navigation */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-surface/40 border border-border/50 overflow-x-auto no-scrollbar">
                {[
                  { id: 'facts', label: 'Core Facts', icon: CheckCircle2, color: 'text-success' },
                  { id: 'stats', label: 'Statistics', icon: BarChart3, color: 'text-primary' },
                  { id: 'trends', label: 'Trends', icon: Zap, color: 'text-warning' },
                  { id: 'perspectives', label: 'Perspectives', icon: ShieldAlert, color: 'text-destructive' },
                  { id: 'stakeholders', label: 'Stakeholders', icon: Users2, color: 'text-primary' },
                  { id: 'examples', label: 'Examples', icon: Lightbulb, color: 'text-success' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as 'facts' | 'stats' | 'trends' | 'perspectives' | 'stakeholders' | 'examples')}
                    className={`w-full flex items-center justify-center border border-border/60 gap-2 px-4 py-2 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${activeTab === tab.id
                      ? 'bg-background text-foreground'
                      : 'text-muted hover:text-foreground hover:bg-background/40'
                      }`}
                  >
                    <tab.icon size={14} className={activeTab === tab.id ? tab.color : 'text-muted/60'} />
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="h-auto">
                {/* Core Facts Tab */}
                {activeTab === 'facts' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {(articleData.research_summary.core_facts?.length || 0) > 0 ? (
                      <div className="p-4 rounded-2xl bg-surface/30 border border-border/60">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-10 h-10 rounded-2xl bg-success/10 flex items-center justify-center text-success">
                            <CheckCircle2 size={20} />
                          </div>
                          <div>
                            <h4 className="text-[14px] font-bold text-foreground">Core Investigative Facts</h4>
                            <p className="text-[11px] text-muted">Primary verified data points discovered.</p>
                          </div>
                        </div>
                        <ul className="max-h-[300px] overflow-y-auto">
                          {articleData.research_summary.core_facts?.map((fact, i) => (
                            <li key={i} className="text-[13px] text-muted-dark leading-relaxed flex items-start gap-3 p-2 rounded-2xl hover:bg-background/40 transition-colors">
                              <span className="w-2 h-2 rounded-full bg-success/40 mt-1.5 shrink-0" />
                              {typeof fact === 'string' ? fact : JSON.stringify(fact)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div className="text-center py-20 text-muted italic text-[12px]">No core facts available for this research stage.</div>
                    )}
                  </div>
                )}

                {/* Statistics Tab */}
                {activeTab === 'stats' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {(articleData.research_summary.statistics?.length || 0) > 0 ? (
                      <div className="p-4 rounded-2xl bg-surface/30 border border-border/60">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                            <BarChart3 size={20} />
                          </div>
                          <div>
                            <h4 className="text-[14px] font-bold text-foreground">Statistical Deep-Dive</h4>
                            <p className="text-[11px] text-muted">Quantitative metrics and hard evidence.</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto">
                          {articleData.research_summary.statistics?.map((stat, i) => (
                            <div key={i} className="p-5 rounded-2xl bg-background/40 border border-border/40 text-[13px] text-primary font-medium hover:scale-[1.01] transition-transform">
                              <span className="text-[10px] uppercase font-bold text-muted/60 block mb-1">Evidence Point {i + 1}</span>
                              {typeof stat === 'string' ? stat : JSON.stringify(stat)}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-20 text-muted italic text-[12px]">No statistical data found during research.</div>
                    )}
                  </div>
                )}

                {/* Trends Tab */}
                {activeTab === 'trends' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {(articleData.research_summary.trends?.length || 0) > 0 ? (
                      <div className="p-4 rounded-2xl bg-surface/30 border border-border/60">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-10 h-10 rounded-2xl bg-warning/10 flex items-center justify-center text-warning">
                            <Zap size={20} />
                          </div>
                          <div>
                            <h4 className="text-[14px] font-bold text-foreground">Emerging Trends</h4>
                            <p className="text-[11px] text-muted">Future directions and market shifts discovered.</p>
                          </div>
                        </div>
                        <div className="flex max-h-[300px] overflow-y-auto flex-wrap gap-3">
                          {articleData.research_summary.trends?.map((trend, i) => (
                            <span key={i} className="px-5 py-3 rounded-2xl bg-warning/5 border border-warning/10 text-[12px] font-bold text-warning-dark hover:bg-warning/10 transition-colors">
                              {typeof trend === 'string' ? trend : JSON.stringify(trend)}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-20 text-muted italic text-[12px]">No emerging trends identified in this query.</div>
                    )}
                  </div>
                )}

                {/* Perspectives Tab */}
                {activeTab === 'perspectives' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {((articleData.research_summary.hidden_challenges?.length || 0) > 0 || (articleData.research_summary.contrarian_perspectives?.length || 0) > 0) ? (
                      <div className="p-4 rounded-2xl bg-surface/30 border border-border/60">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-10 h-10 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive">
                            <ShieldAlert size={20} />
                          </div>
                          <div>
                            <h4 className="text-[14px] font-bold text-foreground">Critical & Contrarian Viewpoints</h4>
                            <p className="text-[11px] text-muted">Bottlenecks, challenges, and alternative theories.</p>
                          </div>
                        </div>
                        <div className="space-y-4 max-h-[300px] overflow-y-auto">
                          {articleData.research_summary.hidden_challenges?.map((challenge, i) => (
                            <div key={i} className="text-[13px] text-muted-dark border-l-4 border-destructive/20 pl-5 py-2 italic bg-destructive/5 rounded-r-2xl">
                              <span className="font-bold text-[10px] uppercase text-destructive/60 block mb-1">Hidden Challenge</span>
                              {typeof challenge === 'string' ? challenge : JSON.stringify(challenge)}
                            </div>
                          ))}
                          {articleData.research_summary.contrarian_perspectives?.map((perspective, i) => (
                            <div key={i} className="text-[13px] text-muted-dark border-l-4 border-primary/20 pl-5 py-2 bg-primary/5 rounded-r-2xl">
                              <span className="font-bold text-[10px] uppercase text-primary/60 block mb-1">Contrarian View</span>
                              {typeof perspective === 'string' ? perspective : JSON.stringify(perspective)}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-20 text-muted italic text-[12px]">No critical perspectives found for this topic.</div>
                    )}
                  </div>
                )}

                {/* Stakeholders Tab */}
                {activeTab === 'stakeholders' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {(articleData.research_summary.stakeholders?.length || 0) > 0 ? (
                      <div className="p-4 rounded-2xl bg-surface/30 border border-border/60">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                            <Users2 size={20} />
                          </div>
                          <div>
                            <h4 className="text-[14px] font-bold text-foreground">Stakeholder Ecosystem</h4>
                            <p className="text-[11px] text-muted">Key players and their economic incentives.</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 max-h-[300px] overflow-y-auto gap-3">
                          {articleData.research_summary.stakeholders?.map((stakeholder, i) => {
                            if (typeof stakeholder === 'string') {
                              return (
                                <p key={i} className="inline-flex px-4 py-2 rounded-2xl bg-primary/5 border border-primary/10 text-[12px] font-bold text-primary w-fit">
                                  {stakeholder}
                                </p>
                              );
                            }
                            return (
                              <div key={i} className="p-5 rounded-2xl bg-background/40 border border-border/40 hover:border-primary/30 transition-all group">
                                <div className="font-bold text-[14px] text-foreground mb-3 flex items-center gap-3">
                                  <div className="w-2 h-2 rounded-full bg-primary/40 shrink-0" />
                                  {stakeholder.name}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                                  <div className="space-y-1.5 p-3 rounded-xl bg-surface/40">
                                    <span className="text-[10px] uppercase font-bold tracking-tight text-muted">Economic Incentive</span>
                                    <p className="text-[12px] text-muted-dark leading-relaxed">{stakeholder.incentive}</p>
                                  </div>
                                  <div className="space-y-1.5 p-3 rounded-xl bg-destructive/5">
                                    <span className="text-[10px] uppercase font-bold tracking-tight text-destructive/60">Potential Conflict</span>
                                    <p className="text-[12px] text-muted-dark leading-relaxed">{stakeholder.conflict}</p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-20 text-muted italic text-[12px]">No stakeholders identified in the current research context.</div>
                    )}
                  </div>
                )}

                {/* Examples Tab */}
                {activeTab === 'examples' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {(articleData.research_summary.examples?.length || 0) > 0 ? (
                      <div className="p-4 rounded-2xl bg-surface/30 border border-border/60">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-10 h-10 rounded-2xl bg-success/10 flex items-center justify-center text-success">
                            <Lightbulb size={20} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-[14px] font-bold text-foreground">Comparative Examples</h4>
                              <div className="group relative">
                                <button className="p-1 rounded-full hover:bg-surface transition-colors text-muted hover:text-primary">
                                  <Info size={14} />
                                </button>
                                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 p-3 bg-foreground text-background text-[10px] rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                                  <div className="space-y-2">
                                    <p className="font-bold border-b border-background/20 pb-1 mb-2">Research Glossary</p>
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full bg-success" />
                                      <span><strong>Success:</strong> Proven solution or positive case study.</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full bg-red-400" />
                                      <span><strong>Failure:</strong> Historical lesson or project bottleneck.</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full bg-primary" />
                                      <span><strong>Neutral:</strong> Key entity or strategic context point.</span>
                                    </div>
                                  </div>
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-foreground" />
                                </div>
                              </div>
                            </div>
                            <p className="text-[11px] text-muted">Real-world case studies and success stories.</p>
                          </div>
                        </div>
                        <div className="space-y-3 max-h-[300px] overflow-y-auto">
                          {articleData.research_summary.examples?.map((example, i) => {
                            const isObject = typeof example === 'object' && example !== null;
                            const type = isObject ? (example as Record<string, unknown>).type as string : 'Case Study';
                            const scenario = isObject ? (example as Record<string, unknown>).scenario as string : example;

                            return (
                              <div key={i} className="p-5 rounded-2xl bg-background/40 border border-border/40 text-[13px] text-muted-dark hover:border-success/30 transition-all">
                                <div className="flex items-center justify-between mb-3">
                                  <span className="font-bold text-foreground text-[11px] uppercase tracking-wider">Example {i + 1}</span>
                                  {isObject && (
                                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-tight ${type?.toLowerCase() === 'success' ? 'bg-success/10 text-success border border-success/20' :
                                      type?.toLowerCase() === 'failure' ? 'bg-destructive/10 text-destructive border border-destructive/20' :
                                        'bg-primary/10 text-primary border border-primary/20'
                                      }`}>
                                      {type}
                                    </span>
                                  )}
                                </div>
                                <div className="leading-relaxed">
                                  {scenario}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-20 text-muted italic text-[12px]">No comparative examples found for this investigation.</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* SEO Analyzer Sidebar */}
        {showSEO && (
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="w-[320px] hidden lg:block shrink-0 h-full border-l border-border/40 bg-surface/20 backdrop-blur-xl z-30"
          >
            <SEOAnalyzer
              content={editor?.getText() || ""}
              topic={articleData?.topic || title}
              audit={audit}
            />
          </motion.div>
        )}

        <AnimatePresence>
          {audioUrl && isAudioPlayerOpen && (
            <AudioBriefingPlayer
              audioUrl={audioUrl}
              title={title}
              onClose={() => setIsAudioPlayerOpen(false)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Editor Modal for Link/Image */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/40 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setModalOpen(false)}
        >
          <div
            className={`w-full ${modalType === 'language' ? 'max-w-md' : 'max-w-md'} bg-background border border-border shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${modalType === 'link' ? 'bg-primary/10 text-primary' : modalType === 'image' ? 'bg-[var(--primary)]/10 text-[var(--primary)]' : 'bg-primary/10 text-primary'}`}>
                  {modalType === 'link' ? <Link2 size={20} /> : modalType === 'image' ? <ImageIcon size={20} /> : <Languages size={20} />}
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-foreground">
                    {modalType === 'link' ? 'Insert Link' : modalType === 'image' ? 'Insert Image' : 'Select Language'}
                  </h3>
                  <p className="text-[11px] text-muted-dark">
                    {modalType === 'link' ? 'Point this selection to a web address.' : modalType === 'image' ? 'Provide a public URL for your visual asset.' : 'Translate your article into another language.'}
                  </p>
                </div>
              </div>

              {modalType === 'language' ? (
                <div className="grid grid-cols-2 gap-2 max-h-[350px] overflow-y-auto no-scrollbar pr-1">
                  {LANGUAGES.map(lang => (
                    <button
                      key={lang.id}
                      onClick={() => {
                        handleTranslate(lang.id);
                        setModalOpen(false);
                      }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${language === lang.id ? 'bg-primary/5 border-primary/40 text-primary' : 'bg-surface border-border/40 hover:border-primary/20 text-foreground'}`}
                    >
                      <span className="text-lg">{lang.flag}</span>
                      <span className="text-[12px] font-bold">{lang.name}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted">URL Address</label>
                    <input
                      autoFocus
                      type="text"
                      value={modalUrl}
                      onChange={(e) => setModalUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleApplyModal()}
                      placeholder="https://example.com/..."
                      className="w-full px-4 py-3 rounded-xl bg-surface border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none text-[13px] transition-all"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 mt-8">
                <button
                  onClick={() => setModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border text-[12px] font-bold text-muted-dark hover:bg-surface transition-all"
                >
                  Cancel
                </button>
                {modalType !== 'language' && (
                  <button
                    onClick={handleApplyModal}
                    className={`flex-1 px-4 py-2.5 rounded-xl text-[12px] font-bold text-white transition-all ${modalType === 'link' ? 'bg-primary hover:bg-primary-dark' : 'bg-[var(--primary)] hover:bg-[var(--primary-hover)]'}`}
                  >
                    Apply Change
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
