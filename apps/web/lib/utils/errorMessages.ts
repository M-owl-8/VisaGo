/**
 * Error message utilities
 * Provides fallback messages when translations fail
 */

export const getErrorMessage = (
  error: any,
  t: (key: string) => string,
  language: string = 'en',
): string => {
  // If error already has a user-friendly message, use it
  if (error.message && !error.message.startsWith('errors.')) {
    return error.message;
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

  // 409 Conflict (email exists)
  if (error.status === 409) {
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


