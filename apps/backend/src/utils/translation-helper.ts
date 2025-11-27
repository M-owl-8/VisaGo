/**
 * Translation Helper
 * Auto-translates missing UZ/RU translations using GPT-4
 */

import { logInfo, logError } from '../middleware/logger';
import AIOpenAIService from '../services/ai-openai.service';

/**
 * Translate text to Uzbek or Russian using GPT-4
 */
export async function translateText(
  text: string,
  targetLanguage: 'uz' | 'ru',
  context?: string
): Promise<string> {
  try {
    const languageName = targetLanguage === 'uz' ? 'Uzbek' : 'Russian';
    const systemPrompt = `You are a professional translator. Translate the given text to ${languageName} language.

Rules:
- Keep the translation natural and appropriate for visa document context
- Maintain professional tone
- If the text is about Uzbekistan or documents, use appropriate terminology
- Return ONLY the translation, no explanations, no markdown`;

    const userPrompt = context
      ? `Translate this text to ${languageName}:\n\n"${text}"\n\nContext: ${context}`
      : `Translate this text to ${languageName}:\n\n"${text}"`;

    const response = await AIOpenAIService.chat(
      [{ role: 'user', content: userPrompt }],
      systemPrompt
    );

    if (response && response.message) {
      // Clean up response (remove quotes if present)
      let translation = response.message.trim();
      if (
        (translation.startsWith('"') && translation.endsWith('"')) ||
        (translation.startsWith("'") && translation.endsWith("'"))
      ) {
        translation = translation.slice(1, -1);
      }
      return translation;
    }

    return text; // Fallback to original
  } catch (error) {
    logError(`[Translation Helper] Failed to translate to ${targetLanguage}`, error as Error, {
      text: text.substring(0, 50),
    });
    return text; // Fallback to original
  }
}

/**
 * Auto-translate missing translations in checklist items
 */
export async function autoTranslateChecklistItems(
  items: Array<{
    name?: string;
    nameUz?: string;
    nameRu?: string;
    description?: string;
    descriptionUz?: string;
    descriptionRu?: string;
    whereToObtain?: string;
    whereToObtainUz?: string;
    whereToObtainRu?: string;
  }>
): Promise<void> {
  logInfo('[Translation Helper] Auto-translating missing translations', {
    itemCount: items.length,
  });

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    // Translate name
    if (item.name && !item.nameUz) {
      logInfo(`[Translation Helper] Translating nameUz for item ${i + 1}`);
      item.nameUz = await translateText(item.name, 'uz', 'Document name for visa checklist');
    }
    if (item.name && !item.nameRu) {
      logInfo(`[Translation Helper] Translating nameRu for item ${i + 1}`);
      item.nameRu = await translateText(item.name, 'ru', 'Document name for visa checklist');
    }

    // Translate description
    if (item.description && !item.descriptionUz) {
      logInfo(`[Translation Helper] Translating descriptionUz for item ${i + 1}`);
      item.descriptionUz = await translateText(
        item.description,
        'uz',
        'Document description for visa checklist'
      );
    }
    if (item.description && !item.descriptionRu) {
      logInfo(`[Translation Helper] Translating descriptionRu for item ${i + 1}`);
      item.descriptionRu = await translateText(
        item.description,
        'ru',
        'Document description for visa checklist'
      );
    }

    // Translate whereToObtain
    if (item.whereToObtain && !item.whereToObtainUz) {
      logInfo(`[Translation Helper] Translating whereToObtainUz for item ${i + 1}`);
      item.whereToObtainUz = await translateText(
        item.whereToObtain,
        'uz',
        'Instructions for obtaining document in Uzbekistan'
      );
    }
    if (item.whereToObtain && !item.whereToObtainRu) {
      logInfo(`[Translation Helper] Translating whereToObtainRu for item ${i + 1}`);
      item.whereToObtainRu = await translateText(
        item.whereToObtain,
        'ru',
        'Instructions for obtaining document in Uzbekistan'
      );
    }
  }

  logInfo('[Translation Helper] Auto-translation completed');
}
