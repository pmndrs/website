'use client'

import Link from '@/components/Link'
import headerNavLinks from '@/data/headerNavLinks'
import Logo from '@/data/logo.svg'
import siteMetadata from '@/data/siteMetadata'
import { usePathname } from 'next/navigation'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ExampleActions } from './ExampleActions'
import { MoreMenu } from './MoreMenu'

const NAV_LINKS = headerNavLinks.filter((l) => l.href !== '/')

const pillSurface =
  'flex items-center gap-px rounded-full bg-white p-1.5 shadow-[0_1px_6px_rgb(0_0_0/0.08)] ring-1 ring-black/5 dark:bg-[#1a1a1a] dark:shadow-[0_1px_6px_rgb(0_0_0/0.3)] dark:ring-white/10'

export function Nav() {
  const isHome = usePathname() === '/'
  const navRef = useRef<HTMLElement | null>(null)
  const [mounted, setMounted] = useState(isHome)
  const [exiting, setExiting] = useState(false)
  const [navWidth, setNavWidth] = useState(0)

  useEffect(() => {
    if (isHome) {
      setExiting(false)
      setMounted(true)
    } else if (mounted) {
      setExiting(true)
    }
  }, [isHome, mounted])

  useLayoutEffect(() => {
    const nav = navRef.current
    if (!nav) return

    const updateNavWidth = () => setNavWidth(nav.offsetWidth)
    const observer = new ResizeObserver(updateNavWidth)

    updateNavWidth()
    observer.observe(nav)

    return () => observer.disconnect()
  }, [])

  return (
    <>
      <style>{`
        @keyframes home-actions-enter {
          from { opacity: 0; transform: translateX(10px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes home-actions-exit {
          from { opacity: 1; transform: translateX(0); }
          to   { opacity: 0; transform: translateX(-10px); }
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

      <nav
        ref={navRef}
        className={`fixed top-3 left-[calc(100vw-0.75rem)] z-50 flex -translate-x-full items-center gap-px sm:left-[calc(100vw-1.75rem)] ${pillSurface}`}
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

      {mounted && navWidth > 0 && (
        <>
          <div
            className={`fixed top-3 left-[calc(100vw-0.75rem-var(--nav-width)-0.5rem)] z-50 -translate-x-full sm:hidden ${
              exiting ? 'home-actions-exit' : 'home-actions-enter'
            }`}
            style={{ ['--nav-width' as string]: `${navWidth}px` }}
            onAnimationEnd={() => {
              if (exiting) {
                setMounted(false)
                setExiting(false)
              }
            }}
          >
            <div role="toolbar" aria-label="Example actions" className={pillSurface}>
              <ExampleActions />
            </div>
          </div>

          <div
            className={`fixed top-3 left-[calc(100vw-1.75rem-var(--nav-width)-0.5rem)] z-50 hidden -translate-x-full sm:block ${
              exiting ? 'home-actions-exit' : 'home-actions-enter'
            }`}
            style={{ ['--nav-width' as string]: `${navWidth}px` }}
            onAnimationEnd={() => {
              if (exiting) {
                setMounted(false)
                setExiting(false)
              }
            }}
          >
            <div role="toolbar" aria-label="Example actions" className={pillSurface}>
              <ExampleActions />
            </div>
          </div>
        </>
      )}
    </>
  )
}
