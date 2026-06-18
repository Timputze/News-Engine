"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts"

const API_URL = "https://news-engine-backend.onrender.com"

export default function Home() {
  const [articles, setArticles] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [minScore, setMinScore] = useState(0)

  useEffect(() => {
    fetch(API_URL)
      .then(res => res.json())
      .then(data => setArticles(data))
  }, [])

  const maxScore = Math.max(...articles.map(a => a.score || 0), 0)

  const filtered = articles.filter(a =>
    (a.title.toLowerCase().includes(search.toLowerCase()) ||
      (a.keywords || "").toLowerCase().includes(search.toLowerCase())) &&
    a.score >= minScore
  )

  const top3 = [...filtered].sort((a, b) => b.score - a.score).slice(0, 3)

  const getScoreColor = (score: number) => {
    if (score >= maxScore * 0.8) return "bg-green-500"
    if (score >= maxScore * 0.5) return "bg-yellow-400"
    return "bg-red-400"
  }

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
    <div className="relative min-h-screen overflow-hidden text-black">

      {/* 🌌 BACKGROUND */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            "radial-gradient(circle at 20% 30%, #ffffff, #e9ecff, #f5f7fa)",
            "radial-gradient(circle at 80% 20%, #f0f3ff, #dde3ff, #f7f8fa)",
            "radial-gradient(circle at 50% 80%, #ffffff, #e9ecff, #f5f7fa)"
          ]
        }}
        transition={{ duration: 12, repeat: Infinity }}
      />

      {/* ✨ GLOW ORBS */}
      <motion.div
        className="absolute w-[700px] h-[700px] bg-blue-300 rounded-full blur-[160px] opacity-40"
        animate={{ x: [0, 200, 0], y: [0, 100, 0] }}
        transition={{ duration: 20, repeat: Infinity }}
      />

      <motion.div
        className="absolute w-[700px] h-[700px] bg-purple-300 rounded-full blur-[160px] opacity-40"
        animate={{ x: [0, -200, 0], y: [0, -100, 0] }}
        transition={{ duration: 25, repeat: Infinity }}
      />

      <div className="absolute inset-0 backdrop-blur-[80px]" />

      <div className="relative flex min-h-screen">

        {/* SIDEBAR */}
        <div className="w-64 px-6 py-8 bg-white/20 backdrop-blur-3xl border-r border-white/30 shadow-xl">

          <h2 className="text-lg font-semibold mb-6">Control</h2>

          <input
            placeholder="Search intelligence..."
            className="w-full mb-4 px-3 py-2 rounded-lg bg-white/60 border text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <p className="text-xs text-gray-500 mb-2">
            Signal Threshold: {minScore} – {maxScore}
          </p>

          <input
            type="range"
            min={0}
            max={maxScore}
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
            className="w-full accent-black"
          />

        </div>

        {/* MAIN */}
        <div className="flex-1 px-12 py-10 space-y-14">

          {/* 🚀 HERO (BIGGER + BETTER) */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h1 className="text-6xl font-semibold leading-tight tracking-tight">
              Digital Identity <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500">
                News Engine
              </span>
            </h1>

            <p className="text-gray-500 mt-6 max-w-xl text-lg">
              Monitor, filter, and analyze digital identity developments across
              regulation, wallets, and authentication ecosystems in real time.
            </p>
          </motion.div>

          {/* ⭐ TOP 3 ARTICLES */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Top Signals</h2>

            <div className="grid grid-cols-3 gap-6">
              {top3.map((a, i) => (
                <motion.div
                  key={i}
                  whileHover={{ y: -12, scale: 1.05 }}
                >
                  <Card className="
                    relative
                    bg-white/25 backdrop-blur-3xl
                    border border-white/30
                    rounded-2xl
                    shadow-xl
                  ">
                    <CardContent className="p-6">

                      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent" />

                      <h3 className="text-base font-semibold">
                        {a.title}
                      </h3>

                      <p className="text-xs text-gray-500 mt-2">
                        {a.source}
                      </p>

                      <Badge className={`${getScoreColor(a.score)} text-white mt-3`}>
                        Score {a.score}
                      </Badge>

                      <Button className="mt-4 w-full" onClick={() => window.open(a.link)}>
                        Open
                      </Button>

                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          {/* CHART */}
          <Card className="relative bg-white/25 backdrop-blur-3xl border border-white/30 rounded-2xl shadow-xl">
            <CardContent className="p-5 h-64">

              <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent" />

              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="topic" />
                  <Tooltip />
                  <Bar dataKey="count" fill="#111" radius={[8,8,0,0]} />
                </BarChart>
              </ResponsiveContainer>

            </CardContent>
          </Card>

          {/* ALL ARTICLES */}
          <div className="grid grid-cols-3 gap-8">
            {filtered.map((a, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -10, scale: 1.04 }}
              >
                <Card className="
                  relative
                  bg-white/20 backdrop-blur-3xl
                  border border-white/30
                  rounded-2xl
                  shadow-lg
                  hover:shadow-[0_40px_120px_rgba(0,0,0,0.3)]
                  transition-all
                ">
                  <CardContent className="p-5">

                    <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent" />

                    <h2 className="text-sm font-semibold">
                      {a.title}
                    </h2>

                    <div className="mt-2 flex gap-2 text-xs text-gray-500">
                      <span>{a.source}</span>

                      <Badge className={`${getScoreColor(a.score)} text-white`}>
                        {a.score}
                      </Badge>
                    </div>

                    <Button className="mt-4 w-full" onClick={() => window.open(a.link)}>
                      Open
                    </Button>

                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

        </div>
      </div>
    </div>
  )
}
