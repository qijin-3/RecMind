import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zh from './locales/zh.json';
import en from './locales/en.json';

/**
 * 初始化 i18n 配置
 */
i18n
  .use(initReactI18next)
  .init({
    resources: {
      zh: { translation: zh },
      en: { translation: en },
    },
    lng: navigator.language.startsWith('zh') ? 'zh' : 'en', // 根据浏览器语言自动选择
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React 已经处理了转义
    },
  });

export default i18n;

