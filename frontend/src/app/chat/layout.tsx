"use client";

import { Sidebar } from '@/components/shared'
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PanelLeft } from 'lucide-react'

import { useJournalistStore } from '@/store'

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { selectedAssistantMsgId, messages, showEditor } = useJournalistStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Auto-collapse sidebar when an article is being viewed AND editor is shown
  const isEditorActive = !!selectedAssistantMsgId || messages.some(m => m.role === 'assistant' && !!m.articleData);
  const shouldCollapseSidebar = isEditorActive && showEditor;
  
  React.useEffect(() => {
    if (shouldCollapseSidebar) {
      setIsSidebarOpen(false);
    } else {
      setIsSidebarOpen(true);
    }
  }, [shouldCollapseSidebar]);

  const sidebarVisible = isSidebarOpen;

  return (
    <div className='flex h-screen w-full bg-background overflow-hidden relative'>
      <Sidebar isOpen={sidebarVisible} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} />
      
      <main className='flex-1 flex flex-col min-w-0 relative'>
        <div className="flex-1 flex flex-col overflow-hidden">
          {children}
        </div>
      </main>
    </div>
  )
}