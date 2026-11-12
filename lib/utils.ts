import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}m ${seconds}s`
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(date)
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length - 3) + '...'
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export const familyColors: Record<string, string> = {
  direct_injection: 'hsl(221.2 83.2% 53.3%)',
  content_injection: 'hsl(262.1 83.3% 57.8%)',
  memory_poisoning: 'hsl(199 89% 48%)',
  tool_manipulation: 'hsl(38 92% 50%)',
  planning_manipulation: 'hsl(142 76% 36%)',
  goal_diversion: 'hsl(0 84% 60%)',
  data_exfiltration: 'hsl(330 81% 60%)',
  autonomous_actions: 'hsl(180 80% 40%)',
}

export const difficultyColors: Record<string, { bg: string; text: string }> = {
  trivial: { bg: 'hsl(142 76% 36% / 0.15)', text: 'hsl(142 76% 36%)' },
  easy: { bg: 'hsl(142 70% 45% / 0.15)', text: 'hsl(142 70% 45%)' },
  medium: { bg: 'hsl(38 92% 50% / 0.15)', text: 'hsl(38 92% 50%)' },
  hard: { bg: 'hsl(15 90% 55% / 0.15)', text: 'hsl(15 90% 55%)' },
  expert: { bg: 'hsl(0 84% 60% / 0.15)', text: 'hsl(0 84% 60%)' },
}

export const scenarioIcons: Record<string, string> = {
  generic: 'file-text',
  github_issue: 'github',
  gitlab_issue: 'gitlab',
  reddit_post: 'message-square',
  forum_discussion: 'message-circle',
  documentation_page: 'book-open',
  wiki: 'book',
  support_ticket: 'ticket',
  email_assistant: 'mail',
  calendar_assistant: 'calendar',
  travel_assistant: 'plane',
  banking_assistant: 'credit-card',
  shopping_assistant: 'shopping-bag',
}

export const threatModelLabels: Record<string, string> = {
  adversarial_user: 'Adversarial User',
  malicious_third_party_content: 'Malicious Third-Party Content',
  compromised_tool: 'Compromised Tool',
  insider_threat: 'Insider Threat',
  supply_chain: 'Supply Chain',
}

export const capabilityLabels: Record<string, string> = {
  prompt_level: 'Prompt Level',
  document_level: 'Document Level',
  tool_output_level: 'Tool Output Level',
  memory_level: 'Memory Level',
  network_level: 'Network Level',
}