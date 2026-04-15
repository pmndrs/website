'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-[0.95rem] w-[0.95rem]" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" />
      <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
      <line x1="2" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="22" y2="12" />
      <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" />
      <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-[0.95rem] w-[0.95rem]" aria-hidden>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function SystemIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-[0.95rem] w-[0.95rem]" aria-hidden>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  )
}

const themeOptions = [
  { value: 'light', label: 'Light', Icon: SunIcon },
  { value: 'dark', label: 'Dark', Icon: MoonIcon },
  { value: 'system', label: 'Auto', Icon: SystemIcon },
] as const

export function ThemeRow() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  return (
    <div className="flex h-10 items-center rounded-xl px-3 text-[#555] dark:text-[#aaa]">
      <span className="text-[0.8rem] font-medium">Theme</span>
      <div className="ml-auto flex gap-1">
        {themeOptions.map(({ value, label, Icon }) => (
          <button
            key={value}
            onClick={() => setTheme(value)}
            aria-label={label}
            className={`cursor-pointer grid h-[1.6rem] w-[1.6rem] place-items-center rounded-lg transition-colors ${
              mounted && theme === value
                ? 'bg-black/8 text-[#111] dark:bg-white/12 dark:text-white'
                : 'text-[#999] hover:text-[#555] dark:text-[#666] dark:hover:text-[#aaa]'
            }`}
          >
            <Icon />
          </button>
        ))}
      </div>
    </div>
  )
}
