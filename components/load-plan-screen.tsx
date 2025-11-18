"use client"

import { ArrowLeft } from 'lucide-react'

interface LoadPlanScreenProps {
  onBack: () => void
}

export default function LoadPlanScreen({ onBack }: LoadPlanScreenProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={onBack} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Load Plan</h1>
        </div>
      </header>

      {/* Content */}
      <main className="p-4">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Column 1</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Column 2</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Column 3</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Column 4</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-gray-500">
                  No data available
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
