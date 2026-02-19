// Famous Quranic Reciters with audio sources
// Audio from: https://everyayah.com & https://api.alquran.cloud

export interface Reciter {
  id: string;
  name: string;
  nameArabic: string;
  nationality: string;
  flag: string;
  style: string;
  styleArabic: string;
  bio: string;
  color: string;
  everyayahFolder: string;      // folder name on everyayah.com
  alquranEdition: string;       // edition key on alquran.cloud audio API
  bitrate: string;
  isPopular: boolean;
}

export const RECITERS: Reciter[] = [
  {
    id: 'mishary',
    name: 'Mishary Rashid Alafasy',
    nameArabic: 'مشاري راشد العفاسي',
    nationality: 'Kuwaiti',
    flag: '🇰🇼',
    style: 'Murattal',
    styleArabic: 'مرتل',
    bio: 'One of the most beloved contemporary reciters, known for his melodious and touching voice.',
    color: '#059669',
    everyayahFolder: 'Alafasy_128kbps',
    alquranEdition: 'ar.alafasy',
    bitrate: '128kbps',
    isPopular: true,
  },
  {
    id: 'husary',
    name: 'Mahmoud Khalil Al-Husary',
    nameArabic: 'محمود خليل الحصري',
    nationality: 'Egyptian',
    flag: '🇪🇬',
    style: 'Murattal / Mujawwad',
    styleArabic: 'مرتل / مجوّد',
    bio: 'Legendary Egyptian reciter, former head of Quranic readers at Al-Azhar. Crystal-clear tajweed.',
    color: '#d97706',
    everyayahFolder: 'Husary_128kbps',
    alquranEdition: 'ar.husary',
    bitrate: '128kbps',
    isPopular: true,
  },
  {
    id: 'abdulbasit',
    name: 'Abdul Basit Abdul Samad',
    nameArabic: 'عبد الباسط عبد الصمد',
    nationality: 'Egyptian',
    flag: '🇪🇬',
    style: 'Mujawwad / Murattal',
    styleArabic: 'مجوّد / مرتل',
    bio: 'Legendary Egyptian reciter with an iconic and unforgettable voice. Master of Mujawwad style.',
    color: '#7c3aed',
    everyayahFolder: 'Abdul_Basit_Murattal_192kbps',
    alquranEdition: 'ar.abdulbasitmurattal',
    bitrate: '192kbps',
    isPopular: true,
  },
  {
    id: 'sudais',
    name: 'Abdul Rahman Al-Sudais',
    nameArabic: 'عبد الرحمن السديس',
    nationality: 'Saudi',
    flag: '🇸🇦',
    style: 'Murattal',
    styleArabic: 'مرتل',
    bio: 'Imam of the Grand Mosque in Makkah. Known for his deep, powerful, and emotional recitation.',
    color: '#dc2626',
    everyayahFolder: 'Abdurrahmaan_As-Sudais_192kbps',
    alquranEdition: 'ar.abdurrahmaansudais',
    bitrate: '192kbps',
    isPopular: true,
  },
  {
    id: 'shuraim',
    name: "Sa'ud Al-Shuraim",
    nameArabic: 'سعود الشريم',
    nationality: 'Saudi',
    flag: '🇸🇦',
    style: 'Murattal',
    styleArabic: 'مرتل',
    bio: 'Imam of the Grand Mosque in Makkah, known for his clear and precise Murattal style.',
    color: '#0284c7',
    everyayahFolder: 'Saood_ash-Shuraym_128kbps',
    alquranEdition: 'ar.shaatree',
    bitrate: '128kbps',
    isPopular: true,
  },
  {
    id: 'minshawi',
    name: 'Mohamed Siddiq El-Minshawi',
    nameArabic: 'محمد صديق المنشاوي',
    nationality: 'Egyptian',
    flag: '🇪🇬',
    style: 'Murattal / Mujawwad',
    styleArabic: 'مرتل / مجوّد',
    bio: 'One of Egypt\'s greatest reciters. His Murattal is used as a reference for teaching tajweed.',
    color: '#b45309',
    everyayahFolder: 'Minshawi_128kbps',
    alquranEdition: 'ar.minshawi',
    bitrate: '128kbps',
    isPopular: true,
  },
  {
    id: 'ghamdi',
    name: 'Saad Al-Ghamdi',
    nameArabic: 'سعد الغامدي',
    nationality: 'Saudi',
    flag: '🇸🇦',
    style: 'Murattal',
    styleArabic: 'مرتل',
    bio: 'Saudi reciter celebrated for his calm, beautiful, and soothing recitation style.',
    color: '#0891b2',
    everyayahFolder: 'Saad_Al-Ghamdi_128kbps',
    alquranEdition: 'ar.saadalghamdi',
    bitrate: '128kbps',
    isPopular: true,
  },
  {
    id: 'ajamy',
    name: 'Ahmad Al-Ajamy',
    nameArabic: 'أحمد العجمي',
    nationality: 'Saudi',
    flag: '🇸🇦',
    style: 'Murattal',
    styleArabic: 'مرتل',
    bio: 'Saudi reciter known for his heartfelt and emotional recitation with beautiful voice.',
    color: '#be185d',
    everyayahFolder: 'Ahmed_ibn_Ali_al-Ajamy_128kbps_ketaballah.net',
    alquranEdition: 'ar.ahmedajamy',
    bitrate: '128kbps',
    isPopular: false,
  },
  {
    id: 'tablawi',
    name: 'Mohamed Al-Tablawi',
    nameArabic: 'محمد الطبلاوي',
    nationality: 'Egyptian',
    flag: '🇪🇬',
    style: 'Mujawwad',
    styleArabic: 'مجوّد',
    bio: 'Renowned Egyptian reciter famous for his rich mujawwad style and beautiful modulations.',
    color: '#065f46',
    everyayahFolder: 'Mohammad_al_Tablawi_128kbps',
    alquranEdition: 'ar.abdulbasitmujawwad',
    bitrate: '128kbps',
    isPopular: false,
  },
  {
    id: 'dussary',
    name: 'Yasser Al-Dossari',
    nameArabic: 'ياسر الدوسري',
    nationality: 'Saudi',
    flag: '🇸🇦',
    style: 'Murattal',
    styleArabic: 'مرتل',
    bio: 'One of the most popular young reciters globally with a deeply emotional and moving style.',
    color: '#4f46e5',
    everyayahFolder: 'Yasser_Ad-Dussary_128kbps',
    alquranEdition: 'ar.ahmedajamy',
    bitrate: '128kbps',
    isPopular: true,
  },
  {
    id: 'maher',
    name: 'Maher Al-Muaiqly',
    nameArabic: 'ماهر المعيقلي',
    nationality: 'Saudi',
    flag: '🇸🇦',
    style: 'Murattal',
    styleArabic: 'مرتل',
    bio: 'Imam of the Grand Mosque in Makkah. Known for precise tajweed and beautiful Murattal.',
    color: '#0f766e',
    everyayahFolder: 'MaherAlMuaiqly128kbps',
    alquranEdition: 'ar.mahermuaiqly',
    bitrate: '128kbps',
    isPopular: true,
  },
  {
    id: 'basfar',
    name: 'Abdullah Basfar',
    nameArabic: 'عبدالله بصفر',
    nationality: 'Saudi',
    flag: '🇸🇦',
    style: 'Murattal',
    styleArabic: 'مرتل',
    bio: 'Saudi reciter with a clear and precise recitation style, excellent for learning tajweed.',
    color: '#92400e',
    everyayahFolder: 'Abdullah_Basfar_192kbps',
    alquranEdition: 'ar.abdullahbasfar',
    bitrate: '192kbps',
    isPopular: false,
  },
];

// Helper: build the everyayah.com MP3 URL
// URL format: https://everyayah.com/data/{folder}/{surah_3digits}{ayah_3digits}.mp3
export function buildEveryayahUrl(reciter: Reciter, surahNumber: number, ayahNumber: number): string {
  const surah = String(surahNumber).padStart(3, '0');
  const ayah  = String(ayahNumber).padStart(3, '0');
  return `https://everyayah.com/data/${reciter.everyayahFolder}/${surah}${ayah}.mp3`;
}

// Helper: build the alquran.cloud audio API URL
export function buildAlquranAudioUrl(reciter: Reciter, surahNumber: number, ayahNumber: number): string {
  // Global ayah number = sum of all previous surah ayahs + ayah number
  return `https://api.alquran.cloud/v1/ayah/${surahNumber}:${ayahNumber}/${reciter.alquranEdition}`;
}
