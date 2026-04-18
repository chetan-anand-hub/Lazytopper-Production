import { Database, TrendingUp, ExternalLink, BarChart3, BookOpen } from "lucide-react";

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6 md:p-10" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
          <p className="text-white/40 text-sm mt-1">LazyTopper internal tools</p>
        </div>

        <a
          href="/app/admin/difficulty-breakdown"
          className="block rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 p-6 transition-colors group mb-3"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-white/10 p-2.5">
                <BarChart3 size={18} className="text-purple-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Question Difficulty Breakdown</h2>
                <p className="text-xs text-white/40 mt-0.5">
                  Easy / Medium / Hard + Section A–E counts per chapter
                </p>
              </div>
            </div>
            <ExternalLink size={14} className="text-white/30 group-hover:text-white/60 mt-1 transition-colors" />
          </div>
          <div className="flex gap-4 mt-4">
            <div className="flex items-center gap-1.5 text-xs text-white/30">
              <BookOpen size={11} />
              Maths &amp; Science
            </div>
            <div className="flex items-center gap-1.5 text-xs text-white/30">
              <BarChart3 size={11} />
              Threshold alerts
            </div>
          </div>
        </a>

        <a
          href="/app/admin/cache-stats"
          className="block rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 p-6 transition-colors group"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-white/10 p-2.5">
                <Database size={18} className="text-blue-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Tutor Cache Analytics</h2>
                <p className="text-xs text-white/40 mt-0.5">
                  Hit rate, session counters, top-10 cached questions
                </p>
              </div>
            </div>
            <ExternalLink size={14} className="text-white/30 group-hover:text-white/60 mt-1 transition-colors" />
          </div>
          <div className="flex gap-4 mt-4">
            <div className="flex items-center gap-1.5 text-xs text-white/30">
              <TrendingUp size={11} />
              Hit rate
            </div>
            <div className="flex items-center gap-1.5 text-xs text-white/30">
              <Database size={11} />
              DB entries
            </div>
          </div>
          <p className="text-xs text-white/25 mt-3">
            Requires login — opens in the student app
          </p>
        </a>
      </div>
    </div>
  );
}
