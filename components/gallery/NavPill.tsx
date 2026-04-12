'use client'

import Link from '@/components/Link'
import SearchButton from '@/components/SearchButton'
import { Discord, Github, Twitter } from '@/components/social-icons/icons'
import headerNavLinks from '@/data/headerNavLinks'
import Logo from '@/data/logo.svg'
import siteMetadata from '@/data/siteMetadata'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { useTheme } from 'next-themes'
import { usePathname } from 'next/navigation'
import { useRef } from 'react'

// Compact spring curve (~tension:300 friction:20), good for small UI like popovers
const SPRING =
  'linear(0.00, 0.0183, 0.0587, 0.116, 0.184, 0.264, 0.349, 0.436, 0.524, 0.610, 0.691, 0.768, 0.837, 0.900, 0.955, 1.00, 1.04, 1.07, 1.10, 1.12, 1.13, 1.14, 1.14, 1.14, 1.14, 1.13, 1.12, 1.11, 1.10, 1.08, 1.07, 1.06, 1.05, 1.04, 1.03, 1.02, 1.01, 1.00, 0.996, 0.991, 0.987, 0.984, 0.982, 0.980, 0.980, 0.980, 0.980, 0.981, 0.982, 0.984, 0.986, 0.987, 0.989, 0.991, 0.992, 0.994, 0.996, 0.997, 0.998, 0.999, 1.00)'

const NAV_LINKS = headerNavLinks.filter((l) => l.href !== '/')

const iconLinks = [
  { href: siteMetadata.github, Icon: Github, label: 'GitHub' },
  { href: siteMetadata.discord, Icon: Discord, label: 'Discord' },
  { href: siteMetadata.x, Icon: Twitter, label: 'Twitter / X' },
] as const

export function NavPill() {
  const isHome = usePathname() === '/'

  return (
    <>
      {!isHome && (
        <Link
          href="/"
          aria-label={siteMetadata.headerTitle}
          className="fixed top-3 left-3 z-50 grid h-[2.8rem] w-[2.8rem] place-items-center rounded-full bg-white shadow-[0_1px_6px_rgb(0_0_0/0.08)] ring-1 ring-black/5 transition-colors duration-150 hover:bg-black/3 dark:bg-[#1a1a1a] dark:shadow-[0_1px_6px_rgb(0_0_0/0.3)] dark:ring-white/10 dark:hover:bg-white/5"
        >
          <Logo className="h-[1.2rem] w-[1.2rem] dark:invert" />
        </Link>
      )}

      <nav
        className="fixed top-3 left-[calc(100vw-0.75rem)] z-50 flex -translate-x-full items-center gap-px rounded-full bg-white p-1.5 shadow-[0_1px_6px_rgb(0_0_0/0.08)] ring-1 ring-black/5 sm:left-[calc(100vw-1.75rem)] dark:bg-[#1a1a1a] dark:shadow-[0_1px_6px_rgb(0_0_0/0.3)] dark:ring-white/10"
        aria-label="Site navigation"
      >
        {NAV_LINKS.map(({ href, title }) => (
          <Link
            key={href}
            href={href}
            className="grid h-[1.8rem] place-items-center rounded-full px-3 text-[0.75rem] font-medium text-[#555] transition-colors duration-150 hover:bg-black/6 hover:text-[#111] dark:text-[#aaa] dark:hover:bg-white/8 dark:hover:text-white"
          >
            {title}
          </Link>
        ))}

        <MoreMenu />
      </nav>
    </>
  )
}

function MoreMenu() {
  const searchRef = useRef<HTMLDivElement>(null)

  return (
    <Popover className="relative">
      {({ open }) => (
        <>
          <div ref={searchRef} className="absolute h-0 w-0 overflow-hidden" aria-hidden="true">
            <SearchButton />
          </div>

          <PopoverButton
            aria-label="More actions"
            className="grid h-[1.8rem] w-[1.8rem] place-items-center rounded-full text-[#555] transition-colors duration-150 hover:bg-black/6 hover:text-[#111] dark:text-[#aaa] dark:hover:bg-white/8 dark:hover:text-white"
          >
            <svg viewBox="0 0 16 16" aria-hidden className="h-[0.95rem] w-[0.95rem] fill-current">
              <circle cx="3" cy="8" r="1.25" />
              <circle cx="8" cy="8" r="1.25" />
              <circle cx="13" cy="8" r="1.25" />
            </svg>
          </PopoverButton>

          <PopoverPanel
            static
            className="absolute top-full right-0 z-[60] mt-4 min-w-[12rem] origin-top-right rounded-2xl bg-white p-2 shadow-[0_10px_30px_rgb(0_0_0/0.12)] ring-1 ring-black/5 focus:outline-none dark:bg-[#1a1a1a] dark:ring-white/10"
            style={{
              opacity: open ? 1 : 0,
              scale: open ? 1 : 0.92,
              translate: `0 ${open ? 0 : -4}px`,
              pointerEvents: open ? 'auto' : 'none',
              transition: `opacity 499ms ${SPRING}, scale 499ms ${SPRING}, translate 499ms ${SPRING}`,
            }}
          >
            {({ close }) => (
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  className="flex h-10 w-full cursor-pointer items-center rounded-xl px-3 text-[#555] hover:bg-black/6 dark:text-[#aaa] dark:hover:bg-white/8"
                  onClick={() => {
                    close()
                    searchRef.current?.querySelector<HTMLButtonElement>('button')?.click()
                  }}
                >
                  <span className="text-[0.8rem] font-medium">Search</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="ml-auto h-[0.95rem] w-[0.95rem]"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                    />
                  </svg>
                </button>

                <ThemeRow />

                <div className="my-1 h-px bg-black/10 dark:bg-white/10" />

                {iconLinks.map(({ href, Icon, label }) =>
                  href ? (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => close()}
                      className="flex h-10 items-center rounded-xl px-3 text-[#555] transition-colors hover:bg-black/6 hover:text-[#111] dark:text-[#aaa] dark:hover:bg-white/8 dark:hover:text-white"
                    >
                      <span className="text-[0.8rem] font-medium">{label}</span>
                      <Icon className="ml-auto h-[0.95rem] w-[0.95rem] fill-current" />
                    </a>
                  ) : null
                )}
              </div>
            )}
          </PopoverPanel>
        </>
      )}
    </Popover>
  )
}

const themeOptions = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'Auto' },
] as const

function ThemeRow() {
  const { theme, setTheme } = useTheme()
  return (
    <div className="flex h-10 items-center rounded-xl px-3 text-[#555] dark:text-[#aaa]">
      <span className="text-[0.8rem] font-medium">Theme</span>
      <div className="ml-auto flex gap-1">
        {themeOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setTheme(opt.value)}
            className={`rounded-lg px-2 py-1 text-[0.7rem] font-medium transition-colors ${
              theme === opt.value
                ? 'bg-black/8 text-[#111] dark:bg-white/12 dark:text-white'
                : 'text-[#999] hover:text-[#555] dark:text-[#666] dark:hover:text-[#aaa]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
