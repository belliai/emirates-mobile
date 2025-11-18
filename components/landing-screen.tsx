"use client"

import type React from "react"

interface LandingScreenProps {
  onImport: () => void
  onExport: () => void
}

export default function LandingScreen({ onImport, onExport }: LandingScreenProps) {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-4">        
        <button
          onClick={onImport}
          className="w-full py-4 px-6 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 border border-gray-200 rounded-lg transition-colors text-gray-900 text-base font-medium"
        >
          Import
        </button>
        
        <button
          onClick={onExport}
          className="w-full py-4 px-6 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 border border-gray-200 rounded-lg transition-colors text-gray-900 text-base font-medium"
        >
          Export
        </button>
      </div>
    </div>
  )
}
