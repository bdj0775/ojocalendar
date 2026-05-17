import { useStore } from '../store/useStore';
import { translations } from '../utils/translations';
import type { Language } from '../types';

export const useTranslation = () => {
  const language = useStore(state => (state.settings?.language as Language) || 'ko');

  const t = (key: string): string => {
    const dictionary = translations[language] ?? translations['ko'];
    if (dictionary[key]) return dictionary[key];
    if (translations['en'][key]) return translations['en'][key];
    return key;
  };

  return { t, language };
};
