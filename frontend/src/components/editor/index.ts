import { Node, mergeAttributes, nodeInputRule } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import BubbleMenu from '@tiptap/extension-bubble-menu';
import TextAlign from '@tiptap/extension-text-align';
import FontFamily from '@tiptap/extension-font-family';
import { TextStyle } from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { Indent, LineHeight } from './custom-extensions';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';

// Custom Citation Node
export const Citation = Node.create({
  name: 'citation',
  group: 'inline',
  inline: true,
  selectable: false,
  atom: true,

  addAttributes() {
    return {
      label: {
        default: null,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span.grounded-citation',
        getAttrs: dom => ({
          label: (dom as HTMLElement).innerText,
        }),
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: 'grounded-citation text-[var(--primary)] font-bold cursor-help underline decoration-dotted' }), HTMLAttributes.label]
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: /\[Doc: ([^\]]+)\]$/,
        type: this.type,
        getAttributes: (match) => ({ label: `[Doc: ${match[1]}]` }),
      }),
    ]
  },

  renderText({ node }) {
    return node.attrs.label
  },
});

export const defaultExtensions = [
  StarterKit.configure({
    // Some StarterKits include a basic link handling, we ensure it doesn't conflict
  }),
  Markdown,
  Citation,
  Link.configure({
    openOnClick: false,
    HTMLAttributes: {
      class: 'text-[var(--primary)] underline decoration-[var(--primary)]/30 hover:decoration-[var(--primary)] transition-all cursor-pointer font-medium',
    },
    autolink: true,
    validate: href => /^https?:\/\//.test(href),
  }),
  Image.configure({
    HTMLAttributes: {
      class: 'rounded-lg max-w-full h-auto mx-auto border border-[var(--border-tertiary)]',
    },
  }),
  BubbleMenu.configure({
    element: null, 
  }),
  TextAlign.configure({
    types: ['heading', 'paragraph'],
  }),
  TextStyle.configure(),
  FontFamily.configure(),
  Underline.configure(),
  Color.configure(),
  Highlight.configure({ multicolor: true }),
  Indent,
  LineHeight,
  Superscript,
  Subscript,
];

export * from './EditorWorkspace';
export { default as NewspaperCutout } from './NewspaperCutout';
export { default as SocialMediaKit } from './SocialMediaKit';
export { default as SocialMediaCutout } from './SocialMediaCutout';
