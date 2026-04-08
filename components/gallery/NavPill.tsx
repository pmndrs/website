'use client'

import Link from '@/components/Link'
import Logo from '@/data/logo.svg'
import ThemeSwitch from '@/components/ThemeSwitch'
import SearchButton from '@/components/SearchButton'
import { Github, Discord, Twitter } from '@/components/social-icons/icons'
import siteMetadata from '@/data/siteMetadata'
import headerNavLinks from '@/data/headerNavLinks'
import { usePathname } from 'next/navigation'

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
      {/* Home button — separate pill, top-left, only visible away from home */}
      {!isHome && (
        <Link
          href="/"
          aria-label={siteMetadata.headerTitle}
          className="fixed top-3 left-3 z-50 grid h-[2.8rem] w-[2.8rem] place-items-center rounded-full bg-white shadow-[0_1px_6px_rgb(0_0_0/0.08)] ring-1 ring-black/5 transition-colors duration-150 hover:bg-black/3"
        >
          <Logo className="h-[1.2rem] w-[1.2rem]" />
        </Link>
      )}

      <nav
        className="fixed top-3 right-[calc(0.75rem+100vw-100%)] z-50 flex items-center gap-px rounded-full bg-white p-1.5 shadow-[0_1px_6px_rgb(0_0_0/0.08)] ring-1 ring-black/5"
        aria-label="Site navigation"
      >
        {NAV_LINKS.map(({ href, title }) => (
        <Link
          key={href}
          href={href}
          className="grid h-[1.8rem] place-items-center rounded-full px-3 text-[0.75rem] font-medium text-[#555] transition-colors duration-150 hover:bg-black/6 hover:text-[#111]"
        >
          {title}
        </Link>
      ))}

      <span className="mx-0.5 h-4 w-px bg-black/10" aria-hidden />

      <PillIconButton label="Search">
        <SearchButton />
      </PillIconButton>

      <PillIconButton label="Theme">
        <ThemeSwitch />
      </PillIconButton>

      {iconLinks.map(({ href, Icon, label }) =>
        href ? (
          <PillIconButton key={label} label={label}>
            <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label}>
              <Icon className="h-[0.95rem] w-[0.95rem] fill-current text-[#555]" />
            </a>
          </PillIconButton>
        ) : null
      )}
      </nav>
    </>
  )
}

function PillIconButton({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="group relative grid h-[1.8rem] w-[1.8rem] place-items-center rounded-full text-[#555] transition-colors duration-150 hover:bg-black/6 hover:text-[#111]">
      <div className="flex h-[0.95rem] w-[0.95rem] items-center justify-center [&_button]:!p-0 [&_a]:flex [&_svg]:h-[0.95rem] [&_svg]:w-[0.95rem]">
        {children}
      </div>
      <span className="pointer-events-none absolute top-full left-1/2 z-20 mt-[0.45rem] -translate-x-1/2 whitespace-nowrap rounded bg-[#222] px-2 py-1 text-[0.65rem] text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        {label}
      </span>
    </div>
  )
}
