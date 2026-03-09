# NEXUS — Premium NFT Platform

A cinematic, production-grade NFT platform built with **Next.js 14**, **Tailwind CSS**, and **GSAP**.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## What Changed (v2)

### ✅ Hero → Overlay Carousel
- Full-width cinematic frame with background media layer + copy overlay
- **3 slides** that crossfade every 8 seconds with GSAP
- Each slide: subtle zoom (1.06→1.0), drift, text fades/raises in
- **Lenient** motion: 0.8–1.2s durations, `power2.out` / `sine.inOut`
- Dot navigation with progress indicator
- 3 NFT cards in a fanned triptych sit beside the text per slide
- Readability scrim (multi-layer gradient overlay)

### ✅ Breaking News Ticker
- Full-width strip directly under the hero
- Left label: **MARKET PULSE** with red **BREAKING** pill
- Headlines scroll right→left continuously (CSS marquee)
- Fade-masked edges for premium look
- Pauses on hover

### ✅ All Images → `/public/pictures/`
- 24 NFT placeholder images: `nft-00.svg` through `nft-23.svg`
- 3 Hero backgrounds: `hero-bg-1.svg`, `hero-bg-2.svg`, `hero-bg-3.svg`
- 6 Collection covers: `collection-01.svg` through `collection-06.svg`
- 1 Mint hero: `mint-hero.svg`
- **Replace these SVGs with your real PNGs/JPGs** — same filenames

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Home — Carousel hero + news ticker + featured + collections + how it works + news teaser + roadmap + FAQ |
| `/explore` | Gallery — Filters, search, sort, NFT grid with skeleton loading |
| `/nft/[id]` | NFT Detail — Media frame, token info, traits, provenance |
| `/mint` | Mint — Collection preview + checkout panel, 7 wallet states |
| `/news` | News — CryptoPanic-style feed with sentiment filters + ticker sidebar |
| `/admin` | Admin — Control room: overview, settings, allowlist, analytics, activity |

## Image Replacement Guide

All placeholder images live in `public/pictures/`. To use real art:

```
public/pictures/
├── nft-00.png      ← Replace .svg with .png/.jpg (update mock data paths)
├── nft-01.png
├── ...
├── hero-bg-1.png   ← Wide 1920×1080 backgrounds for carousel
├── hero-bg-2.png
├── hero-bg-3.png
├── collection-01.png
├── ...
└── mint-hero.png
```

Image paths are defined in:
- `src/lib/mock/nfts.js` — NFT images + hero slides
- `src/lib/mock/collections.js` — Collection covers

## Component Tree

```
src/components/
├── hero/
│   ├── HeroCarousel.jsx     ← NEW: Overlay carousel with GSAP crossfade
│   ├── CursorSpotlight.jsx  ← Radial gradient cursor follower
│   └── HeroLabels.jsx       ← Legacy (optional)
├── home/
│   ├── BreakingNewsTicker.jsx ← NEW: Marquee strip
│   ├── FeaturedNFTs.jsx
│   ├── TrendingCollections.jsx
│   ├── HowItWorks.jsx
│   ├── MarketPulse.jsx
│   ├── Roadmap.jsx
│   └── FAQ.jsx
├── nft/
│   ├── NFTCard.jsx
│   ├── NFTGrid.jsx
│   ├── NFTMedia.jsx          ← Updated: handles file paths + legacy gradients
│   ├── FiltersPanel.jsx
│   └── CollectionCard.jsx    ← Updated: uses <img> tags
├── mint/
│   ├── MintPanel.jsx         ← 7 wallet state toggles (gear icon)
│   ├── QuantityStepper.jsx
│   ├── TxDrawer.jsx
│   └── Toast.jsx
├── news/
│   ├── NewsFeed.jsx
│   ├── NewsCard.jsx
│   ├── NewsFilterChips.jsx
│   └── TickerSidebarCard.jsx
├── admin/
│   ├── AdminShell.jsx
│   ├── AdminStatCard.jsx
│   ├── SettingsForm.jsx
│   ├── UploadDropzone.jsx
│   └── ActivityLog.jsx
├── layout/
│   ├── Header.jsx            ← Hero-fused + sticky compact
│   ├── Footer.jsx
│   └── PageShell.jsx
└── ui/
    ├── Button.jsx, Card.jsx, Badge.jsx
    ├── Input.jsx, Select.jsx, Tabs.jsx
    └── Skeleton.jsx
```

## Accessibility

- `prefers-reduced-motion`: all GSAP + CSS animations disabled
- Cursor spotlight disabled on mobile + reduced motion
- Semantic HTML, proper heading hierarchy
- Carousel dot navigation with aria-labels
