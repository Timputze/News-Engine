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
  const [articles, setArticles] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [minScore, setMinScore] = useState(0)

  useEffect(() => {
    fetch(API_URL)
      .then(res => res.json())
      .then(data => setArticles(data || []))
      .catch(() => setArticles([]))
  }, [])

  // ✅ SAFE maxScore
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

  // ✅ SAFE chart
  const topicCounts: Record<string, number> = {}
  filtered.forEach(a => {
    const topic = a?.topic || "Other"
    topicCounts[topic] = (topicCounts[topic] || 0) + 1
  })

  const chartData = Object.entries(topicCounts).map(([k, v]) => ({
    topic: k,
    count: v
  }))

  return (
    <div className="relative min-h-screen text-black">

      {/* fallback loading */}
      {articles.length === 0 && (
        <div className="p-10 text-gray-500">
          Loading data...
        </div>
      )}

      {articles.length > 0 && (
        <div className="p-10 space-y-10">

          <h1 className="text-4xl font-semibold">
            Identity Intelligence Engine
          </h1>

          {/* slider */}
          <div>
            <p className="text-sm">
              Score: {minScore} – {maxScore}
            </p>

            <input
              type="range"
              min={0}
              max={maxScore}
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
            />
          </div>

          {/* top 3 */}
          <div className="grid grid-cols-3 gap-4">
            {top3.map((a, i) => (
              <Card key={i}>
                <CardContent>
                  <h3>{a.title}</h3>
                  <Badge className={getScoreColor(a.score)}>
                    {a.score}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* chart */}
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

        </div>
      )}

    </div>
  )
}
