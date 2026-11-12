"use client"
import React, { useState, useEffect } from 'react'
import { BookOpen, Save, Copy, Check, ShieldCheck, Code } from 'lucide-react'

export default function PolicyDocumentationPage() {
  const [yaml, setYaml] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [copiedBib, setCopiedBib] = useState(false)

  useEffect(() => {
    async function loadPolicy() {
      try {
        const res = await fetch('/api/policy')
        if (res.ok) {
          const data = await res.json()
          setYaml(data.yaml || '')
        }
      } catch (err) {
        console.error('Failed to load policy:', err)
      } finally {
        setLoading(false)
      }
    }
    loadPolicy()
  }, [])

  const savePolicy = async () => {
    setSaving(true)
    setMessage('')
    try {
      const res = await fetch('/api/policy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yaml }),
      })
      if (res.ok) {
        setMessage('Policy saved successfully.')
      } else {
        setMessage('Failed to save policy.')
      }
    } catch (err) {
      setMessage('Error saving policy.')
      console.error(err)
    } finally {
      setSaving(false)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const bibtex = `@article{aiguard2024,
  title={Ai-guard: A Comprehensive Security Evaluation Benchmark for Autonomous LLM Agents},
  author={Ai-guard Research Team},
  journal={arXiv preprint arXiv:2408.00000},
  year={2024}
}`

  const copyBibtex = () => {
    navigator.clipboard.writeText(bibtex)
    setCopiedBib(true)
    setTimeout(() => setCopiedBib(false), 2000)
  }

  if (loading) return <div className="p-8 text-center text-xs">Loading documentation & security policy...</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--primary)] uppercase tracking-wider mb-1">
            <BookOpen className="h-4 w-4" /> Research Methodology & Policy Engine
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Documentation & Policy Configuration</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Configure guardrail inspection rules and reference academic citation specifications.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {message && (
            <span className={`text-xs font-semibold ${message.includes('success') ? 'text-emerald-500' : 'text-rose-500'}`}>
              {message}
            </span>
          )}
          <button
            onClick={savePolicy}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[var(--primary)] text-white text-xs font-semibold hover:bg-[var(--primary-hover)] transition-colors"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? 'Saving YAML...' : 'Save Security Policy'}
          </button>
        </div>
      </div>

      {/* BibTeX Citation Box */}
      <div className="research-card space-y-3 border-l-4 border-l-[var(--primary)]">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
            <Code className="h-4 w-4 text-[var(--primary)]" /> How to Cite Ai-guard Benchmark
          </h2>
          <button
            onClick={copyBibtex}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)] hover:underline"
          >
            {copiedBib ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            {copiedBib ? 'BibTeX Copied' : 'Copy BibTeX Citation'}
          </button>
        </div>
        <pre className="p-3 rounded-lg bg-[var(--surface-base)] border border-[var(--border-subtle)] font-mono text-xs text-[var(--text-secondary)]">
          {bibtex}
        </pre>
      </div>

      {/* Policy YAML Textarea Editor */}
      <div className="research-card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
            Active Security Guardrail Rules (<code className="font-mono text-xs">policy.yaml</code>)
          </h2>
          <span className="text-xs text-[var(--text-muted)]">Changes apply dynamically to proxy inspect operations</span>
        </div>

        <textarea
          value={yaml}
          onChange={e => setYaml(e.target.value)}
          rows={16}
          className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-base)] p-4 font-mono text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] leading-relaxed resize-y"
        />
      </div>
    </div>
  )
}
