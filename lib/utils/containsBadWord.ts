/**
 * Küfür Kontrol Fonksiyonu
 * Metinde yasaklı kelime olup olmadığını kontrol eder.
 * Normalize edilmiş metin ile karşılaştırma yapar.
 */

import { BANNED_WORDS } from "@/lib/constants/bannedWords";
import { normalizeText } from "./textNormalize";

export function containsBadWord(text: string): boolean {
  if (!text || text.trim().length === 0) {
    return false;
  }

  const normalized = normalizeText(text);

  return BANNED_WORDS.some((word) =>
    normalized.includes(normalizeText(word))
  );
}

