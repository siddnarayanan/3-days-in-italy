# 3 Days in Italy

A trip planner that turns a dataset of ~100 real Italian places (restaurants, historic sites, museums, markets, viewpoints, and more) into a personalized 3-day itinerary. A guided, multi-step wizard collects a home base, travel radius, pace, interests, budget, and optional trip dates, then a rule-based planner builds a day-by-day itinerary — scored by rating, interest match, budget fit, and geographic/travel-time proximity — that you can further edit by hand: remove, reorder by drag-and-drop, swap, or add stops, with a map and a downloadable PDF.

**Live app:** https://italy-trip-planner-sidd.vercel.app

## Tech stack

- **[Next.js](https://nextjs.org)** (App Router) — frontend and the `/api/plan` backend route
- **TypeScript**
- **[Tailwind CSS](https://tailwindcss.com)** — styling
- **[Vercel](https://vercel.com)** — deployment, with continuous deployment from `main`

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Testing

```bash
npm test
```

## Project structure

```
app/                  Next.js routes (page + /api/plan)
components/           UI components, including the wizard (components/wizard/)
lib/                  Core logic: data loading, the deterministic planner,
                      validation guardrails, geo/hours utilities, persistence
data/italy.json       The source dataset
```
