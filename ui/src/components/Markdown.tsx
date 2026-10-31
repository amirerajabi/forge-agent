import { Check, Copy } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function Code({ children, className }: { children?: ReactNode; className?: string }) {
  const [copied, setCopied] = useState(false);
  const text = String(children ?? '').replace(/\n$/, '');
  if (!className) return <code>{children}</code>;
  const language = className.replace('language-', '');
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };
  return (
    <div className="code-block">
      <div className="code-head"><span>{language || 'text'}</span><button onClick={copy}>{copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy'}</button></div>
      <pre><code className={className}>{text}</code></pre>
    </div>
  );
}

export function Markdown({ content }: { content: string }) {
  return (
    <div className="markdown" dir="auto">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code: ({ children, className }) => <Code className={className}>{children}</Code>,
          a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer">{children}</a>,
          p: ({ children }) => <p dir="auto">{children}</p>,
          h1: ({ children }) => <h1 dir="auto">{children}</h1>,
          h2: ({ children }) => <h2 dir="auto">{children}</h2>,
          h3: ({ children }) => <h3 dir="auto">{children}</h3>,
          li: ({ children }) => <li dir="auto">{children}</li>,
          blockquote: ({ children }) => <blockquote dir="auto">{children}</blockquote>,
          th: ({ children }) => <th dir="auto">{children}</th>,
          td: ({ children }) => <td dir="auto">{children}</td>,
        }}
      >{content}</ReactMarkdown>
    </div>
  );
}

