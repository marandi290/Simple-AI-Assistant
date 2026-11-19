import { Bot, Code2, MessageSquareText, Sparkles } from 'lucide-react'

const suggestions = [
  { icon: Sparkles, title: 'Explain a concept', text: 'Explain how event-driven architecture works and when to use it.' },
  { icon: Code2, title: 'Debug or refactor', text: 'Review this function for bugs and suggest improvements.' },
  { icon: MessageSquareText, title: 'Draft content', text: 'Help me write clear technical documentation for an API endpoint.' },
]

export default function WelcomeScreen({ onSelect }) {
  return (
    <div className="flex h-full items-center justify-center px-6 py-10">
      <div className="w-full max-w-3xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-accent/20 bg-accent/10 text-accent">
            <Bot size={24} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">How can I help today?</h1>
          <p className="mt-2 text-sm text-text-secondary">Start a conversation, pick a model, and get focused assistance in a clean workspace.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {suggestions.map((s) => (
            <button
              key={s.title}
              onClick={() => onSelect?.(s.text)}
              className="group rounded-xl border border-border bg-bg-secondary/60 p-4 text-left transition-all hover:border-accent/30 hover:bg-bg-secondary"
            >
              <s.icon size={18} className="mb-3 text-text-muted group-hover:text-accent transition-colors" />
              <div className="text-sm font-medium text-text-primary">{s.title}</div>
              <div className="mt-1 text-sm text-text-secondary leading-relaxed">{s.text}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
