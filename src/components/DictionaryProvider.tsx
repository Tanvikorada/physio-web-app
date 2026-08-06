"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
import en from '@/locales/en.json'
import hi from '@/locales/hi.json'
import te from '@/locales/te.json'

const dictionaries: Record<string, Record<string, string>> = {
  en,
  hi,
  te,
}

type DictionaryContextType = {
  t: (key: string) => string
  language: string
  largeText: boolean
}

const DictionaryContext = createContext<DictionaryContextType>({
  t: (key) => key,
  language: 'en',
  largeText: false
})

export const useTranslation = () => useContext(DictionaryContext)

export const DictionaryProvider = ({ 
  children, 
  initialLanguage = 'en',
  initialLargeText = false
}: { 
  children: React.ReactNode, 
  initialLanguage?: string
  initialLargeText?: boolean
}) => {
  const [language, setLanguage] = useState(initialLanguage)
  const [largeText, setLargeText] = useState(initialLargeText)

  // Sync with prop if it changes (e.g. on navigation)
  useEffect(() => {
    setLanguage(initialLanguage)
    setLargeText(initialLargeText)
  }, [initialLanguage, initialLargeText])

  const t = (key: string) => {
    const dict = dictionaries[language] || dictionaries['en']
    return dict[key] || key
  }

  return (
    <DictionaryContext.Provider value={{ t, language, largeText }}>
      {children}
    </DictionaryContext.Provider>
  )
}
