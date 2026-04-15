'use client'

import { demos } from '@/data/demos'
import { useEffect, useState } from 'react'
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
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-[0.95rem] w-[0.95rem]" aria-hidden>
      <path d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.41-4.04-1.41-.55-1.38-1.33-1.74-1.33-1.74-1.09-.74.08-.72.08-.72 1.2.09 1.84 1.24 1.84 1.24 1.08 1.83 2.82 1.3 3.5 1 .11-.78.42-1.3.76-1.6-2.67-.31-5.48-1.35-5.48-5.98 0-1.32.47-2.4 1.24-3.24-.13-.31-.54-1.57.12-3.27 0 0 1.01-.33 3.3 1.24a11.4 11.4 0 0 1 6 0c2.29-1.57 3.3-1.24 3.3-1.24.66 1.7.25 2.96.12 3.27.77.84 1.24 1.92 1.24 3.24 0 4.64-2.81 5.67-5.49 5.98.43.37.82 1.09.82 2.21v3.28c0 .32.22.69.83.58A12 12 0 0 0 12 .5Z" />
    </svg>
  )
}

function StackblitzIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-[0.95rem] w-[0.95rem]" aria-hidden>
      <path d="M13.53 2 6.4 10.27h5.09L9.83 22l7.77-9.08h-5.04L13.53 2Z" />
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

function CommandIcon() {
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
      <path d="M9 9a3 3 0 1 1-3-3h12a3 3 0 1 1-3 3v6a3 3 0 1 1 3 3H6a3 3 0 1 1 3-3V9Z" />
    </svg>
  )
}

export function DemoActions() {
  const { selectedDemo } = useDemoSelection()
  const demo = selectedDemo ?? DEFAULT_DEMO
  const [copied, setCopied] = useState(false)
  const command = `npx -y degit pmndrs/examples/demos/${demo.name} ${demo.name} && cd ${demo.name} && npm i && npm run dev`

  useEffect(() => {
    if (!copied) return
    const timeoutId = window.setTimeout(() => setCopied(false), 1600)
    return () => window.clearTimeout(timeoutId)
  }, [copied])

  const linkClassName =
    'group relative grid h-[1.8rem] w-[1.8rem] place-items-center rounded-full text-[#555] transition-colors duration-150 hover:bg-black/6 hover:text-[#111] dark:text-[#aaa] dark:hover:bg-white/8 dark:hover:text-white'
  const tooltipClassName =
    'pointer-events-none absolute top-full left-1/2 mt-[0.45rem] -translate-x-1/2 rounded-[4px] bg-[#222] px-2 py-1 text-[0.65rem] leading-none whitespace-nowrap text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100'

  return (
    <>
      <a
        href={demo.embedUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Open full page demo"
        className={linkClassName}
      >
        <OpenInNewIcon />
        <span className={tooltipClassName}>fullpage</span>
      </a>
      <a
        href={`https://github.com/pmndrs/examples/tree/main/demos/${demo.name}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Open demo source code"
        className={linkClassName}
      >
        <GithubIcon />
        <span className={tooltipClassName}>code</span>
      </a>
      <a
        href={`https://stackblitz.com/github/pmndrs/examples/tree/main/demos/${demo.name}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Open in StackBlitz"
        className={linkClassName}
      >
        <StackblitzIcon />
        <span className={tooltipClassName}>stackblitz</span>
      </a>
      <a
        href={`https://codesandbox.io/s/github/pmndrs/examples/tree/main/demos/${demo.name}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Open in CodeSandbox"
        className={linkClassName}
      >
        <CodesandboxIcon />
        <span className={tooltipClassName}>codesandbox</span>
      </a>
      <button
        type="button"
        aria-label="Copy degit command"
        className={linkClassName}
        onClick={async () => {
          await navigator.clipboard.writeText(command)
          setCopied(true)
        }}
      >
        <CommandIcon />
        <span className={tooltipClassName}>{copied ? 'copied' : 'degit'}</span>
      </button>
    </>
  )
}
