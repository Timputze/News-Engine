"use client"

import { useEffect, useMemo, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"

/* ------------------------------------------------------------------ */
/*  Config & types                                                     */
/* ------------------------------------------------------------------ */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "https://news-engine-backend.onrender.com/articles"

interface Article {
  id: number
  title: string
  link: string
  source: string
  score: number
  published_at: string
  load_timestamp: string
  keywords: string
  topic: string
}

const TOPICS = ["Wallet", "Regulation", "Verification", "Public Sector", "Other"]

const TOPIC_STYLES: Record<string, string> = {
  Wallet: "bg-[#4C7DFF]/15 text-[#9DB6FF] ring-[#4C7DFF]/30",
  Regulation: "bg-[#B57FFF]/15 text-[#D0B2FF] ring-[#B57FFF]/30",
  Verification: "bg-[#3ECFB2]/15 text-[#8CE8D5] ring-[#3ECFB2]/30",
  "Public Sector": "bg-[#E3B34B]/15 text-[#EFCE8B] ring-[#E3B34B]/30",
  Other: "bg-white/[0.06] text-[#98A2B8] ring-white/10",
}

/** Number of bars in the signal glyph — scores are scaled onto these. */
const SIGNAL_BARS = 5

/**
 * Derive "≥ x" filter thresholds from whatever scores exist in the data.
 * Few distinct scores → one chip per score. Many distinct scores (e.g. a
 * future 0–10 scale) → quantile-based thresholds so chips stay meaningful.
 */
function deriveScoreLevels(articles: Article[]): number[] {
  const distinct = [...new Set(articles.map((a) => a.score ?? 0))].sort(
    (a, b) => a - b
  )
  if (distinct.length <= 1) return []
  // Skip the minimum — "≥ min" is the same as "All".
  const above = distinct.slice(1)
  if (above.length <= 4) return above
  const sorted = articles.map((a) => a.score ?? 0).sort((a, b) => a - b)
  const q = (p: number) => sorted[Math.floor(sorted.length * p)]
  return [...new Set([q(0.5), q(0.75), q(0.9), distinct[distinct.length - 1]])]
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ""
  const mins = Math.max(1, Math.round((Date.now() - then) / 60000))
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days} d ago`
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  })
}

/** Collapse duplicate syndicated items that share a title. */
function dedupe(articles: Article[]): Article[] {
  const seen = new Set<string>()
  return articles.filter((a) => {
    const key = (a.title ?? "").trim().toLowerCase()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** Article counts per day for the last `days` days (oldest first). */
function volumeByDay(articles: Article[], days = 14): number[] {
  const counts = new Array(days).fill(0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (const a of articles) {
    const d = new Date(a.published_at)
    if (Number.isNaN(d.getTime())) continue
    d.setHours(0, 0, 0, 0)
    const diff = Math.round((today.getTime() - d.getTime()) / 86400000)
    if (diff >= 0 && diff < days) counts[days - 1 - diff]++
  }
  return counts
}

/* ------------------------------------------------------------------ */
/*  Ambient background & global styles                                 */
/* ------------------------------------------------------------------ */

/**
 * Three softly blurred color fields drift very slowly behind the glass
 * surfaces. Animations are transform-only (GPU friendly) and disabled
 * entirely when the user prefers reduced motion.
 */
function AmbientBackground() {
  return (
    <>
      <style>{`
        @keyframes ne-drift-a {
          0%   { transform: translate(0%, 0%) scale(1); }
          33%  { transform: translate(14%, 10%) scale(1.15); }
          66%  { transform: translate(-8%, 16%) scale(0.95); }
          100% { transform: translate(0%, 0%) scale(1); }
        }
        @keyframes ne-drift-b {
          0%   { transform: translate(0%, 0%) scale(1); }
          50%  { transform: translate(-16%, -10%) scale(1.2); }
          100% { transform: translate(0%, 0%) scale(1); }
        }
        @keyframes ne-drift-c {
          0%   { transform: translate(0%, 0%) scale(1); }
          50%  { transform: translate(10%, -14%) scale(0.9); }
          100% { transform: translate(0%, 0%) scale(1); }
        }
        .ne-orb { will-change: transform; }
        @media (prefers-reduced-motion: no-preference) {
          .ne-orb-a { animation: ne-drift-a 70s ease-in-out infinite; }
          .ne-orb-b { animation: ne-drift-b 90s ease-in-out infinite; }
          .ne-orb-c { animation: ne-drift-c 80s ease-in-out infinite; }
        }
      `}</style>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="ne-orb ne-orb-a absolute -left-[15%] -top-[20%] h-[60vmax] w-[60vmax] rounded-full bg-[#4C7DFF] opacity-[0.16] blur-[110px]" />
        <div className="ne-orb ne-orb-b absolute -right-[20%] top-[15%] h-[55vmax] w-[55vmax] rounded-full bg-[#8B5CF6] opacity-[0.13] blur-[120px]" />
        <div className="ne-orb ne-orb-c absolute -bottom-[25%] left-[20%] h-[50vmax] w-[50vmax] rounded-full bg-[#2DD4BF] opacity-[0.10] blur-[120px]" />
        {/* Vignette keeps edges calm so glass panels stay readable */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,#070A12_100%)]" />
      </div>
    </>
  )
}

/** Shared glass surface recipe. */
const glass =
  "border border-white/[0.08] bg-white/[0.05] backdrop-blur-2xl " +
  "shadow-[0_8px_32px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.08)]"

/* ------------------------------------------------------------------ */
/*  Small building blocks                                              */
/* ------------------------------------------------------------------ */

function SignalBars({ score, max }: { score: number; max: number }) {
  const safeMax = Math.max(1, max)
  const level = Math.max(
    score > 0 ? 1 : 0,
    Math.min(SIGNAL_BARS, Math.round((score / safeMax) * SIGNAL_BARS))
  )
  return (
    <span
      className="inline-flex items-end gap-[3px]"
      role="img"
      aria-label={`Signal strength ${level} of ${SIGNAL_BARS}`}
      title={`Relevance score ${score} of ${max}`}
    >
      {Array.from({ length: SIGNAL_BARS }).map((_, i) => (
        <span
          key={i}
          style={{ height: 5 + i * 3 }}
          className={`w-[3px] rounded-full transition-colors ${
            i < level
              ? "bg-[#7FA0FF] shadow-[0_0_6px_rgba(76,125,255,0.6)]"
              : "bg-white/10"
          }`}
        />
      ))}
    </span>
  )
}

function TopicTag({ topic }: { topic: string }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset backdrop-blur-sm ${
        TOPIC_STYLES[topic] ?? TOPIC_STYLES.Other
      }`}
    >
      {topic}
    </span>
  )
}

function VolumeStrip({ data }: { data: number[] }) {
  const max = Math.max(1, ...data)
  return (
    <div className="flex items-end gap-1" aria-hidden="true">
      {data.map((v, i) => (
        <div
          key={i}
          style={{ height: `${Math.max(8, (v / max) * 100)}%` }}
          className={`w-1.5 rounded-sm ${
            i === data.length - 1
              ? "bg-[#7FA0FF] shadow-[0_0_8px_rgba(76,125,255,0.5)]"
              : "bg-[#4C7DFF]/30"
          }`}
          title={`${v} articles`}
        />
      ))}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="font-mono text-2xl font-medium tabular-nums text-[#F2F5FA]">
        {value}
      </p>
      <p className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-[#8A93A6]">
        {label}
      </p>
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="animate-pulse border-b border-white/[0.05] px-6 py-5 last:border-0">
      <div className="h-4 w-3/4 rounded bg-white/[0.06]" />
      <div className="mt-3 h-3 w-1/3 rounded bg-white/[0.06]" />
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4C7DFF] ${
        active
          ? "bg-gradient-to-b from-[#5D8AFF] to-[#4C7DFF] text-white shadow-[0_2px_12px_rgba(76,125,255,0.45),inset_0_1px_0_rgba(255,255,255,0.25)]"
          : "border border-white/[0.08] bg-white/[0.04] text-[#98A2B8] backdrop-blur-sm hover:bg-white/[0.08] hover:text-[#E9EDF5]"
      }`}
    >
      {children}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

type SortMode = "newest" | "score"

export default function Home() {
  const [articles, setArticles] = useState<Article[] | null>(null)
  const [error, setError] = useState(false)
  const [search, setSearch] = useState("")
  const [topic, setTopic] = useState<string | null>(null)
  const [minScore, setMinScore] = useState(0)
  const [sort, setSort] = useState<SortMode>("newest")
  const reduceMotion = useReducedMotion()

  const load = () => {
    setError(false)
    setArticles(null)
    fetch(API_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data: Article[]) => setArticles(dedupe(data ?? [])))
      .catch(() => setError(true))
  }

  useEffect(load, [])

  /* ---- Derived data ---------------------------------------------- */

  const filtered = useMemo(() => {
    if (!articles) return []
    const q = search.trim().toLowerCase()
    const result = articles.filter((a) => {
      const matchesQuery =
        !q ||
        a.title?.toLowerCase().includes(q) ||
        a.source?.toLowerCase().includes(q) ||
        (a.keywords ?? "").toLowerCase().includes(q)
      const matchesTopic = !topic || a.topic === topic
      return matchesQuery && matchesTopic && (a.score ?? 0) >= minScore
    })
    return result.sort((a, b) =>
      sort === "score"
        ? b.score - a.score ||
          +new Date(b.published_at) - +new Date(a.published_at)
        : +new Date(b.published_at) - +new Date(a.published_at)
    )
  }, [articles, search, topic, minScore, sort])

  const topSignals = useMemo(
    () =>
      [...filtered]
        .sort(
          (a, b) =>
            b.score - a.score ||
            +new Date(b.published_at) - +new Date(a.published_at)
        )
        .slice(0, 3),
    [filtered]
  )

  const maxScore = useMemo(
    () =>
      articles ? Math.max(1, ...articles.map((a) => a.score ?? 0)) : 1,
    [articles]
  )

  const scoreLevels = useMemo(
    () => (articles ? deriveScoreLevels(articles) : []),
    [articles]
  )

  const stats = useMemo(() => {
    if (!articles) return null
    const last24h = articles.filter(
      (a) => Date.now() - +new Date(a.published_at) < 86400000
    ).length
    return {
      total: articles.length,
      last24h,
      sources: new Set(articles.map((a) => a.source)).size,
      volume: volumeByDay(articles),
    }
  }, [articles])

  const fadeUp = (i = 0) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.45, delay: i * 0.06, ease: "easeOut" as const},
        }

  /* ---- Render ----------------------------------------------------- */

  return (
    <div className="min-h-screen bg-[#070A12] text-[#E9EDF5] antialiased selection:bg-[#4C7DFF]/30">
      <AmbientBackground />

      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#070A12]/55 backdrop-blur-2xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-gradient-to-b from-[#5D8AFF] to-[#4C7DFF] shadow-[0_2px_10px_rgba(76,125,255,0.5)]">
              <SignalGlyph />
            </span>
            <span className="text-sm font-semibold tracking-tight">
              News Engine
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8A93A6]">
              Digital Identity
            </span>
          </div>
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-[#8A93A6]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute h-full w-full animate-ping rounded-full bg-[#3ECFB2]/60" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-[#3ECFB2]" />
            </span>
            Live feed
          </span>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-5 pb-24">
        {/* Hero */}
        <motion.section
          {...fadeUp()}
          className="flex flex-col gap-8 py-14 md:flex-row md:items-end md:justify-between"
        >
          <div className="max-w-xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#9DB6FF]">
              EUDI · eIDAS · Trust infrastructure
            </p>
            <h1 className="mt-3 bg-gradient-to-b from-white to-[#B9C3D6] bg-clip-text text-4xl font-semibold leading-[1.08] tracking-tight text-transparent md:text-5xl">
              Every identity signal,
              <br />
              one monitor.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-[#98A2B8]">
              Continuously scanning German and European sources for digital
              identity, wallet and regulation coverage — scored for relevance
              so the strongest signals surface first.
            </p>
          </div>

          {stats && (
            <div
              className={`flex items-end gap-10 rounded-2xl px-6 py-5 ${glass}`}
            >
              <Stat label="Articles" value={stats.total} />
              <Stat label="Last 24 h" value={stats.last24h} />
              <Stat label="Sources" value={stats.sources} />
              <div className="hidden h-14 sm:block">
                <VolumeStrip data={stats.volume} />
                <p className="mt-1.5 text-[10px] uppercase tracking-[0.14em] text-[#8A93A6]">
                  14-day volume
                </p>
              </div>
            </div>
          )}
        </motion.section>

        {/* Error / loading */}
        {error && (
          <div className={`mt-4 rounded-2xl p-10 text-center ${glass}`}>
            <p className="text-sm font-medium">The feed didn’t load.</p>
            <p className="mt-1 text-sm text-[#98A2B8]">
              The backend may be waking up from sleep — this can take up to a
              minute.
            </p>
            <button
              onClick={load}
              className="mt-5 rounded-xl bg-gradient-to-b from-[#5D8AFF] to-[#4C7DFF] px-4 py-2 text-sm font-medium text-white shadow-[0_2px_16px_rgba(76,125,255,0.5),inset_0_1px_0_rgba(255,255,255,0.25)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4C7DFF]"
            >
              Retry
            </button>
          </div>
        )}

        {!articles && !error && (
          <div className={`mt-4 rounded-2xl ${glass}`}>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        )}

        {articles && !error && (
          <>
            {/* Key signals */}
            {topSignals.length > 0 && (
              <section className="mt-2">
                <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#8A93A6]">
                  Key signals
                </h2>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  {topSignals.map((a, i) => (
                    <motion.a
                      key={a.id}
                      {...fadeUp(i)}
                      href={a.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`group relative flex flex-col rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.08] hover:shadow-[0_16px_48px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4C7DFF] ${glass}`}
                    >
                      <span className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-[#E3B34B]/70 to-transparent" />
                      <div className="flex items-center justify-between">
                        <TopicTag topic={a.topic} />
                        <SignalBars score={a.score} max={maxScore} />
                      </div>
                      <h3 className="mt-4 line-clamp-3 text-[15px] font-medium leading-snug text-[#F2F5FA] group-hover:text-white">
                        {a.title}
                      </h3>
                      <p className="mt-auto pt-4 font-mono text-[11px] text-[#8A93A6]">
                        {a.source} · {timeAgo(a.published_at)}
                      </p>
                    </motion.a>
                  ))}
                </div>
              </section>
            )}

            {/* Controls — floating glass bar */}
            <section className="sticky top-[68px] z-10 mt-10">
              <div
                className={`flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3 ${glass}`}
              >
                <div className="relative min-w-[200px] flex-1">
                  <SearchGlyph />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search titles, sources, keywords…"
                    aria-label="Search articles"
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] py-2 pl-9 pr-3 text-sm text-[#E9EDF5] backdrop-blur-sm transition placeholder:text-[#8A93A6]/70 focus:border-[#4C7DFF]/60 focus:bg-white/[0.06] focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <FilterChip
                    active={topic === null}
                    onClick={() => setTopic(null)}
                  >
                    All topics
                  </FilterChip>
                  {TOPICS.map((t) => (
                    <FilterChip
                      key={t}
                      active={topic === t}
                      onClick={() => setTopic(topic === t ? null : t)}
                    >
                      {t}
                    </FilterChip>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8A93A6]">
                    Signal
                  </span>
                  <FilterChip
                    active={minScore === 0}
                    onClick={() => setMinScore(0)}
                  >
                    All
                  </FilterChip>
                  {scoreLevels.map((s) => (
                    <FilterChip
                      key={s}
                      active={minScore === s}
                      onClick={() => setMinScore(minScore === s ? 0 : s)}
                    >
                      {`≥ ${s}`}
                    </FilterChip>
                  ))}
                </div>

                <button
                  onClick={() =>
                    setSort(sort === "newest" ? "score" : "newest")
                  }
                  className="ml-auto rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.1em] text-[#98A2B8] backdrop-blur-sm transition hover:bg-white/[0.08] hover:text-[#E9EDF5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4C7DFF]"
                >
                  Sort: {sort === "newest" ? "Newest" : "Signal"}
                </button>
              </div>
            </section>

            {/* Feed — one large glass panel */}
            <section aria-label="Article feed" className="mt-6">
              {filtered.length === 0 ? (
                <div className={`rounded-2xl py-20 text-center ${glass}`}>
                  <p className="text-sm font-medium">No matching articles.</p>
                  <p className="mt-1 text-sm text-[#98A2B8]">
                    Clear the search or lower the signal filter to see more.
                  </p>
                </div>
              ) : (
                <ul className={`overflow-hidden rounded-2xl ${glass}`}>
                  {filtered.map((a) => (
                    <li
                      key={a.id}
                      className="border-b border-white/[0.05] last:border-0"
                    >
                      <a
                        href={a.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-start gap-4 px-6 py-5 transition-colors duration-200 hover:bg-white/[0.05] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#4C7DFF] sm:items-center"
                      >
                        <div className="w-10 shrink-0 pt-1 sm:pt-0">
                          <SignalBars score={a.score} max={maxScore} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-[15px] font-medium leading-snug text-[#E9EDF5] group-hover:text-white sm:truncate">
                            {a.title}
                          </h3>
                          <p className="mt-1 font-mono text-[11px] text-[#8A93A6]">
                            {a.source} · {timeAgo(a.published_at)}
                          </p>
                        </div>
                        <div className="hidden shrink-0 sm:block">
                          <TopicTag topic={a.topic} />
                        </div>
                        <ArrowGlyph />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-6 font-mono text-[11px] text-[#8A93A6]">
                {filtered.length} of {articles.length} articles
              </p>
            </section>
          </>
        )}
      </main>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Inline glyphs (no icon dependency)                                 */
/* ------------------------------------------------------------------ */

function SignalGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <rect x="1" y="7" width="2" height="4" rx="1" fill="white" />
      <rect x="5" y="4" width="2" height="7" rx="1" fill="white" />
      <rect x="9" y="1" width="2" height="10" rx="1" fill="white" />
    </svg>
  )
}

function SearchGlyph() {
  return (
    <svg
      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8A93A6]"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

function ArrowGlyph() {
  return (
    <svg
      className="mt-1 shrink-0 text-[#8A93A6] transition group-hover:translate-x-0.5 group-hover:text-[#7FA0FF] sm:mt-0"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M7 17 17 7M8 7h9v9" />
    </svg>
  )
}
