import { useI18n } from '../contexts/I18nContext';

import { logger } from '@/lib/logger';
export function useTranslation() {
  const { locale, messages } = useI18n();
  
  const t = (id: string, values?: Record<string, string | number>) => {
    // 简单的消息查找，支持嵌套键值
    const keys = id.split('.');
    let message: unknown = messages;
    
    for (const key of keys) {
      if (message && typeof message === 'object' && message !== null && key in message) {
        message = (message as Record<string, unknown>)[key];
      } else {
        logger.warn(`Translation key not found: ${id}`);
        return id; // 如果找不到翻译，返回键名
      }
    }
    
    if (typeof message === 'string') {
      // 简单的变量替换
      if (values) {
        let result = message;
        for (const [key, value] of Object.entries(values)) {
          result = result.replace(new RegExp(`{${key}}`, 'g'), String(value));
        }
        return result;
      }
      return message;
    }
    
    logger.warn(`Invalid translation value for key: ${id}`);
    return id;
  };
  
  return { t, locale };
}

export function getLocaleFromPathname(pathname: string): 'en' | 'zh' {
  if (pathname.startsWith('/zh')) {
    return 'zh';
  }
  return 'en';
}

export function getPathnameWithLocale(pathname: string, locale: 'en' | 'zh'): string {
  if (locale === 'en') {
    return pathname.replace(/^\/zh/, '') || '/';
  }
  if (pathname === '/') {
    return '/zh';
  }
  return `/zh${pathname}`;
}
