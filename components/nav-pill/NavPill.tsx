'use client'

import Link from '@/components/Link'
import headerNavLinks from '@/data/headerNavLinks'
import Logo from '@/data/logo.svg'
import siteMetadata from '@/data/siteMetadata'
import { usePathname } from 'next/navigation'
import { MoreMenu } from './MoreMenu'

const NAV_LINKS = headerNavLinks.filter((l) => l.href !== '/')

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
