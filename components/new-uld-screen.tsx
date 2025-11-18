"use client"

import { ArrowLeft } from "lucide-react"
import { useFlights } from "@/lib/flight-context"

interface NewULDScreenProps {
  onBack: () => void
}

export default function NewULDScreen({ onBack }: NewULDScreenProps) {
  const { newULDs, clearNewULDs } = useFlights()

  const handleSubmit = () => {
    // TODO: Implement submit logic
    console.log("[v0] Submitting new ULDs:", newULDs)
    clearNewULDs()
    onBack()
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between px-2 py-1.5">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="h-5 w-5 text-gray-700" />
            </button>
            <h1 className="text-base font-semibold text-gray-900">New ULD's</h1>
          </div>
        </div>
      </header>

      <div className="bg-[#D71A21] px-1 py-1">
        <div className="text-center text-white text-sm font-semibold">ULDs</div>
      </div>

      <main className="flex-1 px-1.5 pb-20 overflow-y-auto">
        {newULDs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No new ULDs added yet</p>
            <p className="text-sm mt-2">Add ULDs from the flight details page</p>
          </div>
        ) : (
          <div className="bg-white overflow-hidden">
            <div className="divide-y divide-gray-200">
              {newULDs.map((uldNumber, index) => (
                <div key={index} className="px-1.5 py-1.5 text-sm">
                  <div className="font-semibold text-gray-900">{uldNumber}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <div className="sticky bottom-0 p-1.5 bg-white border-t border-gray-200">
        <button
          onClick={handleSubmit}
          disabled={newULDs.length === 0}
          className="w-full py-1.5 bg-[#D71A21] text-white rounded-lg font-semibold hover:bg-[#B91419] transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Submit {newULDs.length > 0 && `(${newULDs.length} ULD${newULDs.length !== 1 ? "s" : ""})`}
        </button>
      </div>
    </div>
  )
}
