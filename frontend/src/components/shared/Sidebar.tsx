"use client";

import React, { useEffect, useState } from "react";
import { 
  Plus, 
  Search, 
  PanelLeft, 
  LogOut,
  AlertCircle,
  X as CloseIcon,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useJournalistStore } from "@/store";
import { useRouter, usePathname } from "next/navigation";
import { SearchModal, ConfirmModal } from "./index";

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: string;
  isOpen: boolean;
  onClick?: () => void;
}

const NavItem = ({ icon, label, active, badge, isOpen, onClick }: NavItemProps) => (
  <button 
    onClick={onClick}
    className={cn(
      "w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 group",
      active ? "bg-surface-hover text-foreground" : "text-muted-dark hover:bg-surface-hover/50",
      !isOpen && "justify-center px-0"
    )}
  >
    <div className={cn("flex items-center gap-3 min-w-0", !isOpen && "gap-0")}>
      <span className={cn("transition-colors shrink-0", active ? "text-foreground" : "text-muted-dark group-hover:text-foreground")}>
        {icon}
      </span>
      {isOpen && (
        <span className={cn("text-[14px] font-medium transition-colors truncate", active ? "text-foreground" : "text-muted-dark group-hover:text-foreground")}>
          {label}
        </span>
      )}
    </div>
    {isOpen && badge && (
      <span className="px-2 py-0.5 text-[10px] font-bold text-primary border border-primary/20 rounded-full bg-primary/5 uppercase tracking-wider">
        {badge}
      </span>
    )}
  </button>
);

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const Sidebar = ({ isOpen, onToggle }: SidebarProps) => {
  const { user, logout } = useAuth();
  const { dbSessions, loadSessions, clearSession, activeSessionId, setActiveSessionId, deleteSession } = useJournalistStore();
  const router = useRouter();
  const pathname = usePathname();
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    type?: "danger" | "primary" | "warning";
    confirmText?: string;
  } | null>(null);

  useEffect(() => {
    if (user?.email) {
      loadSessions(user.email);
    }
  }, [user, loadSessions]);

  const handleNewChat = () => {
    clearSession();
    router.push('/chat');
  };

  const handleSessionClick = (sessionId: string) => {
    setActiveSessionId(sessionId);
    router.push(`/chat?session=${sessionId}`);
  };

  const handleLogout = () => {
    setConfirmConfig({
      isOpen: true,
      title: "Logout Confirmation",
      description: "Are you sure you want to end your session? You'll need to log back in to access your investigations.",
      confirmText: "Logout",
      type: "danger",
      onConfirm: () => {
        logout();
        router.push('/');
      }
    });
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    setConfirmConfig({
      isOpen: true,
      title: "Delete Investigation",
      description: "Are you sure you want to delete this investigation? This action cannot be undone.",
      confirmText: "Delete",
      type: "danger",
      onConfirm: async () => {
        try {
          await deleteSession(sessionId, user?.email || "");
          if (activeSessionId === sessionId) {
            clearSession();
            router.push('/chat');
          }
          setConfirmConfig(null);
        } catch (err) {
          alert("Failed to delete investigation");
        }
      }
    });
  };

  return (
    <>
    <motion.aside 
      initial={false}
      animate={{ 
        width: isOpen ? 260 : 60,
      }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="h-screen bg-background border-r border-border/40 flex flex-col overflow-hidden relative"
    >
      <div className={cn("flex flex-col h-full", isOpen ? "w-[260px]" : "w-[60px]")}>
        {/* Top Header */}
        <div className={cn("p-2 flex items-center justify-between", !isOpen && "justify-center px-0")}>
          {isOpen && <h1 className="text-[22px] font-semibold text-foreground font-serif tracking-tight ml-2">AI Journalist</h1>}
          <button 
            onClick={onToggle}
            className={cn("text-muted-dark hover:text-foreground p-2 rounded-md hover:bg-surface transition-colors", !isOpen && "mx-auto")}
          >
            <PanelLeft size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* Main Navigation */}
        <div className={cn("px-2 space-y-0.5 mt-2", !isOpen && "px-3")}>
          <NavItem 
            icon={<Plus size={20} strokeWidth={1.5} />} 
            label="New chat" 
            isOpen={isOpen} 
            onClick={handleNewChat}
          />
          <NavItem 
            icon={<Search size={20} strokeWidth={1.5} />} 
            label="Search" 
            isOpen={isOpen} 
            onClick={() => setShowSearchModal(true)}
          />
        </div>

        {/* Recents Section */}
        <div className={cn("flex-1 overflow-y-auto mt-6 px-2 custom-scrollbar transition-opacity duration-200", !isOpen && "opacity-0 invisible")}>
          <h3 className="px-3 text-[11px] font-bold text-muted uppercase tracking-wider mb-2">Recents</h3>
          <div className="space-y-0.5">
            {dbSessions.length > 0 ? (
              dbSessions.map((session, index) => (
                <div key={session.session_id || index} className="group/item relative">
                  <button 
                    onClick={() => session.session_id && handleSessionClick(session.session_id)}
                    className={cn(
                      "w-full text-left px-3 py-2 text-[14px] rounded-lg transition-colors truncate pr-8",
                      activeSessionId === session.session_id 
                        ? "bg-surface-hover text-foreground" 
                        : "text-muted-dark hover:bg-surface-hover/50"
                    )}
                  >
                    {session.topic || "New Investigation"}
                  </button>
                  {session.session_id && (
                    <button
                      onClick={(e) => handleDeleteSession(e, session.session_id!)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-dark hover:text-error opacity-0 group-hover/item:opacity-100 transition-all rounded-md hover:bg-error/10"
                      title="Delete investigation"
                    >
                      <Trash2 size={14} strokeWidth={1.5} />
                    </button>
                  )}
                </div>
              ))
            ) : (
              <p className="px-3 text-[12px] text-muted italic mt-2">No recent investigations</p>
            )}
          </div>
        </div>

        {/* Footer Profile */}
        <div className={cn("border-t border-border/40 bg-background", !isOpen && "px-0 py-1 flex justify-center")}>
          <div className={cn("flex items-center justify-between p-2 hover:bg-surface transition-colors cursor-pointer group", !isOpen && "p-1 rounded-full")}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center text-[14px] font-bold shrink-0">
                {user?.name?.charAt(0).toUpperCase() || "P"}
              </div>
              {isOpen && (
                <div className="flex flex-col truncate">
                  <span className="text-sm font-bold text-foreground leading-tight truncate">
                    {user?.name || "User"}
                  </span>
                  <span className="text-xs text-muted-dark truncate">
                    {user?.email || "No email"}
                  </span>
                </div>
              )}
            </div>
            {isOpen && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={handleLogout}
                  className="p-2 hover:bg-error/10 rounded-md text-muted-dark hover:text-error transition-colors"
                  title="Logout"
                >
                  <LogOut size={16} strokeWidth={1.5} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.aside>

    {/* Reusable Confirmation Modal */}
    {confirmConfig && (
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        description={confirmConfig.description}
        confirmText={confirmConfig.confirmText}
        type={confirmConfig.type}
        onClose={() => setConfirmConfig(null)}
        onConfirm={confirmConfig.onConfirm}
      />
    )}

    {/* History Search Modal */}
    <SearchModal 
      isOpen={showSearchModal} 
      onClose={() => setShowSearchModal(false)} 
    />
    </>
  );
};

export default Sidebar;