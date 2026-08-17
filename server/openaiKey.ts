import { storage } from "./storage";

/**
 * OpenAI API anahtarini tek kaynaktan getirir:
 * 1) Admin ayarlarindaki `openai_api_key` (site_settings)
 * 2) Bossa OPENAI_API_KEY ortam degiskeni
 */
export async function getOpenAiApiKey(): Promise<string | null> {
  try {
    const settings = await storage.getSiteSettings();
    const key = settings.openai_api_key?.trim();
    if (key) return key;
  } catch (err) {
    console.error("[openaiKey] site settings okunamadi:", err);
  }
  return process.env.OPENAI_API_KEY?.trim() || null;
}

export const OPENAI_KEY_MISSING_MESSAGE =
  "OpenAI API anahtarı tanımlı değil. Ayarlar > Giriş & Güvenlik bölümünden OpenAI API anahtarınızı ekleyin.";

/** OpenAI hatalarini kullaniciya anlasilir Turkce mesaja cevirir. */
export function mapOpenAiError(error: unknown): { status: number; message: string } {
  const status = (error as { status?: number })?.status;
  if (status === 401) {
    return { status: 502, message: "OpenAI API anahtarı geçersiz veya iptal edilmiş. Ayarlardan anahtarı kontrol edin." };
  }
  if (status === 429) {
    return { status: 502, message: "OpenAI kota veya istek limiti aşıldı. Birkaç dakika sonra tekrar deneyin; sorun sürerse OpenAI hesabınızın bakiyesini kontrol edin." };
  }
  if (status === 400) {
    return { status: 502, message: "OpenAI isteği reddetti. Konuyu sadeleştirip tekrar deneyin." };
  }
  console.error("[openai] beklenmeyen hata:", error);
  return { status: 502, message: "Yapay zeka servisine ulaşılamadı. Lütfen tekrar deneyin." };
}

/** Uretilen metinlerde uzun tire kullanilmaz; normal tireye cevrilir. */
export function stripEmDashes(text: string): string {
  return text.replace(/\s*—\s*/g, " - ").replace(/—/g, "-");
}
