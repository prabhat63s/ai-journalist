import React from "react";
import { BarChart2, Search, BookOpen, Zap } from "lucide-react";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export const PERSONAS = [
  { id: "Analytical", icon: <BarChart2 size={13} />, color: "var(--primary)" },
  { id: "Investigative", icon: <Search size={13} />, color: "#2b8a3e" },
  { id: "Narrative", icon: <BookOpen size={13} />, color: "#e67700" },
  { id: "Tabloid", icon: <Zap size={13} />, color: "#d9480f" },
];

export const LANGUAGES = [
  { id: "English", name: "English", flag: "🇺🇸" },
  { id: "Hindi", name: "Hindi", flag: "🇮🇳" },
  { id: "Marathi", name: "Marathi", flag: "🇮🇳" },
  { id: "Bengali", name: "Bengali", flag: "🇮🇳" },
  { id: "Tamil", name: "Tamil", flag: "🇮🇳" },
  { id: "Kannada", name: "Kannada", flag: "🇮🇳" },
  { id: "Spanish", name: "Spanish", flag: "🇪🇸" },
  { id: "French", name: "French", flag: "🇫🇷" },
  { id: "German", name: "German", flag: "🇩🇪" },
];