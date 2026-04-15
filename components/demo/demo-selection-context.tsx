'use client'

import { Demo } from '@/data/demos'
import { createContext, ReactNode, useContext, useMemo, useState } from 'react'

type DemoSelectionContextValue = {
  selectedDemo: Demo | null
  setSelectedDemo: (demo: Demo | null) => void
}

const DemoSelectionContext = createContext<DemoSelectionContextValue | null>(null)

export function DemoSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedDemo, setSelectedDemo] = useState<Demo | null>(null)
  const value = useMemo(() => ({ selectedDemo, setSelectedDemo }), [selectedDemo])

  return <DemoSelectionContext.Provider value={value}>{children}</DemoSelectionContext.Provider>
}

export function useDemoSelection() {
  const context = useContext(DemoSelectionContext)
  if (!context) {
    throw new Error('useDemoSelection must be used within a DemoSelectionProvider')
  }

  return context
}
