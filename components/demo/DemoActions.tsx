'use client'

import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { demos } from '@/data/demos'
import { useDemoSelection } from './demo-selection-context'

const DEFAULT_DEMO = demos[0]

function OpenInNewIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[0.95rem] w-[0.95rem]"
      aria-hidden
    >
      <path d="M14 5h5v5" />
      <path d="M10 14 19 5" />
      <path d="M19 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4" />
    </svg>
  )
}

function GithubIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-[0.95rem] w-[0.95rem]"
      aria-hidden
    >
      <path d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.41-4.04-1.41-.55-1.38-1.33-1.74-1.33-1.74-1.09-.74.08-.72.08-.72 1.2.09 1.84 1.24 1.84 1.24 1.08 1.83 2.82 1.3 3.5 1 .11-.78.42-1.3.76-1.6-2.67-.31-5.48-1.35-5.48-5.98 0-1.32.47-2.4 1.24-3.24-.13-.31-.54-1.57.12-3.27 0 0 1.01-.33 3.3 1.24a11.4 11.4 0 0 1 6 0c2.29-1.57 3.3-1.24 3.3-1.24.66 1.7.25 2.96.12 3.27.77.84 1.24 1.92 1.24 3.24 0 4.64-2.81 5.67-5.49 5.98.43.37.82 1.09.82 2.21v3.28c0 .32.22.69.83.58A12 12 0 0 0 12 .5Z" />
    </svg>
  )
}

function CodesandboxIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[0.95rem] w-[0.95rem]"
      aria-hidden
    >
      <path d="m12 2 8 4.5v11L12 22l-8-4.5v-11L12 2Z" />
      <path d="M12 22V11" />
      <path d="m20 6.5-8 4.5-8-4.5" />
      <path d="m8 4.5 8 4.5" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[0.95rem] w-[0.95rem]"
      aria-hidden
    >
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  )
}

type Action = {
  Icon: () => React.JSX.Element
  ariaLabel: string
  href: string
  label: string
  rel?: string
  target?: string
}

const SPRING =
  'linear(0.00, 0.0183, 0.0587, 0.116, 0.184, 0.264, 0.349, 0.436, 0.524, 0.610, 0.691, 0.768, 0.837, 0.900, 0.955, 1.00, 1.04, 1.07, 1.10, 1.12, 1.13, 1.14, 1.14, 1.14, 1.14, 1.13, 1.12, 1.11, 1.10, 1.08, 1.07, 1.06, 1.05, 1.04, 1.03, 1.02, 1.01, 1.00, 0.996, 0.991, 0.987, 0.984, 0.982, 0.980, 0.980, 0.980, 0.980, 0.981, 0.982, 0.984, 0.986, 0.987, 0.989, 0.991, 0.992, 0.994, 0.996, 0.997, 0.998, 0.999, 1.00)'

export function DemoActions() {
  const { selectedDemo } = useDemoSelection()
  const demo = selectedDemo ?? DEFAULT_DEMO

  const linkClassName =
    'group relative grid h-[1.8rem] w-[1.8rem] place-items-center rounded-full text-[#555] transition-colors duration-150 hover:bg-black/6 hover:text-[#111] dark:text-[#aaa] dark:hover:bg-white/8 dark:hover:text-white'
  const tooltipClassName =
    'pointer-events-none absolute top-full left-1/2 mt-[0.45rem] -translate-x-1/2 rounded-[4px] bg-[#222] px-2 py-1 text-[0.65rem] leading-none whitespace-nowrap text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100'
  const actions: Action[] = [
    {
      Icon: OpenInNewIcon,
      ariaLabel: 'Open full page demo',
      href: demo.embedUrl,
      label: 'Fullpage',
      rel: 'noopener noreferrer',
      target: '_blank',
    },
    {
      Icon: GithubIcon,
      ariaLabel: 'Open demo source code',
      href: `https://github.com/pmndrs/examples/tree/main/demos/${demo.name}`,
      label: 'Code',
      rel: 'noopener noreferrer',
      target: '_blank',
    },
    {
      Icon: CodesandboxIcon,
      ariaLabel: 'Open in CodeSandbox',
      href: `https://codesandbox.io/s/github/pmndrs/examples/tree/main/demos/${demo.name}`,
      label: 'CodeSandbox',
      rel: 'noopener noreferrer',
      target: '_blank',
    },
    {
      Icon: DownloadIcon,
      ariaLabel: 'Download demo ZIP',
      href: `/api/demo-download/${demo.name}`,
      label: 'Download ZIP',
    },
  ]

  return (
    <>
      <span
        className="max-w-[7rem] truncate px-2 font-mono text-[0.7rem] font-medium tracking-[0.02em] text-[#555] dark:text-[#aaa] sm:max-w-[10rem]"
        title={demo.name}
      >
        {demo.name}
      </span>
      <span
        aria-hidden
        className="mx-1 h-4 w-px shrink-0 bg-black/8 dark:bg-white/10"
      />
      <div className="contents sm:hidden">
        <Popover className="relative">
          {({ open }) => (
            <>
              <PopoverButton
                aria-label="More demo actions"
                className="grid h-[1.8rem] w-[1.8rem] place-items-center rounded-full text-[#555] transition-colors duration-150 hover:bg-black/6 hover:text-[#111] dark:text-[#aaa] dark:hover:bg-white/8 dark:hover:text-white"
              >
                <svg
                  viewBox="0 0 16 16"
                  aria-hidden
                  className="h-[0.95rem] w-[0.95rem] fill-current"
                >
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
                    {actions.map(({ Icon, ariaLabel, href, label, rel, target }) => (
                      <a
                        key={label}
                        href={href}
                        aria-label={ariaLabel}
                        rel={rel}
                        target={target}
                        download={label === 'Download ZIP' ? `${demo.name}.zip` : undefined}
                        onClick={() => close()}
                        className="flex h-10 items-center rounded-xl px-3 text-[#555] transition-colors hover:bg-black/6 hover:text-[#111] dark:text-[#aaa] dark:hover:bg-white/8 dark:hover:text-white"
                      >
                        <span className="text-[0.8rem] font-medium">{label}</span>
                        <span className="ml-auto">
                          <Icon />
                        </span>
                      </a>
                    ))}
                  </div>
                )}
              </PopoverPanel>
            </>
          )}
        </Popover>
      </div>
      <div className="hidden sm:contents">
        {actions.map(({ Icon, ariaLabel, href, label, rel, target }) => (
          <a
            key={label}
            href={href}
            target={target}
            rel={rel}
            download={label === 'Download ZIP' ? `${demo.name}.zip` : undefined}
            aria-label={ariaLabel}
            className={linkClassName}
          >
            <Icon />
            <span className={tooltipClassName}>{label}</span>
          </a>
        ))}
      </div>
    </>
  )
}
