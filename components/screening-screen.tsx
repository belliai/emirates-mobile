"use client"

import { useState } from "react"
import { Shield, RefreshCw } from "lucide-react"
import MenuDrawer from "./menu-drawer"

interface ScreeningScreenProps {
  onBack: () => void
  onNavigate: (screen: "landing" | "import" | "export" | "loadPlan" | "newULD" | "dropStatus" | "inductionStatus" | "reconciliation" | "screening") => void
}

export default function ScreeningScreen({ onBack, onNavigate }: ScreeningScreenProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-white">
      {/* Menu Drawer */}
      <MenuDrawer isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} onNavigate={onNavigate} />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between px-2 py-1.5">
          <div className="flex items-center gap-1">
            <button onClick={() => setIsMenuOpen(true)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="h-5 w-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          <h1 className="text-base font-semibold text-gray-900">Screening</h1>

          <div className="flex items-center">
            <button
              disabled
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh data"
            >
              <RefreshCw className="h-5 w-5 text-gray-700" />
            </button>
          </div>
        </div>
      </header>

      {/* Banner */}
      <div className="bg-[#D71A21] px-1 py-1">
        <div className="text-center text-white text-sm font-semibold">Screening</div>
      </div>

      {/* Coming Soon Content */}
      <div className="flex flex-col items-center justify-center p-8 mt-20">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
          <Shield className="w-12 h-12 text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Coming Soon</h2>
        <p className="text-center text-gray-500 max-w-sm">
          The Screening feature is currently under development and will be available soon.
        </p>
      </div>
    </div>
  )
}


