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

  // ✅ LOADING STATE (premium)
  if (articles === null) {
    return (
      <div className="p-10 space-y-6">
        <div className="h-10 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  // ✅ EMPTY STATE
  if (articles.length === 0) {
    return (
      <div className="p-10 text-gray-500">
        No articles found.
      </div>
    )
  }

  const scores = articles.map(a => a.score || 0)
  const maxScore = scores.length > 0 ? Math.max(...scores) : 1

  const filtered = articles.filter(a =>
    (a.title?.toLowerCase().includes(search.toLowerCase()) ||
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-10 space-y-10"
    >

      {/* HERO */}
      <div>
        <h1 className="text-4xl font-semibold">
          Identity Intelligence Engine
        </h1>
        <p className="text-gray-500 mt-2">
          Real-time monitoring of digital identity trends
        </p>
      </div>

      {/* FILTER */}
      <div>
        <input
          placeholder="Search..."
          className="border px-3 py-2 rounded mr-4"
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

      {/* TOP 3 */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Top Signals</h2>

        <div className="grid grid-cols-3 gap-4">
          {top3.map((a, i) => (
            <motion.div key={i} whileHover={{ scale: 1.03 }}>
              <Card>
                <CardContent>
                  <h3>{a.title}</h3>
                  <Badge className={getScoreColor(a.score)}>
                    {a.score}
                  </Badge>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* CHART */}
      <Card>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="topic" />
              <Tooltip />
              <Bar dataKey="count" fill="#111" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* GRID */}
      <div className="grid grid-cols-3 gap-6">
        {filtered.map((a, i) => (
          <motion.div key={i} whileHover={{ y: -5 }}>
            <Card>
              <CardContent>
                <h2>{a.title}</h2>
                <Badge className={getScoreColor(a.score)}>
                  {a.score}
                </Badge>

                <Button
                  className="mt-3 w-full"
                  onClick={() => window.open(a.link)}
                >
                  Open
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

    </motion.div>
  )
}
