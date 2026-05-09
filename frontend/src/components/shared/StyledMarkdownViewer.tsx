import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const preprocessMarkdown = (content: string) => {
    if (!content) return "";
    
    return content
        // 0. Strip References & Sources section (often used for data only, not UI)
        .split(/#+\s*(?:References|Sources)/i)[0]
        // 1. Ensure headers have double newlines before them if they follow text
        .replace(/(^|[^\n])(\s?#{1,6}\s+)/g, (match, p1, p2) => {
            return p1 ? `${p1}\n\n${p2.trimStart()}` : p2;
        })
        // 2. Fix cases where heading and paragraph are merged: "# Title Paragraph" -> "# Title\n\nParagraph"
        // Looks for a period followed by a space and a capital letter within a heading line
        .replace(/^(#{1,6}\s+[^.\n]+\.)\s+([A-Z])/gm, "$1\n\n$2")
        // 3. Fix cases where 7+ hashes are used (cap at h6)
        .replace(/#{7,}/g, "######")
        // 4. Ensure lists have a newline before them
        .replace(/([^\n])\n([-*]\s+)/g, "$1\n\n$2")
        .replace(/([^\n])\n(\d+\.\s+)/g, "$1\n\n$2")
        // 5. Replace em dashes with standard dashes for cleaner editorial look
        .replace(/—/g, "-")
        .trim();
};

export default function StyledMarkdownViewer({
    markdown,
    onLinkClick,
}: {
    markdown: string;
    onLinkClick?: (href: string) => void;
}) {
    const processedMarkdown = preprocessMarkdown(markdown);

    return (
        <div className="markdown-viewer prose-premium dark:prose-invert animate-in fade-in slide-in-from-bottom-2 duration-700">
            <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                    a: ({ node, ...props }) => (
                        <a 
                            {...props} 
                            onClick={(e) => {
                                if (onLinkClick && props.href) {
                                    e.preventDefault();
                                    onLinkClick(props.href);
                                }
                            }}
                            className="cursor-pointer"
                        />
                    )
                }}
            >
                {processedMarkdown}
            </ReactMarkdown>
        </div>
    );
}



