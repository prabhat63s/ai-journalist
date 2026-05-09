"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { RefreshCw, Edit3, Image as ImageIcon, Download } from 'lucide-react';

interface GeneratedImageCardProps {
  imageUrl?: string;
  prompt: string;
  onRegenerate?: () => void;
  onEditPrompt?: (newPrompt: string) => void;
  onDownload?: () => void;
  isGenerating?: boolean;
}

export default function GeneratedImageCard({
  imageUrl,
  prompt,
  onRegenerate,
  onEditPrompt,
  onDownload,
  isGenerating = false
}: GeneratedImageCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftPrompt, setDraftPrompt] = useState(prompt);

  const handleEditClick = () => {
    setDraftPrompt(prompt);
    setIsEditing(true);
  };

  const handleGenerateClick = () => {
    if (draftPrompt.trim() !== "") {
      setIsEditing(false);
      onEditPrompt?.(draftPrompt);
    }
  };

  return (
    <div className="">
      <div className="section-label">Generated image</div>
      
      <div className="border-thin rounded-lg overflow-hidden bg-surface">
        {/* Image Canvas */}
        <div className="relative w-full aspect-square bg-[#0d0d1a] flex items-center justify-center overflow-hidden">
          {isGenerating ? (
            <div className="flex flex-col items-center gap-3">
              <RefreshCw size={24} className="text-primary animate-spin" />
              <span className="text-[10px] uppercase tracking-widest text-[#a8a49e]">Visualizing...</span>
            </div>
          ) : imageUrl ? (
            <Image 
              src={imageUrl} 
              alt="Generated article cover" 
              fill
              unoptimized
              className="object-cover opacity-90 hover:opacity-100 transition-opacity"
            />
          ) : (
            <div className="flex flex-col items-center gap-3">
              <ImageIcon size={24} className="text-[#a8a49e] opacity-30" />
              <span className="text-[10px] uppercase tracking-widest text-[#a8a49e]">Image Preview</span>
            </div>
          )}
          
          {/* Subtle Glow Overlay */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-primary/10 to-transparent" />
        </div>
        
        {/* Meta & Actions Footer */}
        <div className="p-3 bg-background border-t-[0.5px] border-border flex flex-col gap-3">
          {isEditing ? (
            <div className="flex flex-col gap-2 w-full animate-in fade-in slide-in-from-top-1 duration-200">
              <textarea 
                value={draftPrompt}
                onChange={(e) => setDraftPrompt(e.target.value)}
                className="w-full min-h-[60px] text-[12px] bg-surface border-thin rounded-lg p-2 focus:outline-none focus:border-primary text-foreground resize-y"
                placeholder="Enter a descriptive prompt for your cover image..."
              />
              <div className="flex items-center justify-end gap-2">
                <button 
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-medium text-muted-dark hover:bg-surface transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleGenerateClick}
                  disabled={!draftPrompt.trim()}
                  className="px-3 py-1.5 bg-primary text-white rounded-lg text-[11px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  Generate new image
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="text-[11px] text-muted-dark leading-relaxed bg-surface/50 p-2 rounded-md border border-border/20">
                <span className="text-muted font-bold uppercase tracking-tight text-[9px] block mb-0.5">Prompt</span>
                {prompt || "No prompt provided."}
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                <button 
                  onClick={onRegenerate}
                  disabled={isGenerating}
                  className="flex-1 min-w-[100px] px-3 py-1.5 border-thin rounded-lg text-[10px] font-bold uppercase tracking-wider text-muted-dark hover:bg-surface hover:text-primary transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw size={12} className={isGenerating ? "animate-spin" : ""} />
                  {isGenerating ? "Wait..." : "Regenerate"}
                </button>
                <button 
                  onClick={handleEditClick}
                  disabled={isGenerating}
                  className="flex-1 min-w-[100px] px-3 py-1.5 border-thin rounded-lg text-[10px] font-bold uppercase tracking-wider text-muted-dark hover:bg-surface hover:text-primary transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Edit3 size={12} />
                  Edit
                </button>
                {imageUrl && (
                  <button
                    onClick={onDownload}
                    disabled={isGenerating}
                    className="flex-1 min-w-[100px] px-3 py-1.5 border-thin rounded-lg text-[10px] font-bold uppercase tracking-wider text-muted-dark hover:bg-surface hover:text-primary transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download size={12} />
                    Get Image
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
