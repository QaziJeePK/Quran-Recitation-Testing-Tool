import {
  RecitationResult,
  WordResult,
  FeedbackItem,
  statusColorClasses,
  statusIcon,
  gradeColorConfig,
} from '../utils/recitationChecker';
import { TajweedSummary } from '../utils/tajweedEngine';
import { MISTAKE_SEVERITY } from '../utils/mistakeAnalyzer';

interface ResultsPanelProps {
  result: RecitationResult | null;
}

export function ResultsPanel({ result }: ResultsPanelProps) {
  if (!result) return null;
  const cfg = gradeColorConfig(result.grade);

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-emerald-100 overflow-hidden">
      {/* Title bar */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-700 px-6 py-4">
        <h3 className="text-white font-bold text-xl flex items-center gap-2">
          <span>📊</span> Detailed Recitation Analysis
        </h3>
      </div>

      <div className="p-6 space-y-7">

        {/* ── Score + Grade + Category Scores ── */}
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Big score circle */}
          <div className={`relative w-36 h-36 rounded-full bg-gradient-to-br ${cfg.gradient} flex items-center justify-center shadow-xl ring-4 ${cfg.ring} flex-shrink-0`}>
            <div className="w-28 h-28 rounded-full bg-white flex flex-col items-center justify-center">
              <span className={`text-3xl font-black ${cfg.text}`}>{result.overallScore}%</span>
              <span className="text-2xl mt-0.5">{cfg.emoji}</span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex-1 space-y-2 w-full">
            <div className="mb-3">
              <p className={`text-2xl font-black ${cfg.text}`}>{result.grade}</p>
              <p className="text-gray-400 text-sm">
                <span style={{ fontFamily: "'Amiri', serif" }}>{result.gradeArabic}</span>
                {' '}— {result.totalOriginalWords} words total
              </p>
            </div>
            <StatBar label="✅ Correct"  count={result.correctCount} total={result.totalOriginalWords} color="bg-green-500" />
            <StatBar label="🔶 Partial"  count={result.partialCount} total={result.totalOriginalWords} color="bg-amber-400" />
            <StatBar label="❌ Wrong"    count={result.wrongCount}   total={result.totalOriginalWords} color="bg-red-500"   />
            <StatBar label="⬜ Missed"   count={result.missedCount}  total={result.totalOriginalWords} color="bg-gray-400"  />
          </div>
        </div>

        {/* ── Category Scores ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <ScoreCard label="Completeness" score={result.completenessScore} icon="📝" color="emerald" />
          <ScoreCard label="Letters"      score={result.letterScore}      icon="🔤" color="blue"    />
          <ScoreCard label="Elongation"   score={result.maddScore}        icon="〰️" color="purple"  />
          <ScoreCard label="Vowels"        score={result.harakaScore}      icon="🎵" color="amber"   />
        </div>

        {/* ── Feedback ── */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100">
          <h4 className="font-bold text-emerald-800 mb-3 flex items-center gap-2 text-base">
            <span>💬</span> Analysis Feedback
          </h4>
          <div className="space-y-2">
            {result.detailedFeedback.map((item, i) => (
              <FeedbackRow key={i} item={item} />
            ))}
          </div>
        </div>

        {/* ── Mistakes Detail ── */}
        {result.wordResults.filter(w => w.status !== 'correct' && w.status !== 'extra').length > 0 && (
          <div>
            <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-base">
              <span>🔬</span> Mistake Breakdown
              <span className="text-sm font-normal text-gray-400">
                ({result.wordResults.filter(w => w.status !== 'correct' && w.status !== 'extra').length} words with issues)
              </span>
            </h4>
            <div className="space-y-3">
              {result.wordResults
                .filter(w => w.status !== 'correct' && w.status !== 'extra')
                .map((wr, i) => <MistakeCard key={i} wr={wr} />)}
            </div>
          </div>
        )}

        {/* ── Extra words ── */}
        {result.extraWords.length > 0 && (
          <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
            <h4 className="text-sm font-bold text-orange-700 mb-2 flex items-center gap-1">
              <span>➕</span> Extra words you added (not in this ayah)
            </h4>
            <div className="flex flex-wrap gap-2" dir="rtl">
              {result.extraWords.map((w, i) => (
                <span key={i} className="px-3 py-1 bg-orange-100 text-orange-800 rounded-lg text-xl border border-orange-200"
                  style={{ fontFamily: "'Amiri', serif" }}>{w}</span>
              ))}
            </div>
            <p className="text-xs text-orange-600 mt-2">Stay focused on the text and avoid adding words from memory.</p>
          </div>
        )}

        {/* ── Tajweed Summary ── */}
        {result.tajweedSummary.length > 0 && (
          <div>
            <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-base">
              <span>📚</span> Tajweed Rules in This Ayah
              <span className="text-sm font-normal text-gray-400">({result.tajweedSummary.length} rules detected)</span>
            </h4>
            <div className="grid sm:grid-cols-2 gap-3">
              {result.tajweedSummary.map((item, i) => (
                <TajweedCard key={i} item={item} />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm w-24 text-gray-600 flex-shrink-0">{label}</span>
      <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-bold text-gray-700 w-6 text-right">{count}</span>
    </div>
  );
}

function ScoreCard({ label, score, icon, color }: { label: string; score: number; icon: string; color: string }) {
  const colorMap: Record<string, { ring: string; text: string; bg: string }> = {
    emerald: { ring: 'ring-emerald-200', text: 'text-emerald-700', bg: 'bg-emerald-50' },
    blue:    { ring: 'ring-blue-200',    text: 'text-blue-700',    bg: 'bg-blue-50'    },
    purple:  { ring: 'ring-purple-200',  text: 'text-purple-700',  bg: 'bg-purple-50'  },
    amber:   { ring: 'ring-amber-200',   text: 'text-amber-700',   bg: 'bg-amber-50'   },
  };
  const c = colorMap[color] || colorMap.emerald;
  return (
    <div className={`${c.bg} rounded-xl p-3 text-center ring-2 ${c.ring}`}>
      <div className="text-xl mb-1">{icon}</div>
      <div className={`text-2xl font-black ${c.text}`}>{score}%</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

function FeedbackRow({ item }: { item: FeedbackItem }) {
  const bgMap = {
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    error:   'bg-red-50 border-red-200 text-red-800',
    info:    'bg-blue-50 border-blue-200 text-blue-800',
  };
  return (
    <div className={`flex items-start gap-2 p-2.5 rounded-lg border text-sm ${bgMap[item.severity]}`}>
      <span className="flex-shrink-0 text-base">{item.icon}</span>
      <span>{item.text}</span>
    </div>
  );
}

function MistakeCard({ wr }: { wr: WordResult }) {
  const borderMap: Record<string, string> = {
    partial: 'border-amber-300 bg-amber-50',
    wrong:   'border-red-300 bg-red-50',
    missed:  'border-gray-300 bg-gray-50',
  };

  const totalMistakes = wr.mistakes.length;
  const criticalCount = wr.mistakes.filter(m => m.severity.level === 'critical').length;
  const majorCount    = wr.mistakes.filter(m => m.severity.level === 'major').length;

  return (
    <div className={`rounded-xl border-2 p-4 ${borderMap[wr.status] || 'border-gray-200 bg-gray-50'}`}>
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap mb-3">
        <span className="text-base">{statusIcon(wr.status)}</span>
        <span className="text-2xl font-bold" style={{ fontFamily: "'Amiri', serif", direction: 'rtl' }}>
          {wr.original || '—'}
        </span>
        {wr.spoken && wr.status !== 'missed' && (
          <span className="text-sm text-gray-500 flex items-center gap-1.5">
            <span className="text-xs bg-gray-200 px-1.5 py-0.5 rounded text-gray-600">You said</span>
            <span className="text-lg" style={{ fontFamily: "'Amiri', serif", direction: 'rtl' }}>{wr.spoken}</span>
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {wr.original && (
            <span className={`text-sm font-bold px-2.5 py-1 rounded-lg border ${statusColorClasses(wr.status)}`}>
              {wr.similarity}% match
            </span>
          )}
        </div>
      </div>

      {/* Score bars */}
      {wr.original && (
        <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
          <MiniScore label="Letters" value={wr.letter_match} />
          <MiniScore label="Elongation" value={wr.madd_match} />
          <MiniScore label="Vowels" value={wr.haraka_match} />
        </div>
      )}

      {/* Mistake items */}
      {totalMistakes > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-600 flex items-center gap-1">
            🔎 Mistakes detected ({totalMistakes}):
            {criticalCount > 0 && <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs">🔴 {criticalCount} Critical</span>}
            {majorCount > 0 && <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">🟠 {majorCount} Major</span>}
          </p>
          {wr.mistakes.map((mistake, mi) => (
            <div key={mi} className="flex items-start gap-2 text-sm bg-white rounded-lg p-2.5 border border-gray-100 shadow-sm">
              <SeverityBadge level={mistake.severity.level} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800">{mistake.description}</p>
                <p className="text-xs text-blue-600 mt-0.5 flex items-start gap-1">
                  <span className="flex-shrink-0">💡</span>
                  <span>{mistake.tip}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tajweed rules on this word */}
      {wr.tajweed.annotations.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs font-bold text-gray-500 mb-1.5">Tajweed rules on this word:</p>
          <div className="flex flex-wrap gap-1.5">
            {wr.tajweed.annotations.map((ann, ai) => (
              <span
                key={ai}
                className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                style={{ backgroundColor: ann.info.color }}
                title={ann.info.description}
              >
                {ann.rule}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MiniScore({ label, value }: { label: string; value: number }) {
  const color = value >= 90 ? 'bg-green-400' : value >= 65 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div className="bg-white rounded-lg p-1.5 border border-gray-100 text-center">
      <div className={`text-white text-xs font-bold px-1.5 py-0.5 rounded ${color} mb-0.5`}>{value}%</div>
      <div className="text-gray-500 text-xs">{label}</div>
    </div>
  );
}

function SeverityBadge({ level }: { level: string }) {
  const map: Record<string, { color: string; label: string }> = {
    critical: { color: 'bg-red-500 text-white',    label: '🔴' },
    major:    { color: 'bg-orange-400 text-white',  label: '🟠' },
    minor:    { color: 'bg-yellow-400 text-white',  label: '🟡' },
    cosmetic: { color: 'bg-gray-300 text-gray-700', label: '⚪' },
  };
  const cfg = map[level] || map.cosmetic;
  return (
    <span className={`flex-shrink-0 w-6 h-6 rounded-full ${cfg.color} flex items-center justify-center text-xs font-bold mt-0.5`}
      title={`${level} mistake`}>
      {cfg.label}
    </span>
  );
}

function TajweedCard({ item }: { item: TajweedSummary }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="w-3 h-3 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: item.info.color }} />
      <div className="min-w-0 flex-1">
        <p className="font-bold text-gray-800 text-sm flex items-center gap-2 flex-wrap">
          {item.rule}
          <span className="font-normal text-gray-500 text-base" style={{ fontFamily: "'Amiri', serif" }}>
            ({item.info.nameArabic})
          </span>
        </p>
        <p className="text-xs text-gray-600 mt-0.5">{item.info.description}</p>
        <p className="text-xs text-blue-600 mt-1 flex items-start gap-1">
          <span className="flex-shrink-0">💡</span>
          <span>{item.info.howTo}</span>
        </p>
        <p className="text-xs text-red-500 mt-1 flex items-start gap-1">
          <span className="flex-shrink-0">⚠️</span>
          <span>{item.info.commonMistake}</span>
        </p>
        {item.info.counts && (
          <p className="text-xs text-purple-600 mt-1 font-semibold">
            ⏱ Duration: {item.info.counts} counts
          </p>
        )}
        {/* Words affected */}
        <div className="flex flex-wrap gap-1 mt-2" dir="rtl">
          {item.words.slice(0, 6).map((w, j) => (
            <span key={j} className="px-2 py-0.5 text-sm rounded-md text-white font-medium"
              style={{ backgroundColor: item.info.color, fontFamily: "'Amiri', serif" }}>{w}</span>
          ))}
          {item.words.length > 6 && (
            <span className="px-2 py-0.5 text-xs rounded-md bg-gray-200 text-gray-600">
              +{item.words.length - 6}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Export MISTAKE_SEVERITY for reference if needed
export { MISTAKE_SEVERITY };
