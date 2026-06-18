"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts"

const API_URL = "https://news-engine-backend.onrender.com/articles"

export default function Home() {
  const [articles, setArticles] = useState<any[] | null>(null)
  const [search, setSearch] = useState("")
  const [minScore, setMinScore] = useState(0)

  useEffect(() => {
    fetch(API_URL)
      .then(res => res.json())
      .then(data => setArticles(data || []))
      .catch(() => setArticles([]))
  }, [])

  if (!articles) return <div className="p-10">Loading…</div>

  const scores = articles.map(a => a.score || 0)
  const maxScore = scores.length ? Math.max(...scores) : 1

  const filtered = articles.filter(a =>
    (a.title?.toLowerCase().includes(search.toLowerCase()) ||
      (a.keywords || "").toLowerCase().includes(search.toLowerCase())) &&
    a.score >= minScore
  )

  const top3 = [...filtered].sort((a, b) => b.score - a.score).slice(0, 3)

  const topicCounts: Record<string, number> = {}
  filtered.forEach(a => {
    const topic = a.topic || "Other"
    topicCounts[topic] = (topicCounts[topic] || 0) + 1
  })

  const chartData = Object.entries(topicCounts).map(([k, v]) => ({
    topic: k,
    count: v
  }))

  return (
    <div className="min-h-screen relative overflow-hidden text-black">

      {/* ✅ MULTI-LAYER BACKGROUND */}
      <div className="absolute inset-0 bg-[#0f172a]" />

      <motion.div
        className="absolute inset-0 opacity-60"
        animate={{
          background: [
            "radial-gradient(circle at 20% 20%, #3b82f6, transparent 40%)",
            "radial-gradient(circle at 80% 30%, #a855f7, transparent 40%)",
            "radial-gradient(circle at 50% 80%, #3b82f6, transparent 40%)"
          ]
        }}
        transition={{ duration: 10, repeat: Infinity }}
      />

      <div className="relative z-10">

        {/* NAV */}
        <div className="h-16 flex items-center justify-between px-10 border-b border-white/10 bg-white/10 backdrop-blur-xl">
          <h1 className="text-white font-semibold">
            Digital Identity News Engine
          </h1>
        </div>

        <div className="flex">

          {/* SIDEBAR */}
          <div className="w-64 p-6 bg-white/10 backdrop-blur-xl border-r border-white/10 space-y-6 text-white">
            <input
              className="w-full px-3 py-2 rounded bg-white/20"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <input
              type="range"
              min={0}
              max={maxScore}
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
            />
          </div>

          {/* MAIN */}
          <div className="flex-1 p-12 space-y-10 text-white">

            <h1 className="text-5xl font-semibold">
              Digital Identity Intelligence
            </h1>

            {/* CARDS */}
            <div className="grid grid-cols-3 gap-6">
              {filtered.map((a, i) => (
                <motion.div
                  key={i}
                  whileHover={{
                    y: -8,
                    scale: 1.03,
                    boxShadow: "0 20px 60px rgba(0,0,0,0.4)"
                  }}
                  className="
                    relative
                    bg-white/10
                    backdrop-blur-2xl
                    border border-white/20
                    rounded-xl
                    p-5
                  "
                >
                  {/* glass highlight */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl pointer-events-none" />

                  <h3>{a.title}</h3>

                  <p className="text-xs mt-2 text-gray-300">
                    Score: {a.score}
                  </p>

                  <div className="flex gap-2 mt-2 flex-wrap">
                    {a.keywords?.split(",").slice(0, 3).map((k: string, idx: number) => (
                      <span key={idx} className="text-xs bg-white/20 px-2 py-1 rounded">
                        {k.trim()}
                      </span>
                    ))}
                  </div>

                  <button
                    className="mt-3 underline text-sm"
                    onClick={() => window.open(a.link)}
                  >
                    Open →
                  </button>
                </motion.div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
