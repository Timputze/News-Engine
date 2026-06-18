"use client"

import { useEffect, useState } from "react"
import { motion, useMotionValue, useTransform } from "framer-motion"
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

  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  useEffect(() => {
    const move = (e: MouseEvent) => {
      mouseX.set(e.clientX)
      mouseY.set(e.clientY)
    }
    window.addEventListener("mousemove", move)
    return () => window.removeEventListener("mousemove", move)
  }, [])

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

  const avgScore =
    filtered.length > 0
      ? (filtered.reduce((acc, a) => acc + a.score, 0) / filtered.length).toFixed(1)
      : 0

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

      {/* ✅ BACKGROUND */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            "linear-gradient(120deg, #c7d2fe, #e0f2fe, #e9d5ff)",
            "linear-gradient(120deg, #e0f2fe, #eef2ff, #f3e8ff)",
            "linear-gradient(120deg, #c7d2fe, #e0f2fe, #e9d5ff)"
          ]
        }}
        transition={{ duration: 12, repeat: Infinity }}
      />

      {/* ✅ CURSOR GLOW */}
      <motion.div
        className="pointer-events-none fixed w-[400px] h-[400px] bg-blue-400 opacity-20 blur-[120px] rounded-full"
        style={{
          x: mouseX,
          y: mouseY,
          translateX: "-50%",
          translateY: "-50%"
        }}
      />

      <div className="relative z-10">

        {/* NAV */}
        <div className="h-16 flex items-center justify-between px-10 border-b bg-white/30 backdrop-blur-xl">
          <h1 className="font-semibold">Digital Identity News Engine</h1>
        </div>

        <div className="flex">

          {/* SIDEBAR */}
          <div className="w-64 p-6 bg-white/20 backdrop-blur-xl border-r space-y-6">
            <input
              placeholder="Search..."
              className="w-full px-3 py-2 rounded bg-white/70 border"
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

            {/* HERO */}
            <h1 className="text-5xl font-semibold">
              Digital Identity Intelligence
              <span className="block text-blue-600">News Dashboard</span>
            </h1>

            {/* ✅ KPI ROW */}
            <div className="grid grid-cols-3 gap-6">
              {[
                { label: "Articles", value: filtered.length },
                { label: "Avg Score", value: avgScore },
                { label: "Topics", value: Object.keys(topicCounts).length }
              ].map((kpi, i) => (
                <motion.div
                  key={i}
                  whileHover={{ y: -5, scale: 1.02 }}
                  className="bg-white/20 backdrop-blur-2xl border border-white/40 rounded-xl p-6 shadow-xl"
                >
                  <p className="text-xs text-gray-700">{kpi.label}</p>
                  <p className="text-2xl font-semibold mt-2 text-blue-600">
                    {kpi.value}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* ✅ TOP 3 */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Top Articles</h2>

              <div className="grid grid-cols-3 gap-6">
                {top3.map((a, i) => (
                  <motion.div
                    key={i}
                    whileHover={{ y: -8, scale: 1.03 }}
                    className="bg-white/20 backdrop-blur-2xl border border-white/40 rounded-xl p-6 shadow-xl"
                  >
                    <h3 className="font-semibold">{a.title}</h3>
                    <p className="text-xs mt-2">{a.source}</p>
                    <p className="text-xs mt-2 text-blue-600">
                      Score: {a.score}
                    </p>

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

            {/* CHART */}
            <div className="bg-white/20 backdrop-blur-2xl p-6 rounded-xl">
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
              {filtered.map((a, i) => {

                const rotateX = useTransform(mouseY, [0, 1000], [10, -10])
                const rotateY = useTransform(mouseX, [0, 1000], [-10, 10])


                return (
                  <motion.div
                    key={i}
                    style={{ rotateX, rotateY }}
                    whileHover={{ scale: 1.05 }}
                    className="bg-white/20 backdrop-blur-2xl border border-white/40 rounded-xl p-5 shadow-xl"
                  >
                    <h3 className="text-sm font-semibold">{a.title}</h3>

                    <p className="text-xs mt-2">{a.source}</p>

                    <p className="text-xs mt-2 text-blue-600">
                      Score: {a.score}
                    </p>

                    <div className="flex gap-2 mt-2 flex-wrap">
                      {(a.keywords || "").split(",").slice(0, 3).map((k: string, idx: number) => (
                        <span key={idx} className="text-xs bg-blue-100 px-2 py-1 rounded">
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
                )
              })}
            </div>

          </div> {/* MAIN */}
        </div> {/* FLEX */}
      </div> {/* CONTENT */}
    </div>
  )
}
