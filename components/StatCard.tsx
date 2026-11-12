export default function StatCard({ label, value, postfix = "" }: { label: string, value: number | string, postfix?: string }) {
  return (
    <div className="glass-panel stat-card">
      <div className="stat-value">{value}{postfix}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}
