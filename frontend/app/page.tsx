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

  if (!articles) return <div className="p-10 text-gray-600">Loading…</div>

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

      {/* ✅ STRONG BACKGROUND */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#dbeafe] via-[#f8fafc] to-[#ede9fe]" />

      {/* ✅ VISIBLE COLOR BLOBS */}
      <div className="absolute top-[-150px] left-[-150px] w-[500px] h-[500px] bg-blue-500 opacity-40 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-150px] right-[-150px] w-[500px] h-[500px] bg-purple-500 opacity-40 blur-[120px] rounded-full" />

      <div className="relative z-10">

        {/* NAVBAR */}
        <div className="h-16 flex items-center justify-between px-10 border-b bg-white/70 backdrop-blur-lg">
          <h1 className="font-semibold text-lg">
            Digital Identity News Engine
          </h1>

          <div className="flex gap-8 text-sm text-gray-700">
            <span className="font-medium">Dashboard</span>
            <span>Insights</span>
          </div>
        </div>

        <div className="flex">

          {/* SIDEBAR */}
          <div className="w-64 p-6 border-r bg-white/50 backdrop-blur-lg space-y-8">

            <input
              className="w-full px-3 py-2 rounded-md bg-white border text-sm"
              placeholder="Search articles..."
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
          <div className="flex-1 p-12 space-y-12">

            <h1 className="text-5xl font-semibold">
              Digital Identity Intelligence
              <span className="block text-blue-600">
                News Dashboard
              </span>
            </h1>

            {/* TOP ARTICLES */}
            <div className="grid grid-cols-3 gap-6">
              {top3.map((a, i) => (
                <div
                  key={i}
                  className="
                    bg-white/20
                    backdrop-blur-xl
                    border border-white/60
                    rounded-xl
                    p-5
                    shadow-[0_20px_80px_rgba(0,0,0,0.2)]
                  "
                >
                  <h3 className="text-sm font-semibold">
                    {a.title}
                  </h3>
                </div>
              ))}
            </div>

            {/* CHART */}
            <div className="
              bg-white/20
              backdrop-blur-xl
              border border-white/60
              rounded-xl
              p-6
              shadow-[0_20px_80px_rgba(0,0,0,0.2)]
            ">
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="topic" />
                    <Tooltip />
                    <Bar dataKey="count" fill="#4f46e5" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ✅ ALL ARTICLES */}
            <div className="grid grid-cols-3 gap-6">
              {filtered.map((a, i) => (
                <div
                  key={i}
                  className="
                    bg-white/20
                    backdrop-blur-xl
                    border border-white/60
                    rounded-xl
                    p-5
                    shadow-[0_20px_80px_rgba(0,0,0,0.2)]
                  "
                >
                  <h3 className="text-sm font-semibold">
                    {a.title}
                  </h3>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
