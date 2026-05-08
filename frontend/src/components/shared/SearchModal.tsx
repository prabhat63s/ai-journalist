"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { Search, X, Clock, FileText, ChevronRight, Hash, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useJournalistStore } from "@/store";
import { format, isToday, isYesterday } from "date-fns";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { dbSessions, setActiveSessionId } = useJournalistStore();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setSelectedIndex(0);
      setQuery("");
    }
  }, [isOpen]);

  const filteredResults = useMemo(() => {
    if (!query.trim()) return dbSessions;
    return dbSessions.filter(s =>
      s.topic.toLowerCase().includes(query.toLowerCase()) ||
      s.category.toLowerCase().includes(query.toLowerCase())
    );
  }, [dbSessions, query]);

  const handleSelect = (sessionId: string) => {
    setActiveSessionId(sessionId);
    router.push(`/chat?session=${sessionId}`);
    onClose();
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(filteredResults.length, 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + Math.max(filteredResults.length, 1)) % Math.max(filteredResults.length, 1));
      } else if (e.key === "Enter") {
        if (filteredResults[selectedIndex]) {
          handleSelect(filteredResults[selectedIndex].session_id!);
        }
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredResults, selectedIndex]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/60 backdrop-blur-md"
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.98, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.98, opacity: 0, y: 10 }}
            className="relative w-full max-w-2xl bg-background border border-border/40 rounded-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col max-h-[80vh]"
          >
            {/* Search Input Area */}
            <div className="flex items-center px-6 py-5 border-b border-border/40">
              <Search className="text-primary mr-4" size={20} strokeWidth={2.5} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="Search research history, topics, or categories..."
                className="flex-1 bg-transparent border-0 outline-none text-[16px] text-foreground placeholder:text-muted/50 font-medium"
              />
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded-md bg-surface border border-border/40 text-[10px] font-bold text-muted uppercase tracking-tighter">ESC</span>
                <button onClick={onClose} className="p-1 hover:bg-surface rounded-full transition-colors">
                  <X size={18} className="text-muted" />
                </button>
              </div>
            </div>

            {/* Results Area */}
            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
              {filteredResults.length > 0 ? (
                <div className="space-y-1">
                  {filteredResults.map((session, index) => {
                    const date = new Date(session.updated_at || session.created_at);
                    const isActive = index === selectedIndex;
                    
                    return (
                      <button
                        key={session.session_id}
                        onMouseEnter={() => setSelectedIndex(index)}
                        onClick={() => handleSelect(session.session_id!)}
                        className={cn(
                          "w-full flex items-center gap-4 p-3.5 rounded-2xl transition-all text-left group",
                          isActive ? "bg-surface border border-border/40" : "hover:bg-surface border border-transparent"
                        )}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-colors",
                          isActive ? "bg-primary/10 border-primary/20" : "bg-surface border-border/40 group-hover:border-primary/20"
                        )}>
                          <FileText size={18} className="text-primary" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <span className={cn(
                              "text-[14px] font-bold truncate",
                              isActive ? "text-primary" : "text-foreground"
                            )}>
                              {session.topic || "Untitled Investigation"}
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={cn(
                                "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md",
                                isActive ? "bg-primary/10 text-primary" : "bg-primary/5 text-primary"
                              )}>
                                {session.category}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                              <Clock size={12} className={isActive ? "text-primary/60" : "text-muted"} />
                              <span className={cn(
                                "text-[11px] font-medium",
                                isActive ? "text-muted-dark" : "text-muted"
                              )}>
                                {isToday(date) ? format(date, 'HH:mm') : isYesterday(date) ? 'Yesterday' : format(date, 'MMM d, yyyy')}
                              </span>
                            </div>
                            <div className="w-1 h-1 rounded-full bg-current opacity-20" />
                            <span className={cn(
                              "text-[11px] font-medium",
                              isActive ? "text-muted-dark" : "text-muted"
                            )}>
                              {session.version_count} {session.version_count === 1 ? 'version' : 'versions'}
                            </span>
                          </div>
                        </div>

                        <ChevronRight 
                          size={16} 
                          className={cn(
                            "transition-transform",
                            isActive ? "text-white translate-x-1" : "text-muted opacity-0 group-hover:opacity-100"
                          )} 
                        />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-3xl bg-surface flex items-center justify-center mb-4 border border-border/40">
                    <Search size={24} className="text-muted/40" />
                  </div>
                  <p className="text-[14px] font-bold text-foreground">No matches found</p>
                  <p className="text-[12px] text-muted max-w-[240px] mt-1">
                    Try searching for a different keyword or investigation topic.
                  </p>
                </div>
              )}
            </div>

            {/* Footer Tips */}
            <div className="px-6 py-3 bg-surface/50 border-t border-border/40 flex items-center gap-6">
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded border border-border/40 text-[9px] font-bold text-muted bg-background">↑↓</span>
                <span className="text-[10px] font-medium text-muted-dark">Navigate</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded border border-border/40 text-[9px] font-bold text-muted bg-background">ENTER</span>
                <span className="text-[10px] font-medium text-muted-dark">Open Session</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded border border-border/40 text-[9px] font-bold text-muted bg-background">ESC</span>
                <span className="text-[10px] font-medium text-muted-dark">Close</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
