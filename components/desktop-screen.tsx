"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, Calendar, Plane, Clock, MapPin, Package, Shield, FileText, RotateCcw } from "lucide-react"
import { useFlights } from "@/lib/flight-context"
import type { ULD } from "@/lib/flight-data"
import DatePicker from "./date-picker"

type ViewMode = "time" | "count"

const shifts = ["All Shifts", "12am to 4am", "4am to 8am", "8am to 12pm", "12pm to 4pm", "4pm to 8pm", "8pm to 12am"]

const parseEtaToHours = (eta: string): number => {
  const [time] = eta.split(" ")
  const [hours, minutes] = time.split(":").map(Number)
  return hours + minutes / 60
}

const isEtaInShift = (eta: string, shift: string): boolean => {
  if (shift === "All Shifts") return true

  const etaHours = parseEtaToHours(eta)

  const shiftMap: Record<string, { start: number; end: number }> = {
    "12am to 4am": { start: 0, end: 4 },
    "4am to 8am": { start: 4, end: 8 },
    "8am to 12pm": { start: 8, end: 12 },
    "12pm to 4pm": { start: 12, end: 16 },
    "4pm to 8pm": { start: 16, end: 20 },
    "8pm to 12am": { start: 20, end: 24 },
  }

  const range = shiftMap[shift]
  if (!range) return true

  return etaHours >= range.start && etaHours < range.end
}

export default function DesktopScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedShift, setSelectedShift] = useState("All Shifts")
  const [viewMode, setViewMode] = useState<ViewMode>("count")
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showShiftPicker, setShowShiftPicker] = useState(false)
  const [showViewPicker, setShowViewPicker] = useState(false)
  const { flights, loading, refreshFlights } = useFlights()
  const [hoveredFlight, setHoveredFlight] = useState<string | null>(null)

  const datePickerRef = useRef<HTMLDivElement>(null)
  const shiftPickerRef = useRef<HTMLDivElement>(null)
  const viewPickerRef = useRef<HTMLDivElement>(null)

  const formatDateDisplay = (date: Date) => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return "Today"
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday"
    } else {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`
    }
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false)
      }
      if (shiftPickerRef.current && !shiftPickerRef.current.contains(event.target as Node)) {
        setShowShiftPicker(false)
      }
      if (viewPickerRef.current && !viewPickerRef.current.contains(event.target as Node)) {
        setShowViewPicker(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const allUlds: Array<ULD & { flight: string; eta: string; origin: string }> = flights.flatMap((flight) =>
    flight.ulds.map((uld) => ({
      ...uld,
      flight: flight.flightNumber,
      eta: flight.eta,
      origin: flight.boardingPoint,
    })),
  )

  const filteredUlds = allUlds.filter((uld) => isEtaInShift(uld.eta, selectedShift))

  const statusCounts = {
    1: filteredUlds.filter((uld) => uld.status === 1).length,
    2: filteredUlds.filter((uld) => uld.status === 2).length,
    3: filteredUlds.filter((uld) => uld.status === 3).length,
    4: filteredUlds.filter((uld) => uld.status === 4).length,
    5: filteredUlds.filter((uld) => uld.status === 5).length,
  }

  const statusStages = [
    { id: 1, label: "on aircraft", count: statusCounts[1], avgTime: "12 min" },
    { id: 2, label: "received by GHA", count: statusCounts[2], avgTime: "8 min" },
    { id: 3, label: "tunnel indicated", count: statusCounts[3], avgTime: "15 min" },
    { id: 4, label: "store the ULD", count: statusCounts[4], avgTime: "10 min" },
    { id: 5, label: "breakdown completed", count: statusCounts[5], avgTime: "18 min" },
  ]

  const getFlightGroupIndices = (flightNumber: string): number[] => {
    const indices: number[] = []
    let inGroup = false

    for (let i = 0; i < filteredUlds.length; i++) {
      if (filteredUlds[i].flight === flightNumber) {
        indices.push(i)
        inGroup = true
      } else if (inGroup) {
        break
      }
    }

    return indices
  }

  const getStatusLabel = (status: number) => {
    switch (status) {
      case 1:
        return "1) on aircraft"
      case 2:
        return "2) received by GHA (AACS)"
      case 3:
        return "3) tunnel inducted (Skychain)"
      case 4:
        return "4) store the ULD (MHS)"
      case 5:
        return "5) breakdown completed"
      default:
        return "1) on aircraft"
    }
  }

  const maxValue = viewMode === "count" ? Math.max(...statusStages.map((s) => s.count)) : 20

  const handleResetToDefault = async () => {
    setSelectedDate(new Date())
    setSelectedShift("All Shifts")
    setViewMode("count")
    await refreshFlights()
  }

  const renderShcChips = (uldshc: string) => {
    if (!uldshc || uldshc.trim() === "") return <span className="text-gray-400">--</span>

    const codes = uldshc.split("-").filter((code) => code.trim() !== "")

    return (
      <div className="flex flex-wrap gap-1">
        {codes.map((code, index) => (
          <span
            key={index}
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white text-[#D71A21] border border-red-200 hover:bg-red-50 transition-colors"
          >
            {code}
          </span>
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Header Controls */}
        <div className="flex items-center gap-4">
          {/* Date Picker */}
          <div className="relative" ref={datePickerRef}>
            <button
              onClick={() => {
                setShowDatePicker(!showDatePicker)
                setShowShiftPicker(false)
                setShowViewPicker(false)
              }}
              className="flex items-center gap-2 bg-white text-gray-700 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              <Calendar className="w-4 h-4 text-gray-500" />
              <span>{formatDateDisplay(selectedDate)}</span>
            </button>
            {showDatePicker && (
              <div className="absolute top-full mt-2 z-10">
                <DatePicker
                  selectedDate={selectedDate}
                  onDateChange={setSelectedDate}
                  onClose={() => setShowDatePicker(false)}
                />
              </div>
            )}
          </div>

          {/* Shift Picker */}
          <div className="relative" ref={shiftPickerRef}>
            <button
              onClick={() => {
                setShowShiftPicker(!showShiftPicker)
                setShowDatePicker(false)
                setShowViewPicker(false)
              }}
              className="flex items-center gap-2 bg-white text-gray-700 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors min-w-[140px] justify-between text-sm font-medium"
            >
              <span>{selectedShift}</span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>
            {showShiftPicker && (
              <div className="absolute top-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-10 min-w-[140px]">
                {shifts.map((shift) => (
                  <button
                    key={shift}
                    onClick={() => {
                      setSelectedShift(shift)
                      setShowShiftPicker(false)
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-gray-700 text-sm font-medium"
                  >
                    {shift}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* View Mode Picker */}
          <div className="relative" ref={viewPickerRef}>
            <button
              onClick={() => {
                setShowViewPicker(!showViewPicker)
                setShowDatePicker(false)
                setShowShiftPicker(false)
              }}
              className="flex items-center gap-2 bg-white text-gray-700 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors min-w-[160px] justify-between text-sm font-medium"
            >
              <span>{viewMode === "time" ? "View by time" : "View by # of ULDs"}</span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>
            {showViewPicker && (
              <div className="absolute top-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-10 min-w-[160px]">
                <button
                  onClick={() => {
                    setViewMode("time")
                    setShowViewPicker(false)
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-gray-700 text-sm font-medium"
                >
                  View by time
                </button>
                <button
                  onClick={() => {
                    setViewMode("count")
                    setShowViewPicker(false)
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-gray-700 text-sm font-medium"
                >
                  View by # of ULDs
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleResetToDefault}
            className="flex items-center gap-2 bg-white text-gray-700 px-3 py-2 rounded-lg border border-gray-200 hover:bg-[#D71A21] hover:text-white transition-colors text-sm font-medium ml-auto"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset to Default</span>
          </button>
        </div>

        {/* Graphs */}
        <div className="grid grid-cols-5 gap-4">
          {statusStages.map((stage) => {
            const value = viewMode === "count" ? stage.count : Number.parseInt(stage.avgTime)
            const heightPercent = (value / maxValue) * 100

            return (
              <div
                key={stage.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col min-h-[280px]"
              >
                {/* Graph area */}
                <div className="flex-1 flex items-end justify-center mb-4">
                  <div className="w-full max-w-[120px] flex flex-col items-center gap-2">
                    {/* Bar */}
                    <div className="w-full bg-gray-50 rounded-lg overflow-hidden h-[180px] flex items-end">
                      <div
                        className="w-full bg-[#D71A21] rounded-t-lg transition-all duration-500 flex items-center justify-center"
                        style={{ height: `${heightPercent}%` }}
                      >
                        <span className="text-white font-bold text-2xl">
                          {viewMode === "count" ? stage.count : stage.avgTime}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Label */}
                <div className="text-sm text-center font-medium text-gray-900">{stage.label}</div>
              </div>
            )
          })}
        </div>

        {/* ULD Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-[#D71A21] text-white">
                <th className="px-4 py-3 text-left font-semibold">
                  <div className="flex items-center gap-2">
                    <Plane className="w-4 h-4" />
                    <span>Flight No.</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-left font-semibold">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>ETA</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-left font-semibold">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>Boarding Point</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-left font-semibold">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    <span>ULD No.</span>
                  </div>
                </th>
                <th className="px-2 py-3 text-left font-semibold">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    <span>ULD SHC</span>
                  </div>
                </th>
                <th className="px-2 py-3 text-left font-semibold">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>Destination</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-left font-semibold">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span>Remarks</span>
                  </div>
                </th>
                <th className="px-3 py-2 text-left font-semibold">
                  <span className="text-sm">Status</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-3 py-4 text-center text-gray-500 text-sm">
                    Loading data...
                  </td>
                </tr>
              ) : filteredUlds.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-4 text-center text-gray-500 text-sm">
                    No ULDs available for the selected shift
                  </td>
                </tr>
              ) : (
                filteredUlds.map((uld, index) => {
                  const flightGroupIndices = hoveredFlight ? getFlightGroupIndices(hoveredFlight) : []
                  const isInHoveredGroup = flightGroupIndices.includes(index)

                  return (
                    <tr
                      key={index}
                      onMouseEnter={() => setHoveredFlight(uld.flight)}
                      onMouseLeave={() => setHoveredFlight(null)}
                      className={`border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors relative ${
                        isInHoveredGroup ? "border-l-4 border-l-[#D71A21]" : ""
                      }`}
                    >
                      <td className="px-4 py-3 font-semibold text-gray-900 text-sm">{uld.flight}</td>
                      <td className="px-4 py-3 text-gray-900 text-sm">{uld.eta}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900 text-sm">{uld.origin}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900 text-sm">{uld.uldNumber}</td>
                      <td className="px-2 py-2 text-gray-900 text-sm">{renderShcChips(uld.uldshc)}</td>
                      <td className="px-2 py-2 font-semibold text-gray-900 text-sm">{uld.destination}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900 text-sm">{uld.remarks}</td>
                      <td className="px-3 py-2">
                        <button className="text-xs px-3 py-1.5 rounded-full font-semibold bg-gray-200 text-gray-700 hover:bg-[#D71A21] hover:text-white transition-colors flex items-center gap-1 min-w-[100px] max-w-[140px]">
                          <span className="flex-1">{getStatusLabel(uld.status)}</span>
                          <ChevronDown className="h-3 w-3 flex-shrink-0" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
