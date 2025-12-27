/**
 * Text Normalize Fonksiyonu
 * Küfür filtreleme için metni normalize eder:
 * - Türkçe karakterleri İngilizce karşılıklarına çevirir
 * - Harf dışı karakterleri (boşluk, @, sayı vb.) siler
 * - Küçük harfe çevirir
 * 
 * Örnek: "s@l@k" → "salak", "s a l a k" → "salak"
 */

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    // Türkçe karakter normalize
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/Ç/g, "c")
    .replace(/Ğ/g, "g")
    .replace(/İ/g, "i")
    .replace(/Ö/g, "o")
    .replace(/Ş/g, "s")
    .replace(/Ü/g, "u")
    // Harf dışı her şeyi sil (boşluk, @, sayı, özel karakter vb.)
    .replace(/[^a-z0-9]/g, "");
}






