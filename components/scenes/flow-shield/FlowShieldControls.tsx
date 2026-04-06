'use client'

import { LEVA_THEME } from './src/components/theme/theme'
import { Leva } from 'leva'

export default function FlowShieldControls({ show = true }: { show?: boolean }) {
  return (
    <div style={{ opacity: show ? 1 : 0, transition: 'opacity 700ms ease-out' }}>
      <Leva
        theme={LEVA_THEME}
        collapsed={false}
        flat={false}
        oneLineLabels={false}
        titleBar={{
          title: 'CONTROLS',
          drag: true,
          filter: false,
          position: { x: -10, y: 120 },
        }}
      />
    </div>
  )
}
