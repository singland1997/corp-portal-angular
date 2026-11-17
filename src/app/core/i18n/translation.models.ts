import { en } from './locales/en';

export type Locale = 'en' | 'th';
export type TranslationKey = keyof typeof en;
