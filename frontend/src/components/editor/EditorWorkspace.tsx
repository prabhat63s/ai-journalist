"use client";

import React from 'react';
import { EditorContent } from '@tiptap/react';
import { BubbleMenu as TiptapBubbleMenu } from '@tiptap/react/menus';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Undo,
  Redo,
  Image as ImageIcon,
  Type,
  ChevronDown,
  Underline as UnderlineIcon,
  Palette,
  Highlighter,
  Indent as IndentIcon,
  Outdent,
  Space,
  Quote,
  Minus,
  Eraser,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Code,
  Terminal,
  Link2,
  Superscript as SuperscriptIcon,
  Subscript as SubscriptIcon,
  Strikethrough
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import NewspaperCutout from './NewspaperCutout';
import SocialMediaKit from './SocialMediaKit';
import { GeneratedImageCard } from '../journalist';
import { ArticleStats } from '@/types/journalist.types';

interface EditorWorkspaceProps {
  editor: any;
  viewMode: 'editor' | 'newspaper' | 'social';
  title: string;
  content: string;
  imageUrl: string;
  canUndo: boolean;
  canRedo: boolean;
  setLink: () => void;
  insertImage: () => void;
  socialKit?: any;
  onCopySocial?: (platform: string, content: string | string[]) => void;
  onRegenerateSocial?: (options: any) => void;
  isGeneratingSocial?: boolean;
  imagePrompt?: string;
  onRegenerateImage?: () => void;
  onEditImagePrompt?: (newPrompt: string) => void;
  onDownloadImage?: () => void;
  isGeneratingImage?: boolean;
  stats?: ArticleStats | null;
}

export const EditorWorkspace: React.FC<EditorWorkspaceProps> = ({
  editor,
  viewMode,
  title,
  content,
  imageUrl,
  canUndo,
  canRedo,
  setLink,
  insertImage,
  socialKit,
  onCopySocial,
  onRegenerateSocial,
  isGeneratingSocial,
  imagePrompt = "Cover image generated via AI based on article content.",
  onRegenerateImage,
  onEditImagePrompt,
  onDownloadImage,
  isGeneratingImage = false,
  stats
}) => {
  if (!editor) return null;

  return (
    <div className="flex-1 flex overflow-hidden relative">
      {/* Tiptap Bubble Menu - Maximum Tools for Rapid Editing */}
      <TiptapBubbleMenu
        editor={editor}
        options={{
          placement: 'top',
          offset: 10,
        }}
        className="flex items-center gap-0.5 bg-background shadow-2xl border border-border/40 p-1 rounded-xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center gap-0.5 px-1 border-r border-border/20">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded-lg transition-colors ${editor.isActive('bold') ? 'text-primary bg-primary/10' : 'text-muted-dark hover:bg-surface hover:text-foreground'}`}
            title="Bold"
          >
            <Bold size={14} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded-lg transition-colors ${editor.isActive('italic') ? 'text-primary bg-primary/10' : 'text-muted-dark hover:bg-surface hover:text-foreground'}`}
            title="Italic"
          >
            <Italic size={14} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-1.5 rounded-lg transition-colors ${editor.isActive('underline') ? 'text-primary bg-primary/10' : 'text-muted-dark hover:bg-surface hover:text-foreground'}`}
            title="Underline"
          >
            <UnderlineIcon size={14} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`p-1.5 rounded-lg transition-colors ${editor.isActive('strike') ? 'text-primary bg-primary/10' : 'text-muted-dark hover:bg-surface hover:text-foreground'}`}
            title="Strikethrough"
          >
            <Strikethrough size={14} />
          </button>
        </div>

        <div className="flex items-center gap-0.5 px-1 border-r border-border/20">
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`p-1.5 rounded-lg transition-colors ${editor.isActive('heading', { level: 1 }) ? 'text-primary bg-primary/10' : 'text-muted-dark hover:bg-surface hover:text-foreground'}`}
            title="H1"
          >
            <Heading1 size={14} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-1.5 rounded-lg transition-colors ${editor.isActive('heading', { level: 2 }) ? 'text-primary bg-primary/10' : 'text-muted-dark hover:bg-surface hover:text-foreground'}`}
            title="H2"
          >
            <Heading2 size={14} />
          </button>
        </div>

        <div className="flex items-center gap-0.5 px-1 border-r border-border/20">
          {/* Text Color in Bubble Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={`p-1.5 rounded-lg transition-all ${editor.isActive('textStyle', { color: /.*/ }) ? 'text-primary bg-primary/10' : 'text-muted-dark hover:bg-surface'}`} title="Text Color">
                <Palette size={14} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="bg-background/95 backdrop-blur-xl border-border/40 rounded-xl p-2 shadow-2xl flex flex-wrap gap-1 max-w-[150px] z-[999]">
              {[
                '#000000', '#475569', '#ef4444', '#f97316',
                '#eab308', '#10b981', '#3b82f6', '#6366f1',
                '#8b5cf6', '#ec4899', '#94a3b8', '#ffffff'
              ].map(color => (
                <button key={color} onClick={() => editor.chain().focus().setColor(color).run()} className="w-6 h-6 rounded-md border border-border/20 transition-transform hover:scale-110 shadow-sm" style={{ backgroundColor: color }} />
              ))}
              <button onClick={() => editor.chain().focus().unsetColor().run()} className="w-full mt-1 py-1 text-[9px] font-bold uppercase tracking-wider hover:bg-surface rounded-md text-muted">Reset Color</button>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Highlight in Bubble Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={`p-1.5 rounded-lg transition-all ${editor.isActive('highlight') ? 'text-primary bg-primary/10' : 'text-muted-dark hover:bg-surface'}`} title="Highlight">
                <Highlighter size={14} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="bg-background/95 backdrop-blur-xl border-border/40 rounded-xl p-2 shadow-2xl flex flex-wrap gap-1 max-w-[150px] z-[999]">
              {[
                '#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8',
                '#fed7aa', '#ddd6fe', '#e2e8f0', '#ffedd5',
                '#dcfce7', '#dbeafe', '#f3e8ff', '#fae8ff'
              ].map(color => (
                <button key={color} onClick={() => editor.chain().focus().toggleHighlight({ color }).run()} className="w-6 h-6 rounded-md border border-border/20 transition-transform hover:scale-110 shadow-sm" style={{ backgroundColor: color }} />
              ))}
              <button onClick={() => editor.chain().focus().unsetHighlight().run()} className="w-full mt-1 py-1 text-[9px] font-bold uppercase tracking-wider hover:bg-surface rounded-md text-muted">Clear Highlight</button>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-0.5 px-1 border-r border-border/20">
          <button
            onClick={setLink}
            className={`p-1.5 rounded-lg transition-colors ${editor.isActive('link') ? 'text-primary bg-primary/10' : 'text-muted-dark hover:bg-surface hover:text-foreground'}`}
            title="Link"
          >
            <Link2 size={14} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={`p-1.5 rounded-lg transition-colors ${editor.isActive('code') ? 'text-primary bg-primary/10' : 'text-muted-dark hover:bg-surface hover:text-foreground'}`}
            title="Code"
          >
            <Code size={14} />
          </button>
        </div>

        <div className="flex items-center gap-0.5 px-1">
          <button
            onClick={() => {
              editor.chain().focus().unsetAllMarks().run();
              editor.chain().focus().clearNodes().run();
            }}
            className="p-1.5 rounded-lg text-muted-dark hover:bg-surface hover:text-foreground transition-all"
            title="Clear"
          >
            <Eraser size={14} />
          </button>
        </div>
      </TiptapBubbleMenu>

      <div className="flex-1 overflow-y-auto hide-scrollbar bg-surface/10">
        <div className="w-full p-4">
          {/* Toolbar Section */}
          <div className="flex items-center gap-2 mb-4 overflow-x-auto no-scrollbar pb-2">
            {/* 1. History Group */}
            <div className="flex items-center bg-surface-hover/40 p-0.5 rounded-lg border border-border/20 shrink-0">
              <button
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!canUndo}
                className="p-1.5 rounded-md hover:bg-surface transition-all disabled:opacity-20 text-muted-dark hover:text-foreground"
                title="Undo"
              >
                <Undo size={15} />
              </button>
              <button
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!canRedo}
                className="p-1.5 rounded-md hover:bg-surface transition-all disabled:opacity-20 text-muted-dark hover:text-foreground"
                title="Redo"
              >
                <Redo size={15} />
              </button>
            </div>

            {/* 2. Typography Group */}
            <div className="flex items-center bg-surface-hover/40 p-0.5 rounded-lg border border-border/20 shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-surface text-muted-dark hover:text-foreground transition-all">
                    <Type size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">
                      {editor.getAttributes('textStyle').fontFamily?.split(',')[0].replace('var(--font-', '').replace(')', '').replace(/-/g, ' ') || 'Default'}
                    </span>
                    <ChevronDown size={12} className="opacity-40" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-background/95 backdrop-blur-xl border-border/40 rounded-xl p-1 shadow-2xl min-w-[180px] z-[999]">
                  <div className="px-2 py-1.5 text-[9px] font-bold text-muted uppercase tracking-widest border-b border-border/10 mb-1">Sans Serif</div>
                  <DropdownMenuItem onClick={() => editor.chain().focus().setFontFamily('var(--font-inter), sans-serif').run()} className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:bg-surface focus:bg-surface">
                    <span className="text-[13px] font-medium" style={{ fontFamily: 'var(--font-inter)' }}>Inter (Classic)</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => editor.chain().focus().setFontFamily('Montserrat, sans-serif').run()} className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:bg-surface focus:bg-surface">
                    <span className="text-[13px] font-medium" style={{ fontFamily: 'Montserrat' }}>Montserrat (Modern)</span>
                  </DropdownMenuItem>

                  <div className="px-2 py-1.5 text-[9px] font-bold text-muted uppercase tracking-widest border-b border-border/10 my-1">Serif</div>
                  <DropdownMenuItem onClick={() => editor.chain().focus().setFontFamily('var(--font-playfair), serif').run()} className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:bg-surface focus:bg-surface">
                    <span className="text-[13px] font-medium" style={{ fontFamily: 'var(--font-playfair)' }}>Playfair Display</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => editor.chain().focus().setFontFamily('Lora, serif').run()} className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:bg-surface focus:bg-surface">
                    <span className="text-[13px] font-medium" style={{ fontFamily: 'Lora' }}>Lora (Elegant)</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => editor.chain().focus().setFontFamily('Roboto Slab, serif').run()} className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:bg-surface focus:bg-surface">
                    <span className="text-[13px] font-medium" style={{ fontFamily: 'Roboto Slab' }}>Roboto Slab</span>
                  </DropdownMenuItem>

                  <div className="px-2 py-1.5 text-[9px] font-bold text-muted uppercase tracking-widest border-b border-border/10 my-1">Technical</div>
                  <DropdownMenuItem onClick={() => editor.chain().focus().setFontFamily('monospace').run()} className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:bg-surface focus:bg-surface">
                    <span className="text-[13px] font-medium" style={{ fontFamily: 'monospace' }}>Space Mono</span>
                  </DropdownMenuItem>

                  <div className="border-t border-border/10 mt-1 pt-1">
                    <DropdownMenuItem onClick={() => editor.chain().focus().unsetFontFamily().run()} className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:bg-surface focus:bg-surface">
                      <span className="text-[13px] font-medium opacity-50 italic">System Default</span>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="w-[1px] h-4 bg-border/20 mx-1" />

              <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className={`p-2 rounded-md transition-all ${editor.isActive('heading', { level: 1 }) ? 'text-primary bg-primary/10 shadow-inner' : 'text-muted-dark hover:bg-surface hover:text-foreground'}`}
                title="Heading 1"
              >
                <Heading1 size={15} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={`p-2 rounded-md transition-all ${editor.isActive('heading', { level: 2 }) ? 'text-primary bg-primary/10 shadow-inner' : 'text-muted-dark hover:bg-surface hover:text-foreground'}`}
                title="Heading 2"
              >
                <Heading2 size={15} />
              </button>
            </div>

            {/* 3. Basic Formatting Group */}
            <div className="flex items-center bg-surface-hover/40 p-0.5 rounded-lg border border-border/20 shrink-0">
              <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`p-2 rounded-md transition-all ${editor.isActive('bold') ? 'text-primary bg-primary/10 shadow-inner' : 'text-muted-dark hover:bg-surface hover:text-foreground'}`}
                title="Bold"
              >
                <Bold size={15} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`p-2 rounded-md transition-all ${editor.isActive('italic') ? 'text-primary bg-primary/10 shadow-inner' : 'text-muted-dark hover:bg-surface hover:text-foreground'}`}
                title="Italic"
              >
                <Italic size={15} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                className={`p-2 rounded-md transition-all ${editor.isActive('underline') ? 'text-primary bg-primary/10 shadow-inner' : 'text-muted-dark hover:bg-surface hover:text-foreground'}`}
                title="Underline"
              >
                <UnderlineIcon size={15} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleStrike().run()}
                className={`p-2 rounded-md transition-all ${editor.isActive('strike') ? 'text-primary bg-primary/10 shadow-inner' : 'text-muted-dark hover:bg-surface hover:text-foreground'}`}
                title="Strikethrough"
              >
                <Strikethrough size={15} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleSuperscript().run()}
                className={`p-2 rounded-md transition-all ${editor.isActive('superscript') ? 'text-primary bg-primary/10 shadow-inner' : 'text-muted-dark hover:bg-surface hover:text-foreground'}`}
                title="Superscript"
              >
                <SuperscriptIcon size={15} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleSubscript().run()}
                className={`p-2 rounded-md transition-all ${editor.isActive('subscript') ? 'text-primary bg-primary/10 shadow-inner' : 'text-muted-dark hover:bg-surface hover:text-foreground'}`}
                title="Subscript"
              >
                <SubscriptIcon size={15} />
              </button>

              <div className="w-[1px] h-4 bg-border/20 mx-1" />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={`p-2 rounded-md transition-all ${editor.isActive('textStyle', { color: /.*/ }) ? 'text-primary' : 'text-muted-dark hover:bg-surface hover:text-foreground'}`} title="Text Color">
                    <Palette size={15} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-background/95 backdrop-blur-xl border-border/40 rounded-xl p-2 shadow-2xl flex flex-wrap gap-1 max-w-[150px] z-[999]">
                  {[
                    '#000000', '#475569', '#ef4444', '#f97316',
                    '#eab308', '#10b981', '#3b82f6', '#6366f1',
                    '#8b5cf6', '#ec4899', '#94a3b8', '#ffffff'
                  ].map(color => (
                    <button key={color} onClick={() => editor.chain().focus().setColor(color).run()} className="w-6 h-6 rounded-md border border-border/20 transition-transform hover:scale-110 shadow-sm" style={{ backgroundColor: color }} />
                  ))}
                  <button onClick={() => editor.chain().focus().unsetColor().run()} className="w-full mt-1 py-1 text-[10px] font-bold uppercase tracking-wider hover:bg-surface rounded-md text-muted">Reset Color</button>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={`p-2 rounded-md transition-all ${editor.isActive('highlight') ? 'text-primary' : 'text-muted-dark hover:bg-surface hover:text-foreground'}`} title="Highlight">
                    <Highlighter size={15} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-background/95 backdrop-blur-xl border-border/40 rounded-xl p-2 shadow-2xl flex flex-wrap gap-1 max-w-[150px] z-[999]">
                  {[
                    '#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8',
                    '#fed7aa', '#ddd6fe', '#e2e8f0', '#ffedd5',
                    '#dcfce7', '#dbeafe', '#f3e8ff', '#fae8ff'
                  ].map(color => (
                    <button key={color} onClick={() => editor.chain().focus().toggleHighlight({ color }).run()} className="w-6 h-6 rounded-md border border-border/20 transition-transform hover:scale-110 shadow-sm" style={{ backgroundColor: color }} />
                  ))}
                  <button onClick={() => editor.chain().focus().unsetHighlight().run()} className="w-full mt-1 py-1 text-[10px] font-bold uppercase tracking-wider hover:bg-surface rounded-md text-muted">Clear Highlight</button>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="w-[1px] h-4 bg-border/20 mx-1" />

              <button
                onClick={() => {
                  editor.chain().focus().unsetAllMarks().run();
                  editor.chain().focus().clearNodes().run();
                }}
                className="p-2 rounded-md text-muted-dark hover:bg-surface hover:text-foreground transition-all"
                title="Clear Formatting"
              >
                <Eraser size={15} />
              </button>
            </div>

            {/* 4. Layout & Spacing Group */}
            <div className="flex items-center bg-surface-hover/40 p-0.5 rounded-lg border border-border/20 shrink-0">
              <button
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
                className={`p-2 rounded-md transition-all ${editor.isActive({ textAlign: 'left' }) ? 'text-primary bg-primary/10 shadow-inner' : 'text-muted-dark hover:bg-surface hover:text-foreground'}`}
                title="Align Left"
              >
                <AlignLeft size={15} />
              </button>
              <button
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
                className={`p-2 rounded-md transition-all ${editor.isActive({ textAlign: 'center' }) ? 'text-primary bg-primary/10 shadow-inner' : 'text-muted-dark hover:bg-surface hover:text-foreground'}`}
                title="Align Center"
              >
                <AlignCenter size={15} />
              </button>
              <button
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
                className={`p-2 rounded-md transition-all ${editor.isActive({ textAlign: 'right' }) ? 'text-primary bg-primary/10 shadow-inner' : 'text-muted-dark hover:bg-surface hover:text-foreground'}`}
                title="Align Right"
              >
                <AlignRight size={15} />
              </button>

              <div className="w-[1px] h-4 bg-border/20 mx-1" />

              <button onClick={() => (editor as any).commands.outdent()} className="p-2 rounded-md text-muted-dark hover:bg-surface hover:text-foreground transition-all" title="Decrease Indent">
                <Outdent size={15} />
              </button>
              <button onClick={() => (editor as any).commands.indent()} className="p-2 rounded-md text-muted-dark hover:bg-surface hover:text-foreground transition-all" title="Increase Indent">
                <IndentIcon size={15} />
              </button>

              <div className="w-[1px] h-4 bg-border/20 mx-1" />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-2 rounded-md text-muted-dark hover:bg-surface hover:text-foreground transition-all" title="Line Height">
                    <Space size={15} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-background/95 backdrop-blur-xl border-border/40 rounded-xl p-1 shadow-2xl min-w-[120px]">
                  {[{ label: 'Normal', value: 'normal' }, { label: 'Tight', value: '1.2' }, { label: 'Relaxed', value: '1.5' }, { label: 'Double', value: '2' }].map(item => (
                    <DropdownMenuItem key={item.value} onClick={() => (editor as any).commands.setLineHeight(item.value)} className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer hover:bg-surface focus:bg-surface">
                      <span className="text-[12px] font-medium">{item.label}</span>
                      <span className="text-[10px] text-muted">{item.value === 'normal' ? '' : item.value}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* 5. Structure Group */}
            <div className="flex items-center bg-surface-hover/40 p-0.5 rounded-lg border border-border/20 shrink-0">
              <button
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={`p-2 rounded-md transition-all ${editor.isActive('bulletList') ? 'text-primary bg-primary/10 shadow-inner' : 'text-muted-dark hover:bg-surface hover:text-foreground'}`}
                title="Bullet List"
              >
                <List size={15} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={`p-2 rounded-md transition-all ${editor.isActive('orderedList') ? 'text-primary bg-primary/10 shadow-inner' : 'text-muted-dark hover:bg-surface hover:text-foreground'}`}
                title="Ordered List"
              >
                <ListOrdered size={15} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                className={`p-2 rounded-md transition-all ${editor.isActive('blockquote') ? 'text-primary bg-primary/10 shadow-inner' : 'text-muted-dark hover:bg-surface hover:text-foreground'}`}
                title="Blockquote"
              >
                <Quote size={15} />
              </button>
            </div>

            {/* 6. Advanced/Insert Group */}
            <div className="flex items-center bg-surface-hover/40 p-0.5 rounded-lg border border-border/20 shrink-0">
              <button
                onClick={() => editor.chain().focus().toggleCode().run()}
                className={`p-2 rounded-md transition-all ${editor.isActive('code') ? 'text-primary bg-primary/10 shadow-inner' : 'text-muted-dark hover:bg-surface hover:text-foreground'}`}
                title="Inline Code"
              >
                <Code size={15} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                className={`p-2 rounded-md transition-all ${editor.isActive('codeBlock') ? 'text-primary bg-primary/10 shadow-inner' : 'text-muted-dark hover:bg-surface hover:text-foreground'}`}
                title="Code Block"
              >
                <Terminal size={15} />
              </button>

              <div className="w-[1px] h-4 bg-border/20 mx-1" />

              <button onClick={setLink} className={`p-2 rounded-md transition-all ${editor.isActive('link') ? 'text-primary bg-primary/10 shadow-inner' : 'text-muted-dark hover:bg-surface hover:text-foreground'}`} title="Add Link">
                <Link2 size={15} />
              </button>
              <button onClick={() => insertImage()} className="p-2 rounded-md text-muted-dark hover:bg-surface hover:text-foreground transition-all" title="Insert Image">
                <ImageIcon size={15} />
              </button>
            </div>
          </div>

          {/* Editor Area */}

          {viewMode === 'newspaper' ? (
            <NewspaperCutout
              title={title}
              content={content}
              imageUrl={imageUrl}
            />
          ) : viewMode === 'social' ? (
            <div className="max-w-4xl mx-auto">
              <SocialMediaKit
                data={[
                  {
                    platform: 'X' as const,
                    content: socialKit?.twitter_thread?.join('\n\n') || (Array.isArray(socialKit?.platforms?.twitter) ? socialKit.platforms.twitter.join('\n\n') : ''),
                    tags: socialKit?.twitter_tags || [],
                    charLimit: 280
                  },
                  {
                    platform: 'LinkedIn' as const,
                    content: socialKit?.linkedin_post || socialKit?.platforms?.linkedin || '',
                    tags: socialKit?.linkedin_tags || [],
                    charLimit: 3000
                  },
                  {
                    platform: 'Instagram' as const,
                    content: socialKit?.instagram_caption || socialKit?.platforms?.instagram || '',
                    tags: socialKit?.instagram_tags || [],
                    charLimit: 2200
                  },
                  {
                    platform: 'Facebook' as const,
                    content: socialKit?.facebook_post || socialKit?.platforms?.facebook || '',
                    tags: socialKit?.facebook_tags || [],
                    charLimit: 5000
                  },
                  {
                    platform: 'Newsletter' as const,
                    content: socialKit?.newsletter_blurb || socialKit?.platforms?.newsletter || '',
                    tags: socialKit?.newsletter_tags || [],
                    charLimit: 2000
                  }
                ].filter(card => card.content)}
                onCopy={onCopySocial}
                onRegenerate={onRegenerateSocial}
                isGenerating={isGeneratingSocial}
                imageUrl={imageUrl}
              />
            </div>
          ) : (
            <div className="bg-background/40 backdrop-blur-md">
              <EditorContent editor={editor} className="prose-editor h-fit max-h-[55vh] overflow-y-auto" />

              {/* top keywords stats */}
              {stats && stats.keywords.length > 0 && (
                <div className="my-8 space-y-3">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Top Keywords</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {stats.keywords.map(([key, count], i) => (
                      <div key={i} className="px-2.5 py-1 text-xs rounded font-semibold bg-primary/10 border border-primary/20 flex items-center gap-2">
                        <span className="text-primary">{key}</span>
                        <span className="text-primary/60">{count}X</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Generated Image Card */}
              {imageUrl ? (
                <div className="flex-1">
                  <GeneratedImageCard
                    imageUrl={imageUrl}
                    prompt={imagePrompt}
                    onRegenerate={onRegenerateImage}
                    onEditPrompt={onEditImagePrompt}
                    onDownload={onDownloadImage}
                    isGenerating={isGeneratingImage}
                  />
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center border-2 border-dashed border-border/20 rounded-2xl bg-surface/30 text-muted text-xs p-10 text-center italic">
                  Visual asset will be generated based on your investigation content.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};