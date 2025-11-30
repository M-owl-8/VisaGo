/**
 * Error message utilities
 * Provides fallback messages when translations fail
 */

export const getErrorMessage = (
  error: any,
  t: (key: string) => string,
  language: string = 'en'
): string => {
  // If error already has a user-friendly message, use it
  if (error.message && !error.message.startsWith('errors.')) {
    return error.message;
  }

  // Timeout errors
  if (
    error.code === 'ECONNABORTED' ||
    error.message?.includes('timeout') ||
    error.message?.includes('exceeded')
  ) {
    const translated = t('errors.timeoutError');
    if (translated && translated !== 'errors.timeoutError') {
      return translated;
    }

    const fallbacks: Record<string, string> = {
      en: 'Request timed out. The file may be too large or the connection is slow. Please try again.',
      ru: 'Превышено время ожидания. Файл может быть слишком большим или соединение медленное. Пожалуйста, попробуйте снова.',
      uz: "So'rov vaqti tugadi. Fayl juda katta bo'lishi yoki ulanish sekin bo'lishi mumkin. Iltimos, qayta urinib ko'ring.",
    };
    return fallbacks[language] || fallbacks.en;
  }

  // Network errors
  if (error.code === 'NETWORK_ERROR' || error.status === 0) {
    const translated = t('errors.networkErrorDetail');
    if (translated && translated !== 'errors.networkErrorDetail') {
      return translated;
    }

    // Fallback messages by language
    const fallbacks: Record<string, string> = {
      en: 'Cannot connect to server. Please check your internet connection and try again.',
      ru: 'Не удается подключиться к серверу. Пожалуйста, проверьте подключение к интернету и попробуйте снова.',
      uz: "Serverga ulanib bo'lmadi. Iltimos, internet ulanishingizni tekshiring va qayta urinib ko'ring.",
    };
    return fallbacks[language] || fallbacks.en;
  }

  // 401 Unauthorized
  if (error.status === 401) {
    const translated = t('errors.invalidCredentials');
    if (translated && translated !== 'errors.invalidCredentials') {
      return translated;
    }

    const fallbacks: Record<string, string> = {
      en: 'Invalid email or password. Please try again.',
      ru: 'Неверный email или пароль. Пожалуйста, попробуйте снова.',
      uz: "Noto'g'ri email yoki parol. Iltimos, qayta urinib ko'ring.",
    };
    return fallbacks[language] || fallbacks.en;
  }

  // 409 Conflict (email exists or application conflict)
  if (error.status === 409) {
    // Check if it's an application conflict (from /api/applications/ai-generate)
    if (
      error.code === 'APPLICATION_CONFLICT' ||
      error.isValidationError ||
      error.message?.includes('application') ||
      error.message?.includes('country')
    ) {
      // Use the error message from the API if available
      if (error.message && !error.message.startsWith('errors.')) {
        return error.message;
      }

      const translated = t('errors.applicationConflict');
      if (translated && translated !== 'errors.applicationConflict') {
        return translated;
      }

      const fallbacks: Record<string, string> = {
        en: 'You already have an active application for this country. Please complete or delete it before creating a new one.',
        ru: 'У вас уже есть активная заявка на эту страну. Пожалуйста, завершите или удалите её перед созданием новой.',
        uz: "Bu mamlakat uchun allaqachon faol ariza mavjud. Iltimos, yangisini yaratishdan oldin uni yakunlang yoki o'chiring.",
      };
      return fallbacks[language] || fallbacks.en;
    }

    // Otherwise, treat as email conflict (for registration)
    const translated = t('errors.emailExists');
    if (translated && translated !== 'errors.emailExists') {
      return translated;
    }

    const fallbacks: Record<string, string> = {
      en: 'This email is already registered. Please use a different email or try logging in.',
      ru: 'Этот email уже зарегистрирован. Пожалуйста, используйте другой email или попробуйте войти.',
      uz: "Bu email allaqachon ro'yxatdan o'tgan. Iltimos, boshqa email ishlating yoki kirishni urinib ko'ring.",
    };
    return fallbacks[language] || fallbacks.en;
  }

  // Generic error
  return error.message || t('errors.genericError') || 'An error occurred';
};
