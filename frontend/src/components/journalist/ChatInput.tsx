"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  Paperclip,
  Mic,
  ArrowRight,
  Telescope,
  Link2,
  X,
  FileText,
  Plus,
  Square,
  Loader2,
  Check
} from "lucide-react";
import { PERSONAS, LANGUAGES } from "@/constants/journalist";
import { GroundingSource } from "@/types/journalist.types";
import { uploadFile } from "@/services/journalist.service";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { toast } from "sonner";

interface ISpeechRecognitionEvent {
  results: { length: number;[i: number]: { isFinal: boolean;[j: number]: { transcript: string } } };
}

interface ChatInputProps {
  input: string;
  setInput: (val: string) => void;
  onSend: () => void;
  onStop: () => void;
  isLoading: boolean;
  email: string;
  sources: string[];
  setSources: React.Dispatch<React.SetStateAction<string[]>>;
  groundingSources: GroundingSource[];
  setGroundingSources: React.Dispatch<React.SetStateAction<GroundingSource[]>>;
  persona: string;
  setPersona: (val: string) => void;
  language: string;
  setLanguage: (val: string) => void;
  enableWebSearch: boolean;
  setEnableWebSearch: (val: boolean) => void;
}

export function ChatInput({
  input,
  setInput,
  onSend,
  onStop,
  isLoading,
  email,
  sources,
  setSources,
  groundingSources,
  setGroundingSources,
  persona,
  setPersona,
  language,
  setLanguage,
  enableWebSearch,
  setEnableWebSearch
}: ChatInputProps) {
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowPlusMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !email) return;

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif'
    ];

    const isImage = file.type.startsWith('image/');
    const isDoc = file.type === 'application/pdf' || 
                  file.type === 'application/msword' || 
                  file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    if (!isImage && !isDoc) {
      toast.error("Invalid file type. Please upload a PDF, Word document, or an image.", {
        description: "Supported: PDF, DOC, DOCX, JPG, PNG, WEBP",
      });
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadFile(file, email);
      const previewUrl = isImage ? URL.createObjectURL(file) : undefined;
      
      setGroundingSources(prev => [...prev, { 
        name: file.name, 
        content: result.content,
        previewUrl,
        type: file.type
      }]);
      
      toast.success("File uploaded successfully");
    } catch (error) {
      console.error("Upload failed", error);
      toast.error("Upload failed. This file type is not supported or there was a server error.");
    } finally {
      setIsUploading(false);
    }
  };

  const submitUrl = () => {
    if (urlInput.trim()) {
      setSources(prev => [...prev, urlInput.trim()]);
      setUrlInput("");
      setShowUrlInput(false);
    }
  };

  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => setInput(input + " " + event.results[0][0].transcript);
    if (isListening) recognition.stop();
    else recognition.start();
  };

  return (
    <div className="w-full relative p-4 bg-background">
      <div className="max-w-3xl mx-auto relative bg-surface/50 backdrop-blur-xl border border-border/40 rounded-2xl transition-all focus-within:bg-background focus-within:shadow-[0_8px_30px_rgba(0,0,0,0.04)] focus-within:border-primary/20">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
          accept=".pdf,.doc,.docx,image/*"
        />

        {/* URL Input */}
        {showUrlInput && (
          <div className="p-3 border-b border-border/40 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <div className="flex-1 flex items-center gap-2 bg-background px-4 py-2 rounded-2xl border border-border/40">
              <Link2 size={14} className="text-primary" />
              <input
                autoFocus value={urlInput} onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && submitUrl()}
                placeholder="Paste research URL..."
                className="flex-1 bg-transparent border-0 outline-none text-[13px] text-foreground"
              />
            </div>
            <button onClick={submitUrl} className="px-4 py-2 bg-primary text-white rounded-xl text-[11px] font-bold">Add</button>
            <button onClick={() => setShowUrlInput(false)} className="p-2 text-muted hover:text-foreground"><X size={18} /></button>
          </div>
        )}

        {/* Sources */}
        {(sources.length > 0 || groundingSources.length > 0 || isUploading) && (
          <div className="flex items-center gap-3 px-5 pt-5 overflow-x-auto no-scrollbar">
            {isUploading && (
              <div className="flex items-center gap-2 bg-background border border-border/40 rounded-xl px-4 py-3 animate-pulse min-w-[140px] justify-center">
                <Loader2 size={16} className="text-primary animate-spin" />
                <span className="text-[12px] font-bold text-muted">Indexing...</span>
              </div>
            )}
            
            {groundingSources.map((src, i) => (
              <div key={i} className="group relative shrink-0">
                {src.previewUrl ? (
                  <div className="w-14 h-14 rounded-xl overflow-hidden border border-border/40 bg-surface transition-transform hover:scale-[1.02]">
                    <img src={src.previewUrl} alt={src.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="flex items-center gap-3 bg-background border border-border/40 rounded-xl px-4 py-3 transition-all hover:bg-surface/50 max-w-[200px]">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText size={16} className="text-primary" />
                    </div>
                    <div className="flex flex-col min-w-0 pr-4">
                      <span className="text-[12px] font-bold text-foreground truncate">{src.name}</span>
                      <span className="text-[10px] text-muted font-medium uppercase tracking-wider">{src.type?.split('/')[1] || 'DOC'}</span>
                    </div>
                  </div>
                )}
                
                <button 
                  onClick={() => setGroundingSources(p => p.filter((_, j) => j !== i))}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-foreground text-background rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                >
                  <X size={12} strokeWidth={3} />
                </button>
              </div>
            ))}

            {sources.map((src, i) => (
              <div key={i} className="group relative shrink-0">
                <div className="flex items-center gap-3 bg-background border border-border/40 rounded-xl px-4 py-3 shadow-sm transition-all hover:bg-surface/50 max-w-[200px]">
                  <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                    <Link2 size={16} className="text-success" />
                  </div>
                  <div className="flex flex-col min-w-0 pr-4">
                    <span className="text-[12px] font-bold text-foreground truncate">{src.replace(/^https?:\/\//, "")}</span>
                    <span className="text-[10px] text-muted font-medium uppercase tracking-wider">URL</span>
                  </div>
                </div>
                <button 
                  onClick={() => setSources(p => p.filter((_, j) => j !== i))}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-foreground text-background rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                >
                  <X size={12} strokeWidth={3} />
                </button>
              </div>
            ))}
          </div>
        )}

        <textarea
          ref={textareaRef} value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
          placeholder="What are we investigating today?"
          className="w-full text-sm bg-transparent border-0 resize-none outline-none px-6 pt-5 pb-2 text-foreground placeholder-muted leading-relaxed min-h-[60px] max-h-[200px]"
          rows={1} disabled={isLoading || isUploading}
        />

        {/* Bottom Bar */}
        <div className="flex items-center justify-between px-3 pb-3">
          <div className="flex items-center gap-2 flex-1 min-w-0 mr-3">
            <div className="relative">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={cn("w-6 h-6 flex items-center justify-center rounded-full transition-all border border-[#ececec] bg-white text-[#666666] hover:text-[#1a1a1a] hover:shadow-sm data-[state=open]:bg-[#f3f3f3] data-[state=open]:text-[#1a1a1a]")}>
                    <Plus size={16} className="transition-transform duration-200 group-data-[state=open]:rotate-45" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="start" sideOffset={4} className="w-[280px] bg-background border border-border/40 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] p-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-surface transition-colors group cursor-pointer focus:bg-surface">
                    <Paperclip size={16} className="text-muted-dark group-hover:text-foreground" strokeWidth={1.5} />
                    <span className="text-[14px] text-foreground/80">Add files or research</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => setShowUrlInput(true)} className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-surface transition-colors group cursor-pointer focus:bg-surface">
                    <Link2 size={16} className="text-muted-dark group-hover:text-foreground" strokeWidth={1.5} />
                    <span className="text-[14px] text-foreground/80">Add research URL</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={(e) => { e.preventDefault(); setEnableWebSearch(!enableWebSearch); }} className="flex items-center justify-between px-4 py-2.5 rounded-xl hover:bg-surface transition-colors cursor-pointer focus:bg-surface">
                    <div className="flex items-center gap-3">
                      <Telescope size={16} className={cn(enableWebSearch ? "text-primary" : "text-muted-dark")} strokeWidth={1.5} />
                      <span className="text-[14px] text-foreground/80">Web search</span>
                    </div>
                    {enableWebSearch && <Check size={16} className="text-primary" strokeWidth={3} />}
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="bg-border/20 my-1 mx-2" />

                  <div className="px-4 py-2.5 flex flex-col gap-2">
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Persona</span>
                    <div className="flex gap-1">
                      {PERSONAS.map(p => (
                        <button key={p.id} onClick={() => setPersona(p.id)}
                          className={cn(
                            "flex-1 flex items-center justify-center p-2 rounded-xl border transition-all",
                            persona === p.id ? "bg-primary/5 border-primary/20 text-primary" : "bg-transparent border-transparent hover:bg-surface"
                          )}
                        >
                          <span className="text-lg" title={p.id}>{p.icon}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <DropdownMenuSeparator className="bg-border/20 my-1 mx-2" />

                  <div className="px-4 py-2.5 flex flex-col gap-2">
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Output Language</span>
                    <div className="grid grid-cols-3 gap-1">
                      {LANGUAGES.map(lang => (
                        <button key={lang.id} onClick={() => setLanguage(lang.id)}
                          className={cn(
                            "flex flex-col items-center p-1.5 rounded-lg border transition-all",
                            language === lang.id ? "bg-primary/5 border-primary/20 text-primary" : "bg-transparent border-transparent hover:bg-surface text-muted-dark"
                          )}
                        >
                          <span className="text-sm">{lang.flag}</span>
                          <span className="text-[8px] font-bold">{lang.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Badges */}
            <div className="flex items-center overflow-x-auto gap-1.5 no-scrollbar py-0.5">
              {enableWebSearch && (
                <div className="flex items-center shrink-0 gap-1 px-3 py-1.5 rounded-full bg-primary/5 text-[10px] font-bold text-primary animate-in zoom-in-95 whitespace-nowrap">
                  <Telescope size={10} />
                  <span>Research Active</span>
                </div>
              )}
              <div className="flex items-center shrink-0 gap-1 px-3 py-1.5 rounded-full bg-surface text-[10px] font-bold text-muted-dark whitespace-nowrap">
                <span>{PERSONAS.find(p => p.id === persona)?.icon}</span>
                <span>{persona}</span>
              </div>
              <div className="flex items-center shrink-0 gap-1 px-3 py-1.5 rounded-full bg-surface text-[10px] font-bold text-muted-dark whitespace-nowrap">
                <span>{LANGUAGES.find(l => l.id === language)?.flag}</span>
                <span>{LANGUAGES.find(l => l.id === language)?.name}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={toggleListening}
              className={cn(
                "w-6 h-6 flex items-center justify-center rounded-full transition-all border border-border/40 bg-background text-muted-dark hover:text-foreground active:scale-95",
                isListening && "bg-red-500 border-red-500 text-white animate-pulse"
              )}
            >
              <Mic size={14} strokeWidth={1.5} />
            </button>
            {isLoading ? (
              <button onClick={onStop} className="w-6 h-6 flex items-center justify-center rounded-full bg-foreground text-background hover:bg-foreground/80 transition-all">
                <Square size={14} fill="currentColor" />
              </button>
            ) : (
              <button
                onClick={onSend}
                disabled={(!input.trim() && sources.length === 0 && groundingSources.length === 0) || isLoading || isUploading}
                className={cn(
                  "w-6 h-6 flex items-center justify-center rounded-full transition-all",
                  (input.trim() || sources.length > 0 || groundingSources.length > 0) && !isLoading && !isUploading
                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                    : "bg-surface text-muted opacity-50 cursor-not-allowed"
                )}
              >
                <ArrowRight size={16} strokeWidth={2} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
