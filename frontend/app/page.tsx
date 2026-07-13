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
  }, [mouseX, mouseY])

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
    <div className="min-h-screen relative overflow-hidden">

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
        <div className="h-16 flex items-center px-10 border-b bg-white/40 backdrop-blur-xl">
          <h1 className="font-semibold text-lg">
            Digital Identity News Engine
          </h1>
        </div>

        <div className="flex">

          {/* ✅ SIDEBAR */}
          <div className="w-72 p-6 bg-white/40 backdrop-blur-xl border-r space-y-6">

            <div>
              <p className="text-sm font-medium mb-1">Search</p>
              <input
                placeholder="Search articles..."
                className="w-full px-3 py-2 rounded border bg-white"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div>
              <p className="text-sm font-medium mb-1">
                Relevance Filter
              </p>

              <input
                type="range"
                min={0}
                max={maxScore}
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
              />

              <p className="text-xs text-gray-600 mt-1">
                Only show articles with score ≥ {minScore}
              </p>
            </div>

          </div>

          {/* MAIN */}
          <div className="flex-1 p-12 space-y-12">

            {/* HERO */}
            <div>
              <h1 className="text-5xl font-bold tracking-tight">
                Digital Identity
              </h1>
              <h2 className="text-5xl text-blue-600 font-bold">
                News Dashboard
              </h2>
            </div>

            {/* KPI */}
            <div className="grid grid-cols-3 gap-6">
              {[
                { label: "Articles", value: filtered.length },
                { label: "Avg Score", value: avgScore },
                { label: "Topics", value: Object.keys(topicCounts).length }
              ].map((kpi, i) => (
                <Card key={i}>
                  <CardContent>
                    <CardDescription>{kpi.label}</CardDescription>
                    <CardTitle className="mt-2 text-xl text-blue-600">
                      {kpi.value}
                    </CardTitle>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* TOP ARTICLES */}
            <div>
              <h2 className="text-lg font-semibold mb-4">
                Top Articles
              </h2>

              <div className="grid grid-cols-3 gap-6">
                {top3.map((a, i) => (
                  <Card key={i}>
                    <CardContent>
                      <CardTitle>{a.title}</CardTitle>

                      <CardDescription className="mt-2">
                        {a.source}
                      </CardDescription>

                      <Badge className="mt-2">
                        Score: {a.score}
                      </Badge>

                      <Button
                        variant="link"
                        className="mt-2"
                        onClick={() => window.open(a.link)}
                      >
                        Open →
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* CHART */}
            <Card>
              <CardContent>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis dataKey="topic" />
                      <Tooltip />
                      <Bar dataKey="count" fill="#4f46e5" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* ALL ARTICLES */}
            <div className="grid grid-cols-3 gap-6">
              {filtered.map((a, i) => (
                <motion.div
                  key={i}
                  style={{ rotateX, rotateY }}
                  whileHover={{ scale: 1.03 }}
                >
                  <Card>
                    <CardContent>

                      <CardTitle>{a.title}</CardTitle>

                      <CardDescription className="mt-2">
                        {a.source}
                      </CardDescription>

                      <Badge className="mt-2">
                        Score: {a.score}
                      </Badge>

                      <div className="flex flex-wrap gap-2 mt-2">
                        {(a.keywords || "")
                          .split(",")
                          .slice(0, 3)
                          .map((k: string, idx: number) => (
                            <Badge key={idx} variant="secondary">
                              {k.trim()}
                            </Badge>
                          ))}
                      </div>

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
