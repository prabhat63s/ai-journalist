import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function StyledMarkdownViewer({
    markdown,
    onLinkClick,
}: {
    markdown: string;
    onLinkClick?: (href: string) => void;
}) {
    return (
        <div className="markdown-viewer">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    h1: ({ children }) => (
                        <h1 className="text-3xl font-bold text-foreground">
                            {children}
                        </h1>
                    ),

                    h2: ({ children }) => (
                        <h2 className="text-2xl font-semibold text-foreground mt-4 mb-1">
                            {children}
                        </h2>
                    ),

                    h3: ({ children }) => (
                        <h3 className="text-xl font-semibold text-foreground mt-4 mb-1">
                            {children}
                        </h3>
                    ),

                    p: ({ children }) => (
                        <p className="text-foreground text-sm leading-6">
                            {children}
                        </p>
                    ),

                    ul: ({ children }) => (
                        <ul className="my-4 pl-6 space-y-2 list-disc marker:text-primary">
                            {children}
                        </ul>
                    ),

                    ol: ({ children }) => (
                        <ol className="my-4 pl-6 space-y-2 list-decimal marker:text-primary text-foreground">
                            {children}
                        </ol>
                    ),

                    li: ({ children }) => (
                        <li className="text-foreground/90 leading-relaxed pl-1">
                            {children}
                        </li>
                    ),

                    strong: ({ children }) => (
                        <strong className="font-semibold text-primary">
                            {children}
                        </strong>
                    ),

                    blockquote: ({ children }) => (
                        <blockquote className="my-6 pl-6 border-l-4 border-primary bg-primary/5 py-3 pr-4 rounded-r-xl text-foreground/80 italic">
                            {children}
                        </blockquote>
                    ),

                    code: ({ children }) => (
                        <code className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-sm font-mono border border-primary/10">
                            {children}
                        </code>
                    ),

                    pre: ({ children }) => (
                        <pre className="bg-[#1e1e1e] border border-black/5 rounded-xl p-5 my-6 overflow-x-auto shadow-sm text-white">
                            {children}
                        </pre>
                    ),

                    table: ({ children }) => (
                        <div className="my-8 overflow-x-auto rounded-xl border border-border shadow-sm">
                            <table className="w-full text-sm text-left">
                                {children}
                            </table>
                        </div>
                    ),

                    thead: ({ children }) => (
                        <thead className="bg-muted/30 text-foreground uppercase text-xs font-bold tracking-wider">
                            {children}
                        </thead>
                    ),

                    tbody: ({ children }) => (
                        <tbody className="divide-y divide-border">
                            {children}
                        </tbody>
                    ),

                    th: ({ children }) => (
                        <th className="px-6 py-4 font-semibold border-b border-border text-foreground">{children}</th>
                    ),

                    td: ({ children }) => (
                        <td className="px-6 py-4 text-foreground/80">{children}</td>
                    ),

                    tr: ({ children }) => (
                        <tr className="hover:bg-muted/20 transition-colors">{children}</tr>
                    ),

                    a: ({ children, href }) => (
                        <a 
                            href={href} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-primary hover:text-primary/80 underline underline-offset-4 decoration-primary/30 transition-colors"
                            onClick={(e) => {
                                if (onLinkClick && href) {
                                    e.preventDefault();
                                    onLinkClick(href);
                                }
                            }}
                        >
                            {children}
                        </a>
                    ),
                }}
            >
                {markdown}
            </ReactMarkdown>
        </div>
    );
}
