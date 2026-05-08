import { create } from 'zustand';
import { Message, ArticleData, SessionEntry } from '@/types/journalist.types';
import { getSessions, getReports } from '@/services/journalist.service';

interface JournalistStore {
  messages: Message[];
  dbReports: ArticleData[];       // full reports, used when restoring a session
  dbSessions: SessionEntry[];     // deduplicated sessions from backend, used for history panel
  activeReportId: number | null;
  activeSessionId: string | null;
  selectedAssistantMsgId: string | null;
  showEditor: boolean;
  hasLoadedReports: boolean;

  // Actions
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
  setDbReports: (reports: ArticleData[] | ((prev: ArticleData[]) => ArticleData[])) => void;
  setDbSessions: (sessions: SessionEntry[]) => void;
  setActiveReportId: (id: number | null) => void;
  setActiveSessionId: (id: string | null) => void;
  setSelectedAssistantMsgId: (id: string | null) => void;
  setShowEditor: (show: boolean) => void;

  loadSessions: (email: string, force?: boolean) => Promise<void>;
  loadReports: (email: string, force?: boolean) => Promise<void>;
  deleteSession: (sessionId: string, email: string) => Promise<void>;
  clearSession: () => void;
}

export const useJournalistStore = create<JournalistStore>((set, get) => ({
  messages: [],
  dbReports: [],
  dbSessions: [],
  activeReportId: null,
  activeSessionId: null,
  selectedAssistantMsgId: null,
  showEditor: true,
  hasLoadedReports: false,

  setMessages: (messages) => {
    if (typeof messages === 'function') {
      set((state) => ({ messages: messages(state.messages) }));
    } else {
      set({ messages });
    }
  },

  setDbReports: (dbReports) => {
    if (typeof dbReports === 'function') {
      set((state) => ({ dbReports: dbReports(state.dbReports) }));
    } else {
      set({ dbReports, hasLoadedReports: true });
    }
  },

  setDbSessions: (dbSessions) => set({ dbSessions }),

  setActiveReportId: (activeReportId) => set({ activeReportId }),
  setActiveSessionId: (activeSessionId) => set({ activeSessionId }),
  setSelectedAssistantMsgId: (selectedAssistantMsgId) => set({ selectedAssistantMsgId }),
  setShowEditor: (showEditor) => set({ showEditor }),

  loadSessions: async (email, force = false) => {
    if (get().hasLoadedReports && !force) return;
    try {
      const { getSessions, getReports, getConversations } = await import('@/services/journalist.service');
      const [sessions, reports, conversations] = await Promise.all([
        getSessions(email),
        getReports(email),
        getConversations(email)
      ]);

      // Merge legacy report sessions with new conversation sessions
      // Map conversations to SessionEntry format for the UI
      const convSessions: SessionEntry[] = conversations.map(c => ({
        session_id: c.id,
        latest_report_id: 0, // Not strictly used for conv sessions
        topic: c.title,
        category: c.category || "General",
        version_count: c.messages?.length || 1,
        created_at: c.created_at,
        updated_at: c.updated_at
      }));

      // Deduplicate by session_id, prioritizing conversations
      const allSessionsMap = new Map<string, SessionEntry>();
      
      // Add legacy sessions first
      sessions.forEach(s => {
        if (s.session_id) allSessionsMap.set(s.session_id, s);
      });
      
      // Add/Overwrite with proper conversation sessions
      convSessions.forEach(s => {
        if (s.session_id) allSessionsMap.set(s.session_id, s);
      });

      const sortedSessions = Array.from(allSessionsMap.values()).sort((a, b) => 
        new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
      );

      set({ 
        dbSessions: sortedSessions, 
        dbReports: reports, 
        hasLoadedReports: true 
      });
    } catch (err) {
      console.error("Failed to load journalist sessions:", err);
    }
  },

  loadReports: async (email, force = false) => {
    if (get().hasLoadedReports && !force) return;
    try {
      const reports = await getReports(email);
      set({ dbReports: reports, hasLoadedReports: true });
    } catch (err) {
      console.error("Failed to load journalist reports:", err);
    }
  },

  deleteSession: async (sessionId, email) => {
    try {
      const { deleteSession: deleteSvc } = await import('@/services/journalist.service');
      await deleteSvc(sessionId, email);
      
      set((state) => ({
        dbSessions: state.dbSessions.filter(s => s.session_id !== sessionId),
        activeSessionId: state.activeSessionId === sessionId ? null : state.activeSessionId,
        messages: state.activeSessionId === sessionId ? [] : state.messages,
        activeReportId: state.activeSessionId === sessionId ? null : state.activeReportId,
        selectedAssistantMsgId: state.activeSessionId === sessionId ? null : state.selectedAssistantMsgId,
      }));
    } catch (err) {
      console.error("Failed to delete session:", err);
      throw err;
    }
  },

  clearSession: () => set({
    messages: [],
    activeReportId: null,
    activeSessionId: null,
    selectedAssistantMsgId: null,
  }),
}));

