"use client";

import React, { useState, useMemo, useRef } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toPng } from 'html-to-image';
import { useAuth } from '@/context/AuthContext';

interface NewspaperCutoutProps {
  title: string;
  content: string;
  date?: string;
  imageUrl?: string | null;
  author?: string;
  category?: string;
  stats?: Array<{ label: string; value: string }>;
}

type NewspaperStyle = 'broadsheet' | 'modern' | 'vintage';

const NEWSPAPER_STYLES: Record<NewspaperStyle, {
  name: string;
  bg: string;
  ink: string;
  accent: string;
  paperDark: string;
  mastheadFont: string;
  headlineFont: string;
  bodyFont: string;
  masthead: string;
  tagline: string;
}> = {
  broadsheet: {
    name: 'Broadsheet',
    bg: '#f5f0e8',
    ink: '#1a1410',
    accent: '#8b1a1a',
    paperDark: '#ede8db',
    mastheadFont: '"UnifrakturMaguntia", cursive',
    headlineFont: '"Libre Baskerville", serif',
    bodyFont: '"Crimson Pro", serif',
    masthead: 'The Mighty Dispatch',
    tagline: 'Global Intelligence & Analysis · Est. MDCCCXLVII'
  },
  modern: {
    name: 'Modern',
    bg: '#ffffff',
    ink: '#0a0a0a',
    accent: '#2563eb',
    paperDark: '#f5f5f5',
    mastheadFont: '"Oswald", sans-serif',
    headlineFont: '"Oswald", sans-serif',
    bodyFont: '"Inter", sans-serif',
    masthead: 'INTEL REPORT',
    tagline: 'Direct • Data-Driven • Deep Dive'
  },
  vintage: {
    name: 'Vintage',
    bg: '#e8dfc8',
    ink: '#1c1209',
    accent: '#6b3a1f',
    paperDark: '#ddd4bb',
    mastheadFont: '"UnifrakturMaguntia", cursive',
    headlineFont: '"Libre Baskerville", serif',
    bodyFont: '"Crimson Pro", serif',
    masthead: 'The Daily Chronicle',
    tagline: 'Established in the Age of Reason'
  }
};

export default function NewspaperCutout({
  title,
  content,
  date = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
  imageUrl,
  author,
  stats = [
    { label: "of supply chain faces structural metamorphosis", value: "84%" },
    { label: "projected transformation by year end", value: "11%" },
    { label: "efficiency gains in intelligence gathering", value: "+15%" }
  ]
}: NewspaperCutoutProps) {
  const [activeStyle, setActiveStyle] = useState<NewspaperStyle>('broadsheet');
  const [isDownloading, setIsDownloading] = useState(false);
  const paperRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const style = NEWSPAPER_STYLES[activeStyle];

  // Enhanced content processing to show COMPLETE content with editorial distribution
  const { leadParagraph, columns, pullQuote } = useMemo(() => {
    const rawParagraphs = content.split('\n\n')
      .map(p => p.trim())
      .filter(p => p && !p.startsWith('Sources') && !p.startsWith('References'));

    const processed = rawParagraphs.map(p => {
      if (p.startsWith('#')) {
        return { type: 'header' as const, content: p.replace(/^#+\s+/, '').toUpperCase() };
      }
      return { type: 'p' as const, content: p.replace(/\*\*/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') };
    });

    const firstPIndex = processed.findIndex(item => item.type === 'p');
    const lead = firstPIndex !== -1 ? processed[firstPIndex].content : "";

    // Select a pull quote and REMOVE it from remaining content to avoid duplication
    let quote = "The structural metamorphosis of the industrial heartland is not a choice, but a race for survival.";
    let remaining = processed.filter((_, idx) => idx !== firstPIndex);

    const quoteIndex = remaining.findIndex(item => item.type === 'p' && item.content.length > 80 && item.content.length < 250);
    if (quoteIndex !== -1) {
      quote = remaining[quoteIndex].content;
      remaining = remaining.filter((_, idx) => idx !== quoteIndex);
    }

    // Split remaining content into 3 columns
    const cols: typeof remaining[] = [[], [], []];
    remaining.forEach((item, idx) => {
      cols[idx % 3].push(item);
    });

    return { leadParagraph: lead, columns: cols, pullQuote: quote };
  }, [content]);

  const handleDownload = async () => {
    if (!paperRef.current) return;
    setIsDownloading(true);
    try {
      const fontUrl = "https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=UnifrakturMaguntia&family=Oswald:wght@300;400;600;700&family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,300;1,400&display=swap";
      
      // Fetch font CSS manually to bypass SecurityError during stylesheet scanning
      let fontCSS = "";
      try {
        const response = await fetch(fontUrl);
        fontCSS = await response.text();
      } catch (e) {
        console.warn("Could not fetch font CSS for embedding:", e);
      }

      await new Promise(resolve => setTimeout(resolve, 200));
      const dataUrl = await toPng(paperRef.current, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: style.bg,
        width: 1240,
        height: 1754,
        fontEmbedCSS: fontCSS,
        // Filter out the link tag that causes the SecurityError
        filter: (node: any) => {
          const tagName = node.tagName || '';
          const href = node.href || '';
          if (tagName === 'LINK' && href.includes('fonts.googleapis.com')) {
            return false;
          }
          return true;
        },
        style: {
          transform: 'scale(1)',
          borderRadius: '0',
          padding: '0',
          margin: '0',
        }
      });
      const link = document.createElement('a');
      link.download = `report-${title.slice(0, 20).toLowerCase().replace(/\s+/g, '-')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="relative w-full space-y-6">
      {/* Google Fonts Injection */}
      <link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=UnifrakturMaguntia&family=Oswald:wght@300;400;600;700&family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,300;1,400&display=swap" rel="stylesheet" crossOrigin="anonymous" />

      {/* Style Toggle Control */}
      <div className="flex items-center justify-center gap-2 no-print">
        {(Object.keys(NEWSPAPER_STYLES) as NewspaperStyle[]).map((key) => (
          <button
            key={key}
            onClick={() => setActiveStyle(key)}
            className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all border ${activeStyle === key
                ? 'bg-primary border-primary text-white shadow-xl scale-105'
                : 'bg-surface/50 border-border/40 text-muted hover:border-primary/40 hover:text-primary'
              }`}
          >
            {NEWSPAPER_STYLES[key].name}
          </button>
        ))}
      </div>

      <div className="relative group/paper">
        {/* Download FAB */}
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="absolute -top-4 -right-4 z-50 p-3 rounded-full bg-primary text-white shadow-2xl hover:scale-110 active:scale-95 transition-all opacity-0 group-hover/paper:opacity-100 disabled:opacity-50"
        >
          {isDownloading ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
        </button>

        <motion.div
          key={activeStyle}
          ref={paperRef}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="shadow-2xl relative overflow-hidden transition-all duration-500 w-full"
          style={{
            backgroundColor: style.bg,
            color: style.ink,
            fontFamily: style.bodyFont
          }}
        >
          {/* Subtle Paper Texture Overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.04] mix-blend-multiply bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27300%27 height=%27300%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3CfeColorMatrix type=%27saturate%27 values=%270%27/%3E%3C/filter%3E%3Crect width=%27300%27 height=%27300%27 filter=%27url(%23n)%27 opacity=%270.04%27/%3E%3C/svg%3E')]" />

          {/* MASTHEAD */}
          <header className="px-10 pt-8 pb-0 relative z-10">
            <div className="h-[3px] mb-[0.25rem]" style={{ backgroundColor: style.ink }} />
            <div className="h-[1px] mb-[0.6rem]" style={{ backgroundColor: style.ink }} />

            <div
              className="text-center leading-none mb-1 py-1"
              style={{ fontFamily: style.mastheadFont, fontSize: 'clamp(2.8rem, 8vw, 5.2rem)' }}
            >
              {style.masthead}
            </div>

            <div
              className="text-[9.5px] tracking-[0.35em] uppercase text-center opacity-70 mb-2 py-1"
              style={{ fontFamily: '"Oswald", sans-serif' }}
            >
              {style.tagline}
            </div>

            <div className="grid grid-cols-3 items-center py-2 border-y-[1px] text-[9.5px] uppercase tracking-widest font-medium" style={{ fontFamily: '"Oswald", sans-serif', borderColor: style.ink }}>
              <span>Vol. LXIV &nbsp;·&nbsp; No. 35,420</span>
              <span className="text-center font-bold">{date}</span>
              <span className="text-right">BY {user?.name?.toUpperCase() || "STAFF"}</span>
            </div>
          </header>

          {/* FEATURE IMAGE */}
          {imageUrl && (
            <div className="px-10 mb-6 relative z-10">
              <div className="p-1.5 border shadow-inner" style={{ borderColor: style.ink, backgroundColor: style.ink }}>
                <img
                  src={imageUrl}
                  alt="Feature"
                  crossOrigin="anonymous"
                  className={`w-full h-[450px] object-cover block transition-all duration-700 ${activeStyle === 'broadsheet' ? 'sepia-[0.15] contrast-[1.05]' :
                      activeStyle === 'vintage' ? 'sepia-[0.5] contrast-[1.1]' : ''
                    }`}
                />
                <div className="pt-2 pb-1 px-2 text-[11.5px] italic opacity-80" style={{ color: style.bg }}>
                  ABOVE: Investigative findings visualized. Photographed for the Dispatch Special Edition.
                </div>
              </div>
            </div>
          )}

          {/* BODY SECTION */}
          <div className="px-10 py-6 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1px_1fr_1px_1fr] gap-x-6">
              {/* Column 1 */}
              <div className="space-y-4 text-justify hyphens-auto">
                <p className="text-[0.93rem] leading-[1.65]">
                  <span
                    className="float-left text-[4.2rem] font-bold mr-3 mt-1 leading-[0.78] pr-1 pb-1"
                    style={{ fontFamily: style.headlineFont, color: style.ink }}
                  >
                    {leadParagraph.charAt(0)}
                  </span>
                  {leadParagraph.slice(1)}
                </p>
                {columns[0].map((item, i) => (
                  <div key={i}>
                    {item.type === 'header' ? (
                      <h3 className="text-center font-bold text-[0.88rem] uppercase tracking-widest border-y-[1px] py-1 mt-4 mb-3" style={{ fontFamily: style.headlineFont, borderColor: style.ink }}>
                        {item.content}
                      </h3>
                    ) : (
                      <p className="text-[0.93rem] leading-[1.65]">{item.content}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Rule 1 */}
              <div className="hidden md:block w-px opacity-15" style={{ backgroundColor: style.ink }} />

              {/* Column 2 */}
              <div className="space-y-4 text-justify hyphens-auto pt-8 md:pt-0">
                {/* Pull Quote in center column */}
                <div className="border-y-2 py-4 my-4 text-center italic text-[1.05rem] leading-relaxed" style={{ borderColor: style.ink, fontFamily: style.headlineFont }}>
                  "{pullQuote}"
                  <cite className="block text-[0.58rem] uppercase not-italic font-bold tracking-[0.2em] mt-3 opacity-60">— Investigative Insight</cite>
                </div>

                {columns[1].map((item, i) => (
                  <div key={i}>
                    {item.type === 'header' ? (
                      <h3 className="text-center font-bold text-[0.88rem] uppercase tracking-widest border-y-[1px] py-1 mt-4 mb-3" style={{ fontFamily: style.headlineFont, borderColor: style.ink }}>
                        {item.content}
                      </h3>
                    ) : (
                      <p className="text-[0.93rem] leading-[1.65]">{item.content}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Rule 2 */}
              <div className="hidden md:block w-px opacity-15" style={{ backgroundColor: style.ink }} />

              {/* Column 3 */}
              <div className="space-y-4 text-justify hyphens-auto pt-8 md:pt-0">
                {columns[2].map((item, i) => (
                  <div key={i}>
                    {item.type === 'header' ? (
                      <h3 className="text-center font-bold text-[0.88rem] uppercase tracking-widest border-y-[1px] py-1 mt-4 mb-3" style={{ fontFamily: style.headlineFont, borderColor: style.ink }}>
                        {item.content}
                      </h3>
                    ) : (
                      <p className="text-[0.93rem] leading-[1.65]">{item.content}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* STATS BAR */}
          <div className="mx-10 my-4 grid grid-cols-1 md:grid-cols-3 border-[1px] relative z-10" style={{ borderColor: style.ink, backgroundColor: style.paperDark }}>
            {stats.map((stat, i) => (
              <div key={i} className={`p-4 text-center ${i < 2 ? 'md:border-r-[1px]' : ''}`} style={{ borderColor: 'rgba(26,20,16,0.2)' }}>
                <span className="block text-2xl font-bold mb-0.5" style={{ color: style.accent, fontFamily: '"Oswald", sans-serif' }}>{stat.value}</span>
                <span className="block text-[10.5px] leading-tight opacity-70 italic px-2">{stat.label}</span>
              </div>
            ))}
          </div>

          {/* FOOTER */}
          <footer className="mx-10 border-t-[3px] border-double pt-2 pb-6 flex justify-between items-center text-[9px] uppercase tracking-[0.15em] font-medium opacity-60 relative z-10" style={{ borderColor: style.ink, fontFamily: '"Oswald", sans-serif' }}>
            <span>The Dispatch — Global Intelligence Edition</span>
            <div className="flex gap-4">
              <span>All Rights Reserved</span>
              <span>·</span>
              <span>2026</span>
            </div>
          </footer>
        </motion.div>
      </div>
    </div>
  );
}
