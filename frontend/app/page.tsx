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

  if (!articles) return <div className="p-10">Loading...</div>

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
    <div className="min-h-screen bg-[#f8f9fb] text-black">

      {/* ✅ NAVBAR */}
      <div className="h-16 flex items-center justify-between px-10 border-b bg-white">
        <h1 className="font-semibold text-lg">Identity Engine</h1>

        <div className="flex gap-6 text-sm text-gray-500">
          <span className="text-black">Dashboard</span>
          <span>Signals</span>
          <span>Insights</span>
        </div>
      </div>

      <div className="flex">

        {/* ✅ SIDEBAR */}
        <div className="w-64 p-6 border-r bg-white space-y-8">

          <div>
            <p className="text-xs text-gray-400 mb-2">Search</p>
            <input
              className="w-full px-3 py-2 border rounded-md text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-2">Score Threshold</p>
            <input
              type="range"
              min={0}
              max={maxScore}
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="w-full"
            />
          </div>

        </div>

        {/* ✅ MAIN */}
        <div className="flex-1 p-10 space-y-12">

          {/* ✅ HERO */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h1 className="text-4xl font-semibold tracking-tight">
              Identity Intelligence
            </h1>
            <p className="text-gray-500 mt-2 max-w-xl">
              Monitor and analyze digital identity developments across regulation,
              wallets, and authentication ecosystems.
            </p>
          </motion.div>

          {/* ✅ KPIs */}
          <div className="grid grid-cols-3 gap-6">

            <div className="bg-white p-5 rounded-lg border">
              <p className="text-xs text-gray-400">Articles</p>
              <p className="text-2xl font-semibold mt-1">{filtered.length}</p>
            </div>

            <div className="bg-white p-5 rounded-lg border">
              <p className="text-xs text-gray-400">Avg Score</p>
              <p className="text-2xl font-semibold mt-1">{avgScore}</p>
            </div>

            <div className="bg-white p-5 rounded-lg border">
              <p className="text-xs text-gray-400">Topics</p>
              <p className="text-2xl font-semibold mt-1">
                {Object.keys(topicCounts).length}
              </p>
            </div>

          </div>

          {/* ✅ TOP 3 */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Top Signals</h2>

            <div className="grid grid-cols-3 gap-6">
              {top3.map((a, i) => (
                <motion.div
                  key={i}
                  whileHover={{ y: -4 }}
                  className="bg-white p-5 rounded-lg border"
                >
                  <h3 className="text-sm font-semibold">{a.title}</h3>
                  <p className="text-xs text-gray-500 mt-2">{a.source}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* ✅ CHART */}
          <div className="bg-white p-6 rounded-lg border">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="topic" />
                  <Tooltip />
                  <Bar dataKey="count" fill="#111" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ✅ ARTICLES */}
          <div>
            <h2 className="text-lg font-semibold mb-4">All Signals</h2>

            <div className="grid grid-cols-3 gap-6">
              {filtered.map((a, i) => (
                <motion.div
                  key={i}
                  whileHover={{ y: -3 }}
                  className="bg-white p-4 rounded-lg border"
                >
                  <h2 className="text-sm font-semibold">{a.title}</h2>

                  <button
                    className="mt-3 text-sm text-blue-600"
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
