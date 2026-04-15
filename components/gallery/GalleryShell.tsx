'use client'

import { useDemoSelection } from '@/components/demo/demo-selection-context'
import { useEffect, useState } from 'react'
import { Demo } from '@/data/demos'
import { DemoSidebar } from './DemoSidebar'
import { DemoStage } from './DemoStage'
import { ArticleCTA } from './ArticleCTA'

export function GalleryShell({ demos }: { demos: Demo[] }) {
  const { setSelectedDemo } = useDemoSelection()
  const [selected, setSelected] = useState<Demo>(demos[0])
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    setSelectedDemo(selected ?? null)
    return () => setSelectedDemo(null)
  }, [selected, setSelectedDemo])

  return (
    <div className="flex h-dvh overflow-hidden bg-[#eeeeee] font-sans">
      <DemoSidebar
        demos={demos}
        selected={selected}
        collapsed={collapsed}
        onSelect={setSelected}
        onToggle={() => setCollapsed((c) => !c)}
      />
      <main className="relative flex min-w-0 flex-1 items-center justify-center overflow-hidden p-6">
        <DemoStage demo={selected} />
      </main>
      <ArticleCTA article={demos[0].article!} />
    </div>
  )
}
