import { surahMeta, SurahMeta } from '../data/quranMeta';

interface SurahSelectorProps {
  selectedSurah: SurahMeta | null;
  selectedAyahNumber: number | null;
  ayahCount: number;
  onSurahChange: (surah: SurahMeta) => void;
  onAyahChange: (ayahNumber: number) => void;
  isLoading: boolean;
}

export function SurahSelector({
  selectedSurah,
  selectedAyahNumber,
  ayahCount,
  onSurahChange,
  onAyahChange,
  isLoading,
}: SurahSelectorProps) {
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-emerald-100">
      <h2 className="text-xl font-bold text-emerald-800 mb-4 flex items-center gap-2">
        <span className="text-2xl">📖</span> Select Surah &amp; Ayah
      </h2>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Surah dropdown */}
        <div>
          <label className="block text-sm font-semibold text-emerald-700 mb-2">
            Surah (سورة)
          </label>
          <select
            value={selectedSurah?.number ?? ''}
            onChange={(e) => {
              const num = parseInt(e.target.value);
              const surah = surahMeta.find((s) => s.number === num);
              if (surah) onSurahChange(surah);
            }}
            className="w-full px-4 py-3 rounded-xl border-2 border-emerald-200 focus:border-emerald-500 focus:outline-none bg-white text-gray-800 font-medium transition-colors"
          >
            <option value="">-- Choose a Surah --</option>
            {surahMeta.map((s) => (
              <option key={s.number} value={s.number}>
                {s.number}. {s.name} – {s.nameArabic} ({s.ayahCount} ayahs)
              </option>
            ))}
          </select>

          {selectedSurah && (
            <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
              <span className={`px-2 py-0.5 rounded-full text-white text-xs font-semibold ${selectedSurah.revelationType === 'Meccan' ? 'bg-amber-500' : 'bg-blue-500'}`}>
                {selectedSurah.revelationType}
              </span>
              <span>{selectedSurah.nameTranslation}</span>
              <span>• {selectedSurah.ayahCount} ayahs</span>
            </div>
          )}
        </div>

        {/* Ayah dropdown */}
        <div>
          <label className="block text-sm font-semibold text-emerald-700 mb-2">
            Ayah (آية)
          </label>
          <select
            value={selectedAyahNumber ?? ''}
            onChange={(e) => onAyahChange(parseInt(e.target.value))}
            disabled={!selectedSurah || isLoading}
            className="w-full px-4 py-3 rounded-xl border-2 border-emerald-200 focus:border-emerald-500 focus:outline-none bg-white text-gray-800 font-medium transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">-- Choose an Ayah --</option>
            {Array.from({ length: ayahCount }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                Ayah {n}
              </option>
            ))}
          </select>

          {isLoading && (
            <p className="mt-2 text-xs text-emerald-600 flex items-center gap-1">
              <span className="animate-spin">⏳</span> Loading ayahs from Quran...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
