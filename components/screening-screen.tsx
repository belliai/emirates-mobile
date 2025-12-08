"use client"

import { ArrowLeft, Shield } from "lucide-react"

interface ScreeningScreenProps {
  onBack: () => void
}

export default function ScreeningScreen({ onBack }: ScreeningScreenProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Screening</h1>
        </div>
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

