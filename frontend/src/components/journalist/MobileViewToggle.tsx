"use client";

import React from "react";
import { ChevronLeft, History, Plus } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

interface MobileViewToggleProps {
  view: "chat" | "editor";
  setView: (v: "chat" | "editor") => void;
  onNewChat: () => void;
  onHistoryOpen: () => void;
}

export function MobileViewToggle({ view, setView, onNewChat, onHistoryOpen }: MobileViewToggleProps) {
  return (
    <div className="md:hidden w-full flex items-center justify-between border-b border-border/10 bg-background/80 backdrop-blur-xl px-4 pt-[max(2.5rem,env(safe-area-inset-top))] pb-3 gap-4">
      {/* Premium Toggle */}
      <div className="relative flex bg-surface-hover/50 p-1 rounded-2xl flex-1 max-w-[180px] items-center border border-border/40 overflow-hidden shadow-inner">
        <div 
          className={`absolute top-1 bottom-1 w-[calc(50%-2px)] bg-primary rounded-xl transition-all duration-500 ease-[cubic-bezier(0.2,1,0.3,1)] shadow-lg shadow-primary/25 ${
            view === "chat" ? "left-1" : "left-[calc(50%+1px)]"
          }`} 
        />
        {(["chat", "editor"] as const).map((v) => (
          <button 
            key={v} 
            onClick={() => setView(v)} 
            className={`relative z-10 flex-1 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] transition-colors duration-300 ${
              view === v ? "text-white" : "text-muted hover:text-foreground"
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        <ThemeToggle />
        <button
          onClick={onHistoryOpen}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface/40 border border-border/40 text-muted hover:text-foreground transition-all active:scale-95"
          title="History"
        >
          <History size={16} />
        </button>
        <button
          onClick={onNewChat}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/20 transition-all active:scale-95"
          title="New Chat"
        >
          <Plus size={16} strokeWidth={3} />
        </button>
      </div>
    </div>
  );
}
