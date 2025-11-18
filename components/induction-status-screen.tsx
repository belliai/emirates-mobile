"use client"

import { ArrowLeft, Search, X, Package, Clock, CheckCircle2, AlertCircle } from "lucide-react"
import { useState, useRef, useEffect } from "react"

interface InductionStatusScreenProps {
  onBack: () => void
}

// Hardcoded induction status data
interface InductionStatusItem {
  uldNumber: string
  flightNumber: string
  destination: string
  dropTime: string
  inductionTime?: string
  status: "inducted" | "pending" | "issue"
  location: string
  remarks: string
}

const HARDCODED_INDUCTION_STATUS: InductionStatusItem[] = [
  {
    uldNumber: "PMC31580EK",
    flightNumber: "EK0393",
    destination: "FRA",
    dropTime: "14:28",
    inductionTime: "14:35",
    status: "inducted",
    location: "Tunnel A3",
    remarks: "Inducted successfully",
  },
  {
    uldNumber: "AKE12345EK",
    flightNumber: "EK0393",
    destination: "LAX",
    dropTime: "14:42",
    inductionTime: "14:50",
    status: "inducted",
    location: "Tunnel B2",
    remarks: "Inducted successfully",
  },
  {
    uldNumber: "PMC98765EK",
    flightNumber: "EK0393",
    destination: "JFK",
    dropTime: "14:45",
    status: "pending",
    location: "Awaiting induction",
    remarks: "In queue",
  },
  {
    uldNumber: "AKE54321EK",
    flightNumber: "EK0201",
    destination: "LHR",
    dropTime: "15:15",
    status: "issue",
    location: "Drop zone",
    remarks: "Barcode scan failed",
  },
  {
    uldNumber: "BULK-EK0393/31-AUG-25",
    flightNumber: "EK0393",
    destination: "DXB",
    dropTime: "14:50",
    status: "pending",
    location: "Awaiting induction",
    remarks: "Bulk cargo processing",
  },
]

export default function InductionStatusScreen({ onBack }: InductionStatusScreenProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFilter, setSelectedFilter] = useState<"all" | "inducted" | "pending" | "issue">("all")
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
      }, 100)
    }
  }, [isSearchOpen])

  const filteredData = HARDCODED_INDUCTION_STATUS.filter((item) => {
    const matchesSearch =
      !searchQuery.trim() ||
      item.uldNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.flightNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.destination.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesFilter = selectedFilter === "all" || item.status === selectedFilter

    return matchesSearch && matchesFilter
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "inducted":
        return "bg-green-100 text-green-800 border-green-200"
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "issue":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "inducted":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />
      case "issue":
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
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
            <h1 className="text-base font-semibold text-gray-900">Induction Status</h1>
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
            All ({HARDCODED_INDUCTION_STATUS.length})
          </button>
          <button
            onClick={() => setSelectedFilter("inducted")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              selectedFilter === "inducted" ? "bg-[#D71A21] text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Inducted ({HARDCODED_INDUCTION_STATUS.filter((i) => i.status === "inducted").length})
          </button>
          <button
            onClick={() => setSelectedFilter("pending")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              selectedFilter === "pending" ? "bg-[#D71A21] text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Pending ({HARDCODED_INDUCTION_STATUS.filter((i) => i.status === "pending").length})
          </button>
          <button
            onClick={() => setSelectedFilter("issue")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              selectedFilter === "issue" ? "bg-[#D71A21] text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Issues ({HARDCODED_INDUCTION_STATUS.filter((i) => i.status === "issue").length})
          </button>
        </div>
      </div>

      {/* Content */}
      <main className="px-2 py-2 space-y-2 pb-20">
        {filteredData.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No ULDs found</p>
          </div>
        ) : (
          filteredData.map((item, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 text-sm">{item.uldNumber}</div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                    <span className="font-medium">{item.flightNumber}</span>
                    <span className="text-gray-400">•</span>
                    <span>{item.destination}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">{getStatusIcon(item.status)}</div>
              </div>

              <div className="space-y-1.5 mt-2 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Drop Time:</span>
                  <span className="font-medium text-gray-900">{item.dropTime}</span>
                </div>
                {item.inductionTime && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Induction Time:</span>
                    <span className="font-medium text-gray-900">{item.inductionTime}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Location:</span>
                  <span className="font-medium text-gray-900">{item.location}</span>
                </div>
              </div>

              <div className="mt-2">
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}
                >
                  {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </span>
                {item.remarks && <span className="ml-2 text-xs text-gray-500">{item.remarks}</span>}
              </div>
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
                placeholder="Search ULDs, flights, destinations..."
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
