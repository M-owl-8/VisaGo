'use client';

import { useMemo } from 'react';

interface MarkdownMessageProps {
  content: string;
}

/**
 * Lightweight markdown renderer for chat messages
 * Supports: **bold**, *italic*, `code`, ```code blocks```, lists, and links
 */
export function MarkdownMessage({ content }: MarkdownMessageProps) {
  const formattedContent = useMemo(() => {
    return formatMarkdown(content);
  }, [content]);

  return (
    <div 
      className="prose prose-invert prose-sm max-w-none prose-p:my-2 prose-p:leading-relaxed prose-pre:bg-black/30 prose-pre:border prose-pre:border-white/10 prose-code:text-primary prose-a:text-primary prose-a:no-underline hover:prose-a:underline"
      dangerouslySetInnerHTML={{ __html: formattedContent }}
    />
  );
}

function formatMarkdown(text: string): string {
  let html = text;

  // Escape HTML to prevent XSS
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks (must come before inline code)
  html = html.replace(/```([^\n]*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code class="language-${lang || 'plaintext'}">${code.trim()}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Line breaks
  html = html.replace(/\n/g, '<br />');

  // Numbered lists
  html = html.replace(/(\d+\.\s+[^\n]+(?:\n(?!\d+\.\s+)[^\n]+)*)/g, (match) => {
    const items = match.split(/\n(?=\d+\.\s+)/).map(item => {
      const cleaned = item.replace(/^\d+\.\s+/, '');
      return `<li>${cleaned}</li>`;
    }).join('');
    return `<ol class="list-decimal list-inside my-2 space-y-1">${items}</ol>`;
  });

  // Bullet lists
  html = html.replace(/([-*]\s+[^\n]+(?:\n(?![-*]\s+)[^\n]+)*)/g, (match) => {
    const items = match.split(/\n(?=[-*]\s+)/).map(item => {
      const cleaned = item.replace(/^[-*]\s+/, '');
      return `<li>${cleaned}</li>`;
    }).join('');
    return `<ul class="list-disc list-inside my-2 space-y-1">${items}</ul>`;
  });

  // Paragraphs
  const paragraphs = html.split(/<br\s*\/?><br\s*\/?>/);
  html = paragraphs.map(p => p.trim() ? `<p>${p}</p>` : '').join('');

  return html;
}

