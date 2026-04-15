'use client'

import Link from '@/components/Link'
import headerNavLinks from '@/data/headerNavLinks'
import Logo from '@/data/logo.svg'
import siteMetadata from '@/data/siteMetadata'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ExampleActions } from './ExampleActions'
import { MoreMenu } from './MoreMenu'

const NAV_LINKS = headerNavLinks.filter((l) => l.href !== '/')

const pillSurface =
  'flex items-center gap-px rounded-full bg-white p-1.5 shadow-[0_1px_6px_rgb(0_0_0/0.08)] ring-1 ring-black/5 dark:bg-[#1a1a1a] dark:shadow-[0_1px_6px_rgb(0_0_0/0.3)] dark:ring-white/10'

export function Nav() {
  const isHome = usePathname() === '/'
  const [mounted, setMounted] = useState(isHome)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    if (isHome) {
      setExiting(false)
      setMounted(true)
    } else if (mounted) {
      setExiting(true)
    }
  }, [isHome])

  return (
    <>
      <style>{`
        @keyframes home-actions-enter {
          from { opacity: 0; transform: translateX(10px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes home-actions-exit {
          from { opacity: 1; transform: translateX(0); }
          to   { opacity: 0; transform: translateX(10px); }
        }
        .home-actions-enter {
          animation: home-actions-enter 200ms ease-out both;
        }
        .home-actions-exit {
          animation: home-actions-exit 150ms ease-in both;
        }
      `}</style>

      {!isHome && (
        <Link
          href="/"
          aria-label={siteMetadata.headerTitle}
          className="fixed top-3 left-3 z-50 grid h-[2.8rem] w-[2.8rem] place-items-center rounded-full bg-white shadow-[0_1px_6px_rgb(0_0_0/0.08)] ring-1 ring-black/5 transition-colors duration-150 hover:bg-black/3 dark:bg-[#1a1a1a] dark:shadow-[0_1px_6px_rgb(0_0_0/0.3)] dark:ring-white/10 dark:hover:bg-white/5"
        >
          <Logo className="h-[1.2rem] w-[1.2rem] dark:invert" />
        </Link>
      )}

      <div className="fixed top-3 right-3 z-50 flex flex-row-reverse items-center gap-2 sm:right-7">
        <nav className={pillSurface} aria-label="Site navigation">
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

        {mounted && (
          <div
            className={exiting ? 'home-actions-exit' : 'home-actions-enter'}
            onAnimationEnd={() => {
              if (exiting) {
                setMounted(false)
                setExiting(false)
              }
            }}
          >
            <div
              role="toolbar"
              aria-label="Example actions"
              className={pillSurface}
            >
              <ExampleActions />
            </div>
          </div>
        )}
      </div>
    </>
  )
}
