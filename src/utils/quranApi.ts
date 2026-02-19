// Quran API utilities - fetches from alquran.cloud API

export interface ApiAyah {
  number: number;
  text: string;
  numberInSurah: number;
  juz: number;
  page: number;
  sajda: boolean | { id: number; recommended: boolean; obligatory: boolean };
}

export interface ApiSurah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
  ayahs: ApiAyah[];
}

export interface FetchedAyah {
  number: number;
  text: string;
  textSimple: string;
}

// Cache to avoid redundant API calls
const surahCache = new Map<number, FetchedAyah[]>();

// Normalize Arabic text (strip diacritics) for comparison
export function stripDiacritics(text: string): string {
  return text
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/\u200F/g, '')
    .replace(/[ٱ]/g, 'ا')
    .trim();
}

// Fetch ayahs for a given surah number using alquran.cloud (with-tashkeel + simple)
export async function fetchSurah(surahNumber: number): Promise<FetchedAyah[]> {
  if (surahCache.has(surahNumber)) {
    return surahCache.get(surahNumber)!;
  }

  // We'll use the uthmani script edition which has proper tashkeel
  const response = await fetch(
    `https://api.alquran.cloud/v1/surah/${surahNumber}/quran-uthmani`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch surah ${surahNumber}: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.code !== 200 || !data.data) {
    throw new Error(`API error for surah ${surahNumber}`);
  }

  const surahData: ApiSurah = data.data;

  const ayahs: FetchedAyah[] = surahData.ayahs.map((ayah) => ({
    number: ayah.numberInSurah,
    text: ayah.text,
    textSimple: stripDiacritics(ayah.text),
  }));

  surahCache.set(surahNumber, ayahs);
  return ayahs;
}

// Fetch a single ayah
export async function fetchAyah(
  surahNumber: number,
  ayahNumber: number
): Promise<FetchedAyah | null> {
  const ayahs = await fetchSurah(surahNumber);
  return ayahs.find((a) => a.number === ayahNumber) || null;
}
