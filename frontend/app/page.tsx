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

import { Card, CardContent, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const API_URL = "https://news-engine-backend.onrender.com/articles"

function getScoreLabel(score: number) {
  if (score >= 4) return "High relevance signal"
  if (score >= 2) return "Moderate relevance"
  return "Low relevance"
}

export default function Home() {
  const [articles, setArticles] = useState<any[] | null>(null)
  const [search, setSearch] = useState("")
  const [minScore, setMinScore] = useState(0)

  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const rotateX = useTransform(mouseY, [0, 1000], [10, -10])
  const rotateY = useTransform(mouseX, [0, 1000], [-10, 10])

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

  return (
    <div className="min-h-screen relative overflow-hidden">

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

      <div className="relative z-10">

        <div className="h-16 flex items-center px-10 border-b bg-white/50 backdrop-blur-xl">
          <h1 className="font-semibold text-lg">
            Digital Identity News Engine
          </h1>
        </div>

        <div className="flex">

          {/* SIDEBAR */}
          <div className="w-72 p-6 bg-white/50 backdrop-blur-xl border-r space-y-8">

            <div>
              <p className="text-sm font-semibold">Search</p>
              <input
                placeholder="Search articles..."
                className="w-full mt-2 px-3 py-2 rounded border bg-white"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div>
              <p className="text-sm font-semibold">
                Relevance Filter
              </p>

              <input
                className="mt-2"
                type="range"
                min={0}
                max={maxScore}
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
              />

              <p className="text-xs text-gray-600 mt-1">
                Filters weaker signals — higher = more important trends
              </p>
            </div>

          </div>

          {/* MAIN */}
          <div className="flex-1 p-12 space-y-14">

            <div>
              <h1 className="text-5xl font-bold">
                Digital Identity
              </h1>
              <h2 className="text-5xl font-bold text-blue-600">
                Intelligence Dashboard
              </h2>
            </div>

            {/* TOP INSIGHTS */}
            <div>
              <h2 className="text-lg font-semibold mb-4">
                Key Signals
              </h2>

              <div className="grid grid-cols-3 gap-6">
                {top3.map((a, i) => (
                  <Card key={i} className="border-2 border-blue-300 shadow-lg">
                    <CardContent>

                      <CardTitle>{a.title}</CardTitle>

                      <CardDescription className="mt-2">
                        {a.source}
                      </CardDescription>

                      <Badge className="mt-2">
                        Score: {a.score}
                      </Badge>

                      <p className="text-xs text-gray-600 mt-1">
                        {getScoreLabel(a.score)}
                      </p>

                      <Button
                        variant="link"
                        className="mt-2"
                        onClick={() => window.open(a.link)}
                      >
                        Read →
                      </Button>

                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* ALL ARTICLES */}
            <div className="grid grid-cols-3 gap-6">
              {filtered.map((a, i) => (
                <motion.div key={i} style={{ rotateX, rotateY }}>
                  <Card className="hover:shadow-md transition">
                    <CardContent>

                      <CardTitle className="text-sm">
                        {a.title}
                      </CardTitle>

                      <CardDescription className="mt-2">
                        {a.source}
                      </CardDescription>

                      <Badge className="mt-2">
                        {a.score}
                      </Badge>

                      <p className="text-xs text-gray-500 mt-1">
                        {getScoreLabel(a.score)}
                      </p>

                      <Button
                        variant="link"
                        className="mt-2"
                        onClick={() => window.open(a.link)}
                      >
                        Open →
                      </Button>

                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
