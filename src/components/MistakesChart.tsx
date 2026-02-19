// ═══════════════════════════════════════════════════════
//  MistakesChart — session history & mistake analytics
// ═══════════════════════════════════════════════════════
import { useState } from 'react';
import {
  SessionAttempt,
  getHistory,
  getScoreTrend,
  getMistakeFrequencies,
  getAyahStats,
  clearHistory,
  ScoreTrendPoint,
  MistakeFrequency,
  AyahStats,
} from '../utils/sessionHistory';

interface Props {
  refreshKey: number; // increment to re-render after new attempt
}

type ChartTab = 'trend' | 'mistakes' | 'ayahs' | 'history';

export function MistakesChart({ refreshKey }: Props) {
  const [tab, setTab] = useState<ChartTab>('trend');
  const [cleared, setCleared] = useState(false);

  const history    = getHistory();
  const trend      = getScoreTrend(15);
  const mistakes   = getMistakeFrequencies();
  const ayahStats  = getAyahStats();

  void refreshKey; void cleared; // ensure re-render

  if (history.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow border border-gray-100 p-8 text-center">
        <div className="text-5xl mb-3">📊</div>
        <p className="font-bold text-gray-700 text-lg">No Recitation History Yet</p>
        <p className="text-gray-400 text-sm mt-1">
          Record and check your recitation above — your mistakes &amp; progress will appear here.
        </p>
      </div>
    );
  }

  const bestScore  = Math.max(...history.map(h => h.overallScore));
  const avgScore   = Math.round(history.reduce((s, h) => s + h.overallScore, 0) / history.length);
  const totalWords = history.reduce((s, h) => s + h.totalWords, 0);
  const totalCorrect = history.reduce((s, h) => s + h.correctCount, 0);
  const accuracy   = totalWords > 0 ? Math.round((totalCorrect / totalWords) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-emerald-100 overflow-hidden">

      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">📊</span>
          <div>
            <h3 className="text-white font-bold text-base">Recitation History & Analytics</h3>
            <p className="text-slate-400 text-xs">{history.length} session{history.length !== 1 ? 's' : ''} recorded</p>
          </div>
        </div>
        <button
          onClick={() => { clearHistory(); setCleared(c => !c); }}
          className="text-xs text-slate-400 hover:text-red-400 transition px-2 py-1 rounded hover:bg-white/10"
        >
          🗑 Clear
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 divide-x divide-gray-100 border-b border-gray-100">
        <StatTile label="Sessions" value={String(history.length)} icon="🎤" color="text-emerald-600" />
        <StatTile label="Best Score" value={`${bestScore}%`} icon="🏆" color="text-amber-600" />
        <StatTile label="Avg Score" value={`${avgScore}%`} icon="📈" color="text-blue-600" />
        <StatTile label="Accuracy" value={`${accuracy}%`} icon="✅" color="text-green-600" />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 bg-gray-50">
        {([
          { id: 'trend',    label: '📈 Progress',   },
          { id: 'mistakes', label: '🔴 Mistakes',    },
          { id: 'ayahs',    label: '📖 By Ayah',    },
          { id: 'history',  label: '🕐 History',    },
        ] as { id: ChartTab; label: string }[]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 text-xs font-bold transition-all ${
              tab === t.id
                ? 'bg-white text-emerald-700 border-b-2 border-emerald-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4">

        {/* ── TREND TAB ── */}
        {tab === 'trend' && (
          <div>
            <p className="text-xs text-gray-400 mb-3 text-center">Score trend across your last {trend.length} sessions</p>
            {trend.length < 2 ? (
              <p className="text-center text-gray-400 text-sm py-4">Need at least 2 sessions to show trend.</p>
            ) : (
              <ScoreLineChart points={trend} />
            )}

            {/* Per-category scores */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              {[
                { label: 'Completeness', key: 'completenessScore', color: '#10b981', icon: '📝' },
                { label: 'Letters',      key: 'letterScore',       color: '#3b82f6', icon: '🔤' },
                { label: 'Elongation',   key: 'maddScore',         color: '#8b5cf6', icon: '〰️' },
                { label: 'Vowels',       key: 'harakaScore',       color: '#f59e0b', icon: '🎵' },
              ].map(({ label, key, color, icon }) => {
                const vals = history.map(h => (h as any)[key] as number);
                const avg  = Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
                const best = Math.max(...vals);
                return (
                  <div key={key} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-sm">{icon}</span>
                      <span className="text-xs font-bold text-gray-700">{label}</span>
                    </div>
                    <div className="flex items-end gap-3">
                      <div>
                        <p className="text-xs text-gray-400">Avg</p>
                        <p className="text-lg font-black" style={{ color }}>{avg}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Best</p>
                        <p className="text-base font-bold text-gray-600">{best}%</p>
                      </div>
                    </div>
                    <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${avg}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── MISTAKES TAB ── */}
        {tab === 'mistakes' && (
          <div>
            <p className="text-xs text-gray-400 mb-3 text-center">All mistake types across {history.length} sessions</p>
            {mistakes.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-4">No detailed mistakes recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {mistakes.map((m, i) => (
                  <MistakeBar key={i} item={m} max={mistakes[0].count} rank={i + 1} />
                ))}
              </div>
            )}

            {/* Score breakdown pie-like */}
            <div className="mt-4 bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-xs font-bold text-gray-700 mb-3">Word Status Distribution</p>
              <WordStatusChart history={history} />
            </div>
          </div>
        )}

        {/* ── AYAHS TAB ── */}
        {tab === 'ayahs' && (
          <div>
            <p className="text-xs text-gray-400 mb-3 text-center">Performance per Surah:Ayah</p>
            {ayahStats.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-4">No data yet.</p>
            ) : (
              <div className="space-y-2">
                {ayahStats.map((a, i) => (
                  <AyahStatRow key={i} stat={a} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {tab === 'history' && (
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {history.map((attempt, i) => (
              <HistoryRow key={attempt.id} attempt={attempt} index={i} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Score Line Chart (pure SVG) ──────────────────────────────────────────────

function ScoreLineChart({ points }: { points: ScoreTrendPoint[] }) {
  const W = 600, H = 180, PAD = { t: 16, r: 20, b: 40, l: 36 };
  const iW = W - PAD.l - PAD.r;
  const iH = H - PAD.t - PAD.b;
  const n  = points.length;

  const xOf = (i: number) => PAD.l + (i / (n - 1)) * iW;
  const yOf = (s: number) => PAD.t + iH - (Math.max(0, Math.min(100, s)) / 100) * iH;

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xOf(i).toFixed(1)},${yOf(p.score).toFixed(1)}`).join(' ');
  const areaD = pathD + ` L ${xOf(n - 1).toFixed(1)},${(PAD.t + iH).toFixed(1)} L ${xOf(0).toFixed(1)},${(PAD.t + iH).toFixed(1)} Z`;

  const gradeColor = (score: number) =>
    score >= 85 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 280 }}>
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map(v => (
          <g key={v}>
            <line
              x1={PAD.l} y1={yOf(v)} x2={PAD.l + iW} y2={yOf(v)}
              stroke={v === 0 ? '#d1d5db' : '#f3f4f6'} strokeWidth={v === 0 ? 1 : 1}
            />
            <text x={PAD.l - 4} y={yOf(v) + 4} textAnchor="end" fontSize={9} fill="#9ca3af">{v}</text>
          </g>
        ))}

        {/* Grade zones */}
        <rect x={PAD.l} y={yOf(100)} width={iW} height={yOf(85) - yOf(100)} fill="#d1fae5" opacity={0.3} />
        <rect x={PAD.l} y={yOf(85)} width={iW} height={yOf(60) - yOf(85)} fill="#fef9c3" opacity={0.3} />
        <rect x={PAD.l} y={yOf(60)} width={iW} height={yOf(0) - yOf(60)} fill="#fee2e2" opacity={0.3} />

        {/* Area fill */}
        <path d={areaD} fill="url(#chartGrad)" opacity={0.3} />

        {/* Line */}
        <path d={pathD} fill="none" stroke="#10b981" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

        {/* Data points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={xOf(i)} cy={yOf(p.score)} r={5} fill={gradeColor(p.score)} stroke="white" strokeWidth={2} />
            <text x={xOf(i)} y={yOf(p.score) - 9} textAnchor="middle" fontSize={9} fill={gradeColor(p.score)} fontWeight="bold">
              {p.score}%
            </text>
            <text x={xOf(i)} y={H - PAD.b + 14} textAnchor="middle" fontSize={8} fill="#9ca3af">{p.label}</text>
          </g>
        ))}

        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

// ─── Word Status Donut / Bars ─────────────────────────────────────────────────

function WordStatusChart({ history }: { history: SessionAttempt[] }) {
  const totals = {
    correct: history.reduce((s, h) => s + h.correctCount, 0),
    partial: history.reduce((s, h) => s + h.partialCount, 0),
    wrong:   history.reduce((s, h) => s + h.wrongCount,   0),
    missed:  history.reduce((s, h) => s + h.missedCount,  0),
    extra:   history.reduce((s, h) => s + h.extraCount,   0),
  };
  const total = Object.values(totals).reduce((a, b) => a + b, 0);
  if (total === 0) return <p className="text-xs text-gray-400 text-center">No word data yet.</p>;

  const bars = [
    { label: '✅ Correct',  count: totals.correct, color: '#10b981' },
    { label: '🔶 Partial',  count: totals.partial, color: '#f59e0b' },
    { label: '❌ Wrong',    count: totals.wrong,   color: '#ef4444' },
    { label: '⬜ Missed',   count: totals.missed,  color: '#6b7280' },
    { label: '➕ Extra',    count: totals.extra,   color: '#f97316' },
  ];

  return (
    <div className="space-y-2">
      {bars.map((b, i) => {
        const pct = Math.round((b.count / total) * 100);
        return (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs w-20 text-gray-600 flex-shrink-0">{b.label}</span>
            <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, backgroundColor: b.color }}
              />
            </div>
            <span className="text-xs font-bold text-gray-700 w-14 text-right flex-shrink-0">
              {b.count} ({pct}%)
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Mistake Bar Row ──────────────────────────────────────────────────────────

function MistakeBar({ item, max, rank }: { item: MistakeFrequency; max: number; rank: number }) {
  const pct = max > 0 ? Math.round((item.count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400 w-4 flex-shrink-0">#{rank}</span>
      <span className="text-xs w-32 text-gray-700 flex-shrink-0 truncate">{item.label}</span>
      <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full flex items-center justify-end pr-1.5 transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: item.color }}
        >
          {pct > 20 && <span className="text-white text-xs font-bold">{item.count}</span>}
        </div>
      </div>
      {pct <= 20 && <span className="text-xs font-bold text-gray-600 w-6">{item.count}</span>}
    </div>
  );
}

// ─── Ayah Stat Row ────────────────────────────────────────────────────────────

function AyahStatRow({ stat }: { stat: AyahStats }) {
  const trendIcon = stat.trend === 'up' ? '📈' : stat.trend === 'down' ? '📉' : '➡️';
  const scoreColor = stat.bestScore >= 85 ? 'text-green-600' : stat.bestScore >= 60 ? 'text-amber-600' : 'text-red-600';
  return (
    <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
      <span className="font-bold text-emerald-700 text-sm w-16 flex-shrink-0">{stat.label}</span>
      <div className="flex-1">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${stat.avgScore}%` }} />
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs text-right flex-shrink-0">
        <div>
          <p className="text-gray-400">Avg</p>
          <p className="font-bold text-gray-700">{stat.avgScore}%</p>
        </div>
        <div>
          <p className="text-gray-400">Best</p>
          <p className={`font-bold ${scoreColor}`}>{stat.bestScore}%</p>
        </div>
        <div>
          <p className="text-gray-400">Tries</p>
          <p className="font-bold text-gray-700">{stat.attempts}</p>
        </div>
        <span className="text-base" title={`Trend: ${stat.trend}`}>{trendIcon}</span>
      </div>
    </div>
  );
}

// ─── History Row ──────────────────────────────────────────────────────────────

function HistoryRow({ attempt, index }: { attempt: SessionAttempt; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const scoreColor =
    attempt.overallScore >= 85 ? 'bg-green-100 text-green-700 border-green-200'
    : attempt.overallScore >= 60 ? 'bg-amber-100 text-amber-700 border-amber-200'
    : 'bg-red-100 text-red-700 border-red-200';

  const time = new Date(attempt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const date = new Date(attempt.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });

  return (
    <div className="rounded-xl border border-gray-100 overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition text-left"
      >
        <span className="text-xs text-gray-400 w-5 flex-shrink-0">#{index + 1}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-800 truncate">
            S{attempt.surahNumber}:{attempt.ayahNumber} — {attempt.surahName}
          </p>
          <p className="text-xs text-gray-400">{date} {time} • {attempt.duration}s</p>
        </div>
        <span className={`text-xs font-black px-2.5 py-1 rounded-lg border flex-shrink-0 ${scoreColor}`}>
          {attempt.overallScore}%
        </span>
        <span className="text-gray-400 text-xs">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="px-4 py-3 bg-white border-t border-gray-100 space-y-3">
          {/* What you said */}
          <div>
            <p className="text-xs font-bold text-gray-500 mb-1">What you said:</p>
            <p className="text-lg text-gray-800 bg-gray-50 rounded-lg px-3 py-2" dir="rtl"
              style={{ fontFamily: "'Amiri Quran','Amiri',serif" }}>
              {attempt.spokenText || '(nothing recorded)'}
            </p>
          </div>
          {/* Word breakdown */}
          <div className="grid grid-cols-5 gap-1.5 text-center text-xs">
            {[
              { label: '✅ Correct',  val: attempt.correctCount, color: 'bg-green-50 text-green-700' },
              { label: '🔶 Partial',  val: attempt.partialCount, color: 'bg-amber-50 text-amber-700' },
              { label: '❌ Wrong',    val: attempt.wrongCount,   color: 'bg-red-50 text-red-700'    },
              { label: '⬜ Missed',   val: attempt.missedCount,  color: 'bg-gray-50 text-gray-600'  },
              { label: '➕ Extra',    val: attempt.extraCount,   color: 'bg-orange-50 text-orange-700' },
            ].map((s, i) => (
              <div key={i} className={`rounded-lg p-1.5 ${s.color}`}>
                <p className="font-black text-base">{s.val}</p>
                <p className="text-xs leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
          {/* Category scores */}
          <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
            {[
              { label: '📝 Complete', val: attempt.completenessScore },
              { label: '🔤 Letters',  val: attempt.letterScore },
              { label: '〰️ Madd',     val: attempt.maddScore },
              { label: '🎵 Vowels',   val: attempt.harakaScore },
            ].map((s, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-1.5 border border-gray-100">
                <p className="font-bold text-gray-700">{s.val}%</p>
                <p className="text-gray-400">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Stat Tile ────────────────────────────────────────────────────────────────

function StatTile({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <div className="py-3 text-center">
      <p className="text-base">{icon}</p>
      <p className={`text-lg font-black ${color}`}>{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}
