"use client"

import { ArrowLeft, Search, X, Package, AlertTriangle, CheckCircle2, XCircle } from "lucide-react"
import { useState, useRef, useEffect } from "react"

interface ReconciliationScreenProps {
  onBack: () => void
}

// Hardcoded reconciliation data
interface ReconciliationItem {
  flightNumber: string
  eta: string
  boardingPoint: string
  expectedULDs: number
  receivedULDs: number
  missingULDs: number
  extraULDs: number
  status: "complete" | "incomplete" | "discrepancy"
  missingList?: string[]
  extraList?: string[]
}

const HARDCODED_RECONCILIATION: ReconciliationItem[] = [
  {
    flightNumber: "EK0393",
    eta: "14:30",
    boardingPoint: "FRA",
    expectedULDs: 12,
    receivedULDs: 12,
    missingULDs: 0,
    extraULDs: 0,
    status: "complete",
  },
  {
    flightNumber: "EK0201",
    eta: "15:00",
    boardingPoint: "LHR",
    expectedULDs: 8,
    receivedULDs: 7,
    missingULDs: 1,
    extraULDs: 0,
    status: "incomplete",
    missingList: ["PMC99999EK"],
  },
  {
    flightNumber: "EK0505",
    eta: "15:30",
    boardingPoint: "JFK",
    expectedULDs: 10,
    receivedULDs: 11,
    missingULDs: 0,
    extraULDs: 1,
    status: "discrepancy",
    extraList: ["AKE11111EK"],
  },
  {
    flightNumber: "EK0707",
    eta: "16:00",
    boardingPoint: "LAX",
    expectedULDs: 15,
    receivedULDs: 13,
    missingULDs: 2,
    extraULDs: 0,
    status: "incomplete",
    missingList: ["PMC88888EK", "AKE77777EK"],
  },
  {
    flightNumber: "EK0909",
    eta: "16:30",
    boardingPoint: "DXB",
    expectedULDs: 20,
    receivedULDs: 20,
    missingULDs: 0,
    extraULDs: 0,
    status: "complete",
  },
]

export default function ReconciliationScreen({ onBack }: ReconciliationScreenProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFilter, setSelectedFilter] = useState<"all" | "complete" | "incomplete" | "discrepancy">("all")
  const [expandedFlight, setExpandedFlight] = useState<string | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
      }, 100)
    }
  }, [isSearchOpen])

  const filteredData = HARDCODED_RECONCILIATION.filter((item) => {
    const matchesSearch =
      !searchQuery.trim() ||
      item.flightNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.boardingPoint.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesFilter = selectedFilter === "all" || item.status === selectedFilter

    return matchesSearch && matchesFilter
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "complete":
        return "bg-green-100 text-green-800 border-green-200"
      case "incomplete":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "discrepancy":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "complete":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case "incomplete":
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      case "discrepancy":
        return <XCircle className="h-5 w-5 text-red-600" />
      default:
        return <Package className="h-5 w-5 text-gray-600" />
    }
  }

  const toggleExpanded = (flightNumber: string) => {
    setExpandedFlight(expandedFlight === flightNumber ? null : flightNumber)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between px-2 py-1.5">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="h-5 w-5 text-gray-700" />
            </button>
            <h1 className="text-base font-semibold text-gray-900">Reconciliation</h1>
          </div>
          <button onClick={() => setIsSearchOpen(true)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <Search className="h-5 w-5 text-gray-700" />
          </button>
        </div>
      </header>

      {/* Filter Tabs */}
      <div className="sticky top-[49px] z-40 bg-white border-b border-gray-200 px-2 py-2">
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setSelectedFilter("all")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              selectedFilter === "all" ? "bg-[#D71A21] text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            All ({HARDCODED_RECONCILIATION.length})
          </button>
          <button
            onClick={() => setSelectedFilter("complete")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              selectedFilter === "complete" ? "bg-[#D71A21] text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Complete ({HARDCODED_RECONCILIATION.filter((i) => i.status === "complete").length})
          </button>
          <button
            onClick={() => setSelectedFilter("incomplete")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              selectedFilter === "incomplete"
                ? "bg-[#D71A21] text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Incomplete ({HARDCODED_RECONCILIATION.filter((i) => i.status === "incomplete").length})
          </button>
          <button
            onClick={() => setSelectedFilter("discrepancy")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              selectedFilter === "discrepancy"
                ? "bg-[#D71A21] text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Discrepancy ({HARDCODED_RECONCILIATION.filter((i) => i.status === "discrepancy").length})
          </button>
        </div>
      </div>

      {/* Content */}
      <main className="px-2 py-2 space-y-2 pb-20">
        {filteredData.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No flights found</p>
          </div>
        ) : (
          filteredData.map((item, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <div
                className="p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleExpanded(item.flightNumber)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 text-sm">{item.flightNumber}</div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                      <span>{item.eta}</span>
                      <span className="text-gray-400">•</span>
                      <span>{item.boardingPoint}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">{getStatusIcon(item.status)}</div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3 pt-2 border-t border-gray-100">
                  <div className="text-center">
                    <div className="text-xs text-gray-600">Expected</div>
                    <div className="text-lg font-semibold text-gray-900">{item.expectedULDs}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-600">Received</div>
                    <div className="text-lg font-semibold text-gray-900">{item.receivedULDs}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-600">Missing</div>
                    <div className={`text-lg font-semibold ${item.missingULDs > 0 ? "text-red-600" : "text-gray-900"}`}>
                      {item.missingULDs}
                    </div>
                  </div>
                </div>

                <div className="mt-2">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}
                  >
                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                  </span>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedFlight === item.flightNumber && (item.missingList || item.extraList) && (
                <div className="px-3 pb-3 pt-0 border-t border-gray-100 bg-gray-50">
                  {item.missingList && item.missingList.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs font-semibold text-red-700 mb-1">Missing ULDs:</div>
                      <div className="space-y-1">
                        {item.missingList.map((uld, idx) => (
                          <div
                            key={idx}
                            className="text-xs text-gray-700 bg-white px-2 py-1 rounded border border-red-200"
                          >
                            {uld}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {item.extraList && item.extraList.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs font-semibold text-yellow-700 mb-1">Extra ULDs:</div>
                      <div className="space-y-1">
                        {item.extraList.map((uld, idx) => (
                          <div
                            key={idx}
                            className="text-xs text-gray-700 bg-white px-2 py-1 rounded border border-yellow-200"
                          >
                            {uld}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </main>

      {/* Search Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[100]">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setIsSearchOpen(false)
              setSearchQuery("")
            }}
          />

          <div className="relative z-[101] bg-white shadow-lg">
            <div className="flex items-center gap-2 px-2 py-1.5 border-b border-gray-200">
              <button
                onClick={() => {
                  setIsSearchOpen(false)
                  setSearchQuery("")
                }}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-700" />
              </button>

              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search flights, destinations..."
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 text-sm text-gray-900 placeholder:text-gray-500 outline-none bg-transparent"
              />

              <Search className="h-5 w-5 text-[#D71A21]" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
