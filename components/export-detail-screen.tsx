"use client"

import type React from "react"

import { ArrowLeft, Plus, Minus, FileText, History, Plane, Clock, MapPin, Package } from "lucide-react"
import type { Flight } from "@/lib/flight-data"
import { useEffect, useState } from "react"
import { useExportFlights } from "@/lib/export-flight-context"

interface ExportDetailScreenProps {
  flight: Flight
  onBack: () => void
  onULDSelect: (anyUld: any) => void
}

export default function ExportDetailScreen({ flight, onBack, onULDSelect }: ExportDetailScreenProps) {
  const { getProgress, changeCount, setRemarks } = useExportFlights()
  const [remarks, setRemarksLocal] = useState("")
  const progress = getProgress(flight)
  const total = (progress.pmc || 0) + (progress.alf || 0) + (progress.ake || 0)

  const [pmcInput, setPmcInput] = useState(String(progress.pmc || 0))
  const [alfInput, setAlfInput] = useState(String(progress.alf || 0))
  const [akeInput, setAkeInput] = useState(String(progress.ake || 0))

  useEffect(() => {
    setRemarksLocal(progress.remarks || "")
    setPmcInput(String(progress.pmc || 0))
    setAlfInput(String(progress.alf || 0))
    setAkeInput(String(progress.ake || 0))
  }, [flight.flightNumber, progress.remarks, progress.pmc, progress.alf, progress.ake])

  const handleInputChange = (type: "PMC/AMF" | "ALF/PLA" | "AKE/AKL", newValue: number) => {
    const currentValue =
      type === "PMC/AMF" ? progress.pmc || 0 : type === "ALF/PLA" ? progress.alf || 0 : progress.ake || 0
    const delta = newValue - currentValue
    if (delta !== 0) {
      changeCount(flight, type, delta)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, type: "PMC/AMF" | "ALF/PLA" | "AKE/AKL") => {
    if (e.key === "ArrowUp") {
      e.preventDefault()
      changeCount(flight, type, 1)
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      changeCount(flight, type, -1)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between px-2 py-1.5">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="h-5 w-5 text-gray-700" />
            </button>
            <h1 className="text-base font-semibold text-gray-900">Export Build-Up</h1>
          </div>
          <button
            onClick={() => onULDSelect({})}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            title="View Activity Log"
          >
            <History className="h-5 w-5 text-gray-700" />
          </button>
        </div>
      </header>
      {/* Banner */}
      <div className="bg-[#D71A21] px-1 py-1">
        <div className="grid grid-cols-4 gap-1">
          <div className="flex justify-center">
            <Plane className="h-3.5 w-3.5 text-white" />
          </div>
          <div className="flex justify-center">
            <Clock className="h-3.5 w-3.5 text-white" />
          </div>
          <div className="flex justify-center">
            <MapPin className="h-3.5 w-3.5 text-white" />
          </div>
          <div className="flex justify-center">
            <Package className="h-3.5 w-3.5 text-white" />
          </div>
        </div>
      </div>

      {/* Flight details row */}
      <div className="bg-white border-b border-gray-200 px-1.5 py-1.5">
        <div className="grid grid-cols-4 gap-1 text-center">
          <div className="text-sm font-semibold text-gray-900">{flight.flightNumber}</div>
          <div className="text-sm font-semibold text-gray-900">{flight.eta}</div>
          <div className="text-sm font-semibold text-gray-900">{flight.boardingPoint}</div>
          <div className="relative flex items-center justify-center">
            <span className="text-sm font-semibold text-gray-900">{total}</span>
          </div>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto">
        <div className="px-3 py-2 space-y-3">
          {[
            {
              label: "Built PMC/AMF",
              key: "PMC/AMF" as const,
              value: progress.pmc || 0,
              inputValue: pmcInput,
              setInputValue: setPmcInput,
            },
            {
              label: "Built ALF/PLA",
              key: "ALF/PLA" as const,
              value: progress.alf || 0,
              inputValue: alfInput,
              setInputValue: setAlfInput,
            },
            {
              label: "Built AKE/AKL",
              key: "AKE/AKL" as const,
              value: progress.ake || 0,
              inputValue: akeInput,
              setInputValue: setAkeInput,
            },
          ].map((row) => (
            <div
              key={row.key}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2"
            >
              <span className="text-sm font-medium text-gray-900">{row.label}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => changeCount(flight, row.key, -1)}
                  className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 active:scale-95"
                >
                  <Minus className="h-4 w-4 text-gray-700" />
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={row.inputValue}
                  onChange={(e) => {
                    const val = e.target.value
                    row.setInputValue(val)

                    // If empty, set to 0 in the context
                    if (val === "") {
                      handleInputChange(row.key, 0)
                      return
                    }

                    // Parse and update if valid number >= 0
                    const n = Number.parseInt(val, 10)
                    if (Number.isFinite(n) && n >= 0) {
                      handleInputChange(row.key, n)
                    }
                  }}
                  onKeyDown={(e) => handleKeyDown(e, row.key)}
                  className="h-8 w-16 rounded-md border border-gray-300 px-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-red-200"
                />
                <button
                  onClick={() => changeCount(flight, row.key, 1)}
                  className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 active:scale-95"
                >
                  <Plus className="h-4 w-4 text-gray-700" />
                </button>
              </div>
            </div>
          ))}

          <div className="rounded-xl border border-gray-200 bg-white p-3">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-900">Remarks</span>
            </div>
            <textarea
              value={remarks}
              onChange={(e) => setRemarksLocal(e.target.value)}
              onBlur={() => setRemarks(flight, remarks)}
              className="w-full resize-none rounded-lg border border-gray-300 p-2 text-sm outline-none focus:ring-2 focus:ring-red-200"
              rows={3}
              placeholder="Enter remarks..."
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2">
            <span className="text-sm font-semibold text-gray-900">Total ULDs Built</span>
            <span className="text-base font-bold text-gray-900">{total}</span>
          </div>
        </div>
      </main>
    </div>
  )
}
