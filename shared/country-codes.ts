/**
 * Türkçe ülke adı → ISO 3166-1 alpha-2 kodu.
 * Admin panelinden seçilen ülke adı ShipEntegra API'sine gönderilmeden önce
 * bu harita üzerinden 2 harfli koda dönüştürülür.
 */
export const COUNTRY_CODES: Record<string, string> = {
  // Avrupa
  'Almanya': 'DE',
  'Arnavutluk': 'AL',
  'Avusturya': 'AT',
  'Belçika': 'BE',
  'Bosna Hersek': 'BA',
  'Bulgaristan': 'BG',
  'Çekya': 'CZ',
  'Danimarka': 'DK',
  'Estonya': 'EE',
  'Finlandiya': 'FI',
  'Fransa': 'FR',
  'Hollanda': 'NL',
  'Hırvatistan': 'HR',
  'İrlanda': 'IE',
  'İspanya': 'ES',
  'İsveç': 'SE',
  'İsviçre': 'CH',
  'İtalya': 'IT',
  'İzlanda': 'IS',
  'İngiltere': 'GB',
  'Karadağ': 'ME',
  'Kosova': 'XK',
  'Kuzey Makedonya': 'MK',
  'Kıbrıs': 'CY',
  'Latviya': 'LV',
  'Litvanya': 'LT',
  'Lüksemburg': 'LU',
  'Macaristan': 'HU',
  'Malta': 'MT',
  'Norveç': 'NO',
  'Polonya': 'PL',
  'Portekiz': 'PT',
  'Romanya': 'RO',
  'Rusya': 'RU',
  'Slovakya': 'SK',
  'Slovenya': 'SI',
  'Sırbistan': 'RS',
  'Türkiye': 'TR',
  'Ukrayna': 'UA',
  'Yunanistan': 'GR',
  // Orta Doğu
  'Bahreyn': 'BH',
  'Birleşik Arap Emirlikleri': 'AE',
  'BAE': 'AE',
  'Irak': 'IQ',
  'İran': 'IR',
  'İsrail': 'IL',
  'Katar': 'QA',
  'Kuveyt': 'KW',
  'Lübnan': 'LB',
  'Mısır': 'EG',
  'Suudi Arabistan': 'SA',
  'Suriye': 'SY',
  'Umman': 'OM',
  'Ürdün': 'JO',
  'Yemen': 'YE',
  // Orta Asya / Kafkasya
  'Afganistan': 'AF',
  'Azerbaycan': 'AZ',
  'Ermenistan': 'AM',
  'Gürcistan': 'GE',
  'Kazakistan': 'KZ',
  'Özbekistan': 'UZ',
  'Türkmenistan': 'TM',
  // Asya-Pasifik
  'Bangladeş': 'BD',
  'Çin': 'CN',
  'Endonezya': 'ID',
  'Filipinler': 'PH',
  'Hindistan': 'IN',
  'Hong Kong': 'HK',
  'Japonya': 'JP',
  'Kore': 'KR',
  'Malezya': 'MY',
  'Pakistan': 'PK',
  'Singapur': 'SG',
  'Sri Lanka': 'LK',
  'Tayland': 'TH',
  'Tayvan': 'TW',
  'Vietnam': 'VN',
  'Yeni Zelanda': 'NZ',
  'Avustralya': 'AU',
  // Amerika
  'ABD': 'US',
  'Amerika Birleşik Devletleri': 'US',
  'Arjantin': 'AR',
  'Brezilya': 'BR',
  'Kanada': 'CA',
  'Kolombiya': 'CO',
  'Meksika': 'MX',
  'Şili': 'CL',
  // Afrika
  'Cezayir': 'DZ',
  'Etiyopya': 'ET',
  'Fas': 'MA',
  'Güney Afrika': 'ZA',
  'Kenya': 'KE',
  'Libya': 'LY',
  'Nijerya': 'NG',
  'Somali': 'SO',
  'Sudan': 'SD',
  'Tunus': 'TN',
};

/**
 * Türkçe ülke adını ISO 3166-1 alpha-2 koduna çevirir.
 * Bilinmiyorsa girilen stringin ilk 2 karakterini büyük harfle döndürür
 * (son çare — ShipEntegra bunu reddedebilir).
 */
export function toCountryCode(name: string): string {
  if (!name) return 'TR';
  const normalized = name.trim();
  // Haritada direkt eşleşme
  if (COUNTRY_CODES[normalized]) return COUNTRY_CODES[normalized];
  // Büyük/küçük harf farkı olmadan dene
  const lower = normalized.toLowerCase();
  const found = Object.entries(COUNTRY_CODES).find(([k]) => k.toLowerCase() === lower);
  if (found) return found[1];
  // ISO kodu olarak geliyorsa olduğu gibi kullan
  if (/^[A-Z]{2}$/.test(normalized.toUpperCase())) return normalized.toUpperCase();
  // Son çare
  return normalized.toUpperCase().slice(0, 2);
}
