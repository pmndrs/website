'use client'

import Link from '@/components/Link'

type Article = { title: string; href: string; author: string }

export function ArticleCTA({ article }: { article: Article }) {
  return (
    <div className="pointer-events-none absolute bottom-8 left-8 z-10 max-w-xs">
      <div className="pointer-events-auto overflow-hidden rounded-2xl bg-white p-4 shadow-[0_2px_16px_rgb(0_0_0/0.08)] ring-1 ring-black/5">
        <p className="mb-1 text-[0.65rem] font-semibold tracking-[0.2em] text-[#aaa] uppercase">
          New Article
        </p>
        <p className="text-sm leading-snug font-semibold text-[#111]">{article.title}</p>
        <p className="mt-0.5 text-[0.65rem] text-[#999]">by {article.author}</p>
        <Link
          href={article.href}
          className="mt-3 inline-block rounded-full border border-black/10 bg-black/5 px-3 py-1.5 text-xs font-medium text-[#333] transition hover:bg-black/10"
        >
          Read article
        </Link>
      </div>
    </div>
  )
}
