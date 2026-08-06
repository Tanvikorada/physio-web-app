import en from '@/locales/en.json'
import hi from '@/locales/hi.json'
import te from '@/locales/te.json'

const dictionaries: Record<string, Record<string, string>> = {
  en,
  hi,
  te,
}

export function getDictionary(locale: string) {
  const dict = dictionaries[locale] || dictionaries['en']
  return {
    t: (key: string) => dict[key] || key
  }
}
