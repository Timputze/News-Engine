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

  if (!articles) return <div className="p-10 text-gray-500">Loading…</div>

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

  const avgScore =
    filtered.length > 0
      ? (filtered.reduce((acc, a) => acc + a.score, 0) / filtered.length).toFixed(1)
      : 0

  return (
    <div className="min-h-screen text-black relative">

      {/* ✅ BACKGROUND (depth + glow) */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,#ffffff,#eef2ff,#f5f7fa)]" />

      <div className="absolute top-[-100px] left-[-100px] w-[400px] h-[400px] bg-blue-200 opacity-40 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-120px] right-[-100px] w-[400px] h-[400px] bg-purple-200 opacity-40 blur-[120px] rounded-full" />

      <div className="relative">

        {/* ✅ NAVBAR */}
        <div className="h-16 flex items-center justify-between px-10 border-b bg-white/70 backdrop-blur-md">
          <h1 className="font-semibold tracking-tight">
            Identity Engine
          </h1>

          <div className="flex gap-8 text-sm text-gray-500">
            <span className="text-black font-medium">Dashboard</span>
            <span className="hover:text-black cursor-pointer">Signals</span>
            <span className="hover:text-black cursor-pointer">Insights</span>
          </div>
        </div>

        <div className="flex">

          {/* ✅ SIDEBAR */}
          <div className="w-64 p-6 border-r bg-white/60 backdrop-blur-md space-y-8">

            <div>
              <p className="text-xs text-gray-400 mb-2 uppercase">
                Search
              </p>
              <input
                className="w-full px-3 py-2 rounded-md bg-white border text-sm focus:ring-2 focus:ring-black/10"
                placeholder="Search signals..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div>
              <p className="text-xs text-gray-400 mb-2 uppercase">
                Score Threshold
              </p>
              <input
                type="range"
                min={0}
                max={maxScore}
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                {minScore} – {maxScore}
              </p>
            </div>

          </div>

          {/* ✅ MAIN */}
          <div className="flex-1 p-12 space-y-14">

            {/* HERO */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h1 className="text-5xl font-semibold tracking-tight leading-tight">
                Identity Intelligence
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                  Signal Engine
                </span>
              </h1>

              <p className="text-gray-500 mt-3 max-w-xl text-lg">
                Monitor digital identity ecosystems, regulatory shifts,
                and authentication trends in real time.
              </p>
            </motion.div>

            {/* KPIs */}
            <div className="grid grid-cols-3 gap-6">

              {[ 
                { label: "Articles", value: filtered.length },
                { label: "Avg Score", value: avgScore },
                { label: "Topics", value: Object.keys(topicCounts).length }
              ].map((kpi, i) => (
                <motion.div
                  key={i}
                  whileHover={{ y: -3 }}
                  className="bg-white/70 backdrop-blur-md p-6 rounded-xl border border-white/40 shadow-[0_8px_25px_rgba(0,0,0,0.05)]"
                >
                  <p className="text-xs text-gray-400 uppercase">
                    {kpi.label}
                  </p>
                  <p className="text-3xl font-semibold mt-2">
                    {kpi.value}
                  </p>
                </motion.div>
              ))}

            </div>

            {/* TOP SIGNALS */}
            <div>
              <h2 className="text-lg font-semibold mb-6">
                Top Signals
              </h2>

              <div className="grid grid-cols-3 gap-6">
                {top3.map((a, i) => (
                  <motion.div
                    key={i}
                    whileHover={{ y: -4, scale: 1.02 }}
                    className="bg-white/70 backdrop-blur-md p-5 rounded-xl border border-white/40 shadow-sm"
                  >
                    <h3 className="text-sm font-semibold leading-snug">
                      {a.title}
                    </h3>

                    <p className="text-xs text-gray-500 mt-2">
                      {a.source}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* CHART */}
            <div className="bg-white/70 backdrop-blur-md p-6 rounded-xl border border-white/40 shadow-sm">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="topic" />
                    <Tooltip />
                    <Bar dataKey="count" fill="#111" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ALL SIGNALS */}
            <div>
              <h2 className="text-lg font-semibold mb-6">
                All Signals
              </h2>

              <div className="grid grid-cols-3 gap-6">
                {filtered.map((a, i) => (
                  <motion.div
                    key={i}
                    whileHover={{ y: -3 }}
                    className="bg-white/60 backdrop-blur-md p-5 rounded-xl border border-white/40 shadow-sm"
                  >
                    <h2 className="text-sm font-semibold leading-snug">
                      {a.title}
                    </h2>

                    <button
                      className="mt-4 text-sm text-blue-600 hover:underline"
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
    </div>
  )
}
