"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, HelpCircle, Trash2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "primary" | "warning";
  isLoading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "primary",
  isLoading = false
}: ConfirmModalProps) {
  
  const getIcon = () => {
    switch (type) {
      case "danger": return <Trash2 size={32} className="text-error" />;
      case "warning": return <AlertCircle size={32} className="text-warning" />;
      default: return <HelpCircle size={32} className="text-primary" />;
    }
  };

  const getIconBg = () => {
    switch (type) {
      case "danger": return "bg-error/10 border-error/20";
      case "warning": return "bg-warning/10 border-warning/20";
      default: return "bg-primary/10 border-primary/20";
    }
  };

  const getConfirmBtnStyles = () => {
    switch (type) {
      case "danger": return "text-error hover:bg-error/5";
      case "warning": return "text-warning hover:bg-warning/5";
      default: return "text-primary hover:bg-primary/5";
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-[360px] bg-background border border-border/40 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden"
          >
            <div className="p-6 text-center">
              <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border",
                getIconBg()
              )}>
                {getIcon()}
              </div>
              <h3 className="text-[18px] font-bold text-foreground mb-2">{title}</h3>
              <p className="text-[14px] text-muted-dark leading-relaxed">
                {description}
              </p>
            </div>
            
            <div className="flex border-t border-border/40">
              <button
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 px-4 py-4 text-[14px] font-bold text-muted-dark hover:bg-surface transition-colors border-r border-border/40 disabled:opacity-50"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                disabled={isLoading}
                className={cn(
                  "flex-1 px-4 py-4 text-[14px] font-bold transition-colors disabled:opacity-50",
                  getConfirmBtnStyles()
                )}
              >
                {isLoading ? "Processing..." : confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
