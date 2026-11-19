import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Check, Copy } from 'lucide-react'

function CodeBlock({ inline, className, children, ...props }) {
  const [copied, setCopied] = useState(false)
  const match = /language-(\w+)/.exec(className || '')
  const code = String(children).replace(/\n$/, '')

  if (inline || !match) {
    return <code className={className} {...props}>{children}</code>
  }

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  return (
    <div className="group relative my-3 overflow-hidden rounded-lg border border-border-subtle bg-[#0d1117]">
      <div className="flex items-center justify-between border-b border-border-subtle/70 bg-black/20 px-3 py-1.5">
        <span className="text-xs text-text-muted font-mono">{match[1]}</span>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
          aria-label="Copy code"
        >
          {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <SyntaxHighlighter
        style={oneDark}
        language={match[1]}
        PreTag="div"
        customStyle={{ margin: 0, padding: '14px 16px', background: 'transparent', fontSize: '13px', lineHeight: '1.6' }}
        codeTagProps={{ style: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' } }}
        {...props}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  )
}

export default function MarkdownContent({ content }) {
  return (
    <div className="prose-chat break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code: CodeBlock,
          a: ({ node, ...props }) => <a {...props} target="_blank" rel="noreferrer noopener" />,
        }}
      >
        {content || ''}
      </ReactMarkdown>
    </div>
  )
}
