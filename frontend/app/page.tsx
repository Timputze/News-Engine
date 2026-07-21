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

/*  Palette (from the reference):
    mint   #55D396   green  #169A50   surface #272C2A
    black  #040605   white  #FFFFFF                       */

const TOPIC_STYLES: Record<string, string> = {
  Wallet: "bg-[#55D396]/15 text-[#8FE7BD] ring-[#55D396]/30",
  Regulation: "bg-white/[0.07] text-[#E6EAE7] ring-white/15",
  Verification: "bg-[#169A50]/20 text-[#5FCE93] ring-[#169A50]/40",
  "Public Sector": "bg-[#B8D8C4]/10 text-[#B8D8C4] ring-[#B8D8C4]/25",
  Other: "bg-white/[0.05] text-[#93A09A] ring-white/10",
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
 * Loads General Sans (via Fontshare) and renders the black→green aurora:
 * a strong glow rising from the bottom plus two slowly drifting green
 * fields. Transform-only animations, disabled for reduced motion.
 */
function AmbientBackground() {
  return (
    <>
      <style>{`
        @import url('https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600&display=swap');

        @keyframes ne-drift-a {
          0%   { transform: translate(0%, 0%) scale(1); }
          50%  { transform: translate(12%, -8%) scale(1.15); }
          100% { transform: translate(0%, 0%) scale(1); }
        }
        @keyframes ne-drift-b {
          0%   { transform: translate(0%, 0%) scale(1); }
          50%  { transform: translate(-10%, -12%) scale(1.1); }
          100% { transform: translate(0%, 0%) scale(1); }
        }
        .ne-orb { will-change: transform; }
        @media (prefers-reduced-motion: no-preference) {
          .ne-orb-a { animation: ne-drift-a 75s ease-in-out infinite; }
          .ne-orb-b { animation: ne-drift-b 95s ease-in-out infinite; }
        }
      `}</style>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        {/* The rising green glow from the reference */}
        <div className="absolute inset-x-0 bottom-0 h-[70%] bg-[radial-gradient(120%_90%_at_50%_110%,rgba(22,154,80,0.45)_0%,rgba(45,212,191,0.12)_45%,transparent_70%)]" />
        {/* Drifting fields for gentle movement */}
        <div className="ne-orb ne-orb-a absolute -bottom-[30%] -left-[15%] h-[55vmax] w-[55vmax] rounded-full bg-[#169A50] opacity-[0.18] blur-[120px]" />
        <div className="ne-orb ne-orb-b absolute -bottom-[35%] right-[0%] h-[50vmax] w-[50vmax] rounded-full bg-[#2DD4BF] opacity-[0.10] blur-[130px]" />
        {/* Vignette keeps the top calm and text readable */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#040605_0%,transparent_50%)]" />
      </div>
    </>
  )
}

/** Shared glass surface recipe, tinted to the #272C2A surface tone. */
const glass =
  "border border-white/[0.08] bg-[#272C2A]/40 backdrop-blur-2xl " +
  "shadow-[0_8px_32px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.07)]"

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
              ? "bg-[#55D396] shadow-[0_0_6px_rgba(85,211,150,0.6)]"
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
              ? "bg-[#55D396] shadow-[0_0_8px_rgba(85,211,150,0.5)]"
              : "bg-[#169A50]/40"
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
      <p className="font-mono text-2xl font-medium tabular-nums text-white">
        {value}
      </p>
      <p className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-[#93A09A]">
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
      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55D396] ${
        active
          ? "bg-gradient-to-b from-[#63DCA1] to-[#3CBE7F] text-[#04160C] shadow-[0_2px_14px_rgba(85,211,150,0.45),inset_0_1px_0_rgba(255,255,255,0.35)]"
          : "border border-white/[0.08] bg-white/[0.04] text-[#93A09A] backdrop-blur-sm hover:bg-white/[0.08] hover:text-[#E6EAE7]"
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
          transition: {
            duration: 0.45,
            delay: i * 0.06,
            ease: "easeOut" as const,
          },
        }

  /* ---- Render ----------------------------------------------------- */

  return (
    <div
      className="min-h-screen bg-[#040605] text-[#E6EAE7] antialiased selection:bg-[#55D396]/30"
      style={{
        fontFamily:
          "'General Sans', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
      }}
    >
      <AmbientBackground />

      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#040605]/55 backdrop-blur-2xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-gradient-to-b from-[#63DCA1] to-[#3CBE7F] shadow-[0_2px_10px_rgba(85,211,150,0.5)]">
              <SignalGlyph />
            </span>
            <span className="text-sm font-semibold tracking-tight">
              News Engine
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#93A09A]">
              Digital Identity
            </span>
          </div>
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-[#93A09A]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute h-full w-full animate-ping rounded-full bg-[#55D396]/60" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-[#55D396]" />
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
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#8FE7BD]">
              EUDI · eIDAS · Trust infrastructure
            </p>
            <h1 className="mt-3 bg-gradient-to-b from-white to-[#CDE9DA] bg-clip-text text-4xl font-medium leading-[1.08] tracking-tight text-transparent md:text-5xl">
              Every identity signal,
              <br />
              one monitor.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-[#93A09A]">
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
                <p className="mt-1.5 text-[10px] uppercase tracking-[0.14em] text-[#93A09A]">
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
            <p className="mt-1 text-sm text-[#93A09A]">
              The backend may be waking up from sleep — this can take up to a
              minute.
            </p>
            <button
              onClick={load}
              className="mt-5 rounded-xl bg-gradient-to-b from-[#63DCA1] to-[#3CBE7F] px-4 py-2 text-sm font-medium text-[#04160C] shadow-[0_2px_16px_rgba(85,211,150,0.5),inset_0_1px_0_rgba(255,255,255,0.35)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55D396]"
            >
              Retry
            </button>
          </div>
        )}

        {!articles && !error && (
          <div className={`mt-4 overflow-hidden rounded-2xl ${glass}`}>
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
                <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#93A09A]">
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
                      className={`group relative flex flex-col rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:bg-[#272C2A]/60 hover:shadow-[0_16px_48px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55D396] ${glass}`}
                    >
                      <span className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-[#55D396]/70 to-transparent" />
                      <div className="flex items-center justify-between">
                        <TopicTag topic={a.topic} />
                        <SignalBars score={a.score} max={maxScore} />
                      </div>
                      <h3 className="mt-4 line-clamp-3 text-[15px] font-medium leading-snug text-white/90 group-hover:text-white">
                        {a.title}
                      </h3>
                      <p className="mt-auto pt-4 font-mono text-[11px] text-[#93A09A]">
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
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] py-2 pl-9 pr-3 text-sm text-[#E6EAE7] backdrop-blur-sm transition placeholder:text-[#93A09A]/70 focus:border-[#55D396]/60 focus:bg-white/[0.06] focus:outline-none"
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
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#93A09A]">
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
                  className="ml-auto rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.1em] text-[#93A09A] backdrop-blur-sm transition hover:bg-white/[0.08] hover:text-[#E6EAE7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55D396]"
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
                  <p className="mt-1 text-sm text-[#93A09A]">
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
                        className="group flex items-start gap-4 px-6 py-5 transition-colors duration-200 hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#55D396] sm:items-center"
                      >
                        <div className="w-10 shrink-0 pt-1 sm:pt-0">
                          <SignalBars score={a.score} max={maxScore} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-[15px] font-medium leading-snug text-[#E6EAE7] group-hover:text-white sm:truncate">
                            {a.title}
                          </h3>
                          <p className="mt-1 font-mono text-[11px] text-[#93A09A]">
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
              <p className="mt-6 font-mono text-[11px] text-[#93A09A]">
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
      <rect x="1" y="7" width="2" height="4" rx="1" fill="#04160C" />
      <rect x="5" y="4" width="2" height="7" rx="1" fill="#04160C" />
      <rect x="9" y="1" width="2" height="10" rx="1" fill="#04160C" />
    </svg>
  )
}

function SearchGlyph() {
  return (
    <svg
      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#93A09A]"
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
      className="mt-1 shrink-0 text-[#93A09A] transition group-hover:translate-x-0.5 group-hover:text-[#55D396] sm:mt-0"
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
