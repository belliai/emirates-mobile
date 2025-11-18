"use client"

import { Home, Package, History } from "lucide-react"
import { useEffect, useState } from "react"

interface BottomNavProps {
  currentScreen: "home" | "detail" | "history"
  onNavigate: (screen: "home" | "detail" | "history") => void
  isVisible: boolean
  hasVisitedDetail: boolean
  hasVisitedHistory: boolean
}

export default function BottomNav({
  currentScreen,
  onNavigate,
  isVisible,
  hasVisitedDetail,
  hasVisitedHistory,
}: BottomNavProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    console.log("[v0] BottomNav mounted, isVisible:", isVisible)
  }, [])

  useEffect(() => {
    console.log("[v0] BottomNav visibility changed:", isVisible)
  }, [isVisible])

  const homeClickable = true // Always clickable
  const detailClickable = hasVisitedDetail // Clickable once visited
  const historyClickable = hasVisitedHistory // Clickable once visited

  return (
    <div
      className={`fixed left-0 right-0 bottom-0 z-50 flex justify-center transition-all duration-300 pb-safe ${
        isVisible && mounted ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
      }`}
      style={{
        paddingBottom: "calc(1rem + env(safe-area-inset-bottom))",
      }}
    >
      {/* Frosted glass container with iOS-style blur - added webkit prefix and fallback */}
      <div
        className="bg-white/80 rounded-full shadow-lg border border-white/30 px-6 py-3"
        style={{
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <div className="flex items-center gap-8">
          {/* Home Button */}
          <button
            onClick={() => {
              console.log("[v0] Home button clicked")
              homeClickable && onNavigate("home")
            }}
            disabled={!homeClickable}
            className={`flex flex-col items-center gap-1 transition-all duration-200 ${
              homeClickable ? "opacity-100 hover:scale-110 active:scale-95" : "opacity-30 cursor-not-allowed"
            }`}
          >
            <div
              className={`p-2 rounded-full transition-colors ${
                currentScreen === "home" ? "bg-[#D71A21]" : "bg-transparent"
              }`}
            >
              <Home className={`h-5 w-5 ${currentScreen === "home" ? "text-white" : "text-gray-700"}`} />
            </div>
          </button>

          {/* ULDs Button */}
          <button
            onClick={() => {
              console.log("[v0] ULDs button clicked, clickable:", detailClickable)
              detailClickable && onNavigate("detail")
            }}
            disabled={!detailClickable}
            className={`flex flex-col items-center gap-1 transition-all duration-200 ${
              detailClickable ? "opacity-100 hover:scale-110 active:scale-95" : "opacity-30 cursor-not-allowed"
            }`}
          >
            <div
              className={`p-2 rounded-full transition-colors ${
                currentScreen === "detail" ? "bg-[#D71A21]" : "bg-transparent"
              }`}
            >
              <Package className={`h-5 w-5 ${currentScreen === "detail" ? "text-white" : "text-gray-700"}`} />
            </div>
          </button>

          {/* Status History Button */}
          <button
            onClick={() => {
              console.log("[v0] History button clicked, clickable:", historyClickable)
              historyClickable && onNavigate("history")
            }}
            disabled={!historyClickable}
            className={`flex flex-col items-center gap-1 transition-all duration-200 ${
              historyClickable ? "opacity-100 hover:scale-110 active:scale-95" : "opacity-30 cursor-not-allowed"
            }`}
          >
            <div
              className={`p-2 rounded-full transition-colors ${
                currentScreen === "history" ? "bg-[#D71A21]" : "bg-transparent"
              }`}
            >
              <History className={`h-5 w-5 ${currentScreen === "history" ? "text-white" : "text-gray-700"}`} />
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
