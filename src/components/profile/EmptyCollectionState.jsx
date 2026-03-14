'use client'

import { LayoutGrid, Sparkles } from 'lucide-react'
import Button from '@/components/ui/Button'

export default function EmptyCollectionState({ onExplore }) {
  return (
    <div className="rounded-[28px] border border-border-light bg-surface2/40 px-6 py-14 text-center">
      <div className="relative w-fit mx-auto mb-6">
        <div className="w-20 h-20 rounded-[24px] bg-gradient-to-br from-accent to-accent-violet flex items-center justify-center">
          <LayoutGrid size={34} className="text-white" />
        </div>
        <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-card border border-border-light flex items-center justify-center">
          <Sparkles size={14} className="text-accent" />
        </div>
      </div>

      <h3 className="text-2xl font-bold mb-3">Your collection is empty</h3>
      <p className="text-muted max-w-md mx-auto mb-6">
        Start minting or receive assigned NFTs to begin building your premium collector profile.
      </p>

      <Button onClick={onExplore} size="lg">
        Explore NFTs
      </Button>
    </div>
  )
}