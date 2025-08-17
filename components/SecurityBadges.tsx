export default function SecurityBadges() {
  return (
    <div className="flex items-center gap-2">
      <div className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-900/50 text-emerald-300 border border-emerald-800/50 flex items-center gap-1">
        <span className="text-sm">🇩🇪</span>
        <span>German Server</span>
      </div>
      <div className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-900/50 text-emerald-300 border border-emerald-800/50 flex items-center gap-1">
        <span className="text-sm">🇪🇺</span>
        <span>EU Compliant</span>
      </div>
      <div className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-900/50 text-emerald-300 border border-emerald-800/50 flex items-center gap-1">
        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
        <span>Encrypted</span>
      </div>
    </div>
  )
}