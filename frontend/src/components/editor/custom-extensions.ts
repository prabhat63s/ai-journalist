import { Extension } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    /**
     * Indent the selection.
     */
    indent: () => ReturnType;
    /**
     * Outdent the selection.
     */
    outdent: () => ReturnType;
    /**
     * Set the line height.
     */
    setLineHeight: (lineHeight: string) => ReturnType;
    /**
     * Unset the line height.
     */
    unsetLineHeight: () => ReturnType;
  }
}

export const Indent = Extension.create({
  name: 'indent',

  addOptions() {
    return {
      types: ['heading', 'paragraph'],
      minIndent: 0,
      maxIndent: 8,
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: 0,
            parseHTML: element => parseInt(element.style.marginLeft, 10) / 24 || 0,
            renderHTML: attributes => {
              if (!attributes.indent) {
                return {}
              }

              return {
                style: `margin-left: ${attributes.indent * 24}px`,
              }
            },
          },
        },
      },
    ]
  },

  addCommands(): any {
    return {
      indent: () => ({ tr, state, dispatch }: any) => {
        const { selection } = state;
        tr.doc.nodesBetween(selection.from, selection.to, (node: any, pos: number) => {
          if (this.options.types.includes(node.type.name)) {
            const indent = Math.min(this.options.maxIndent, (node.attrs.indent || 0) + 1);
            if (dispatch) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                indent,
              });
            }
            return false;
          }
        });
        return true;
      },
      outdent: () => ({ tr, state, dispatch }: any) => {
        const { selection } = state;
        tr.doc.nodesBetween(selection.from, selection.to, (node: any, pos: number) => {
          if (this.options.types.includes(node.type.name)) {
            const indent = Math.max(this.options.minIndent, (node.attrs.indent || 0) - 1);
            if (dispatch) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                indent,
              });
            }
            return false;
          }
        });
        return true;
      },
    }
  },
});

export const LineHeight = Extension.create({
  name: 'lineHeight',

  addOptions() {
    return {
      types: ['heading', 'paragraph'],
      defaultLineHeight: 'normal',
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: this.options.defaultLineHeight,
            parseHTML: element => element.style.lineHeight || this.options.defaultLineHeight,
            renderHTML: attributes => {
              if (!attributes.lineHeight || attributes.lineHeight === this.options.defaultLineHeight) {
                return {}
              }

              return {
                style: `line-height: ${attributes.lineHeight}`,
              }
            },
          },
        },
      },
    ]
  },

  addCommands(): any {
    return {
      setLineHeight: (lineHeight: string) => ({ tr, state, dispatch }: any) => {
        const { selection } = state;
        tr.doc.nodesBetween(selection.from, selection.to, (node: any, pos: number) => {
          if (this.options.types.includes(node.type.name)) {
            if (dispatch) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                lineHeight,
              });
            }
            return false;
          }
        });
        return true;
      },
      unsetLineHeight: () => ({ tr, state, dispatch }: any) => {
        const { selection } = state;
        tr.doc.nodesBetween(selection.from, selection.to, (node: any, pos: number) => {
          if (this.options.types.includes(node.type.name)) {
            if (dispatch) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                lineHeight: this.options.defaultLineHeight,
              });
            }
            return false;
          }
        });
        return true;
      },
    }
  },
});
