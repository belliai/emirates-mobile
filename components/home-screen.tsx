"use client"

import type React from "react"

import { Search, X, ChevronRight, Plane, Clock, MapPin, Package, Calendar, Upload, FileUp, Trash2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { useState, useRef, useEffect } from "react"
import { useFlights } from "@/lib/flight-context"
import type { Flight } from "@/lib/flight-data"
import MenuDrawer from "@/components/menu-drawer"
import DatePicker from "@/components/date-picker"
import { parseFlightFile } from "@/lib/file-parser"

interface FlightDetail {
  flightNumber: string
  eta: string
  boardingPoint: string
  uldCount: number
}

interface HomeScreenProps {
  onLogout: () => void
  onFlightSelect: (flight: Flight) => void
  onNavigate: (screen: "landing" | "import" | "export" | "loadPlan" | "newULD" | "dropStatus" | "inductionStatus" | "reconciliation") => void
}

export default function HomeScreen({ onLogout, onFlightSelect, onNavigate }: HomeScreenProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const { flights, loading, setFlights, mergeFlights, refreshFlights } = useFlights()

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
      }, 100)
    }
  }, [isSearchOpen])

  const handleFlightClick = (flight: Flight) => {
    console.log("[v0] Flight clicked:", flight.flightNumber)
    onFlightSelect(flight)
  }

  const handleSearchResultClick = (flight: Flight) => {
    setIsSearchOpen(false)
    setSearchQuery("")
    onFlightSelect(flight)
  }

  const handleDateChange = (date: Date) => {
    setSelectedDate(date)
    setShowDatePicker(false)
    randomizeFlightData()
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Add a small artificial delay so the spinner is visible
    await new Promise((resolve) => setTimeout(resolve, 1000))
    await refreshFlights()
    setIsRefreshing(false)
  }

  const handleUploadClick = () => {
    setShowFileUpload(true)
    setUploadError(null)
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setUploadError(null)
      console.log("[v0] File selected:", file.name, file.type, file.size)
    }
  }

  const handleFileUploadSubmit = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setUploadError(null)

    try {
      console.log("[v0] Starting file upload and parsing...")
      const parsedFlights = await parseFlightFile(selectedFile)
      console.log("[v0] Successfully parsed flights:", parsedFlights.length)
      mergeFlights(parsedFlights)

      // Close modal and reset state
      setShowFileUpload(false)
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (error) {
      console.error("[v0] Error uploading file:", error)
      setUploadError(error instanceof Error ? error.message : "Failed to parse file")
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileUploadCancel = () => {
    setShowFileUpload(false)
    setSelectedFile(null)
    setUploadError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleClearData = () => {
    if (confirm("Are you sure you want to clear all flight data? This cannot be undone.")) {
      setFlights([])
    }
  }

  const searchResults = searchQuery.trim()
    ? flights.filter((flight) => {
        const query = searchQuery.toLowerCase()
        return (
          flight.flightNumber.toLowerCase().includes(query) ||
          flight.boardingPoint.toLowerCase().includes(query) ||
          flight.eta.toLowerCase().includes(query) ||
          flight.uldCount.toString().includes(query)
        )
      })
    : []

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between px-2 py-1.5">
          <div className="flex items-center gap-1">
            <button onClick={() => setIsMenuOpen(true)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="h-5 w-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Calendar className="h-5 w-5 text-gray-700" />
            </button>
          </div>

          <h1 className="text-base font-semibold text-gray-900">Flight Dashboard</h1>

          <div className="flex items-center gap-1">
            <button
              onClick={handleClearData}
              disabled={isRefreshing || flights.length === 0}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Clear all data"
            >
              <Trash2 className="h-5 w-5 text-gray-700" />
            </button>

            <button
              onClick={handleUploadClick}
              disabled={isRefreshing}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Upload className="h-5 w-5 text-gray-700" />
            </button>

            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Search className="h-5 w-5 text-gray-700" />
            </button>
          </div>
        </div>

        {showDatePicker && (
          <div className="absolute top-full left-2 mt-2 z-50">
            <DatePicker
              selectedDate={selectedDate}
              onDateChange={handleDateChange}
              onClose={() => setShowDatePicker(false)}
            />
          </div>
        )}
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

      {/* Content */}
      <main className="px-1.5 pb-1.5">
        <div className="bg-white overflow-hidden">
          {/* Table Rows */}
          <div className="divide-y divide-gray-200">
            {loading ? (
              <div className="px-1.5 py-3 text-center text-gray-500 text-sm">Loading flights...</div>
            ) : flights.length === 0 ? (
              <div className="px-1.5 py-3 text-center text-gray-500 text-sm">No flights available</div>
            ) : (
              flights.map((flight, index) => <FlightRow key={index} flight={flight} onClick={handleFlightClick} />)
            )}
          </div>
        </div>

        {/* Logout Button */}
        <div className="pt-1.5">
          <Button
            onClick={onLogout}
            variant="outline"
            className="w-full border-[#D71A21] text-[#D71A21] hover:bg-[#D71A21] hover:text-white bg-transparent"
          >
            Logout
          </Button>
        </div>
      </main>

      {/* Search Modal Overlay */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[100]">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setIsSearchOpen(false)
              setSearchQuery("")
            }}
          />

          {/* Search Modal */}
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
                placeholder="Search flights..."
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 text-sm text-gray-900 placeholder:text-gray-500 outline-none bg-transparent"
              />

              <Search className="h-5 w-5 text-[#D71A21]" />
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {!searchQuery.trim() ? (
                <div className="p-4">
                  <p className="text-sm text-gray-500">Start typing to search flights</p>
                  <p className="text-xs text-gray-400 mt-1">Search by flight number, destination, time, or ULD count</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-4">
                  <p className="text-sm text-gray-500">No flights found for "{searchQuery}"</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {searchResults.map((flight, index) => (
                    <button
                      key={index}
                      onClick={() => handleSearchResultClick(flight)}
                      className="w-full px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-gray-900">{flight.flightNumber}</span>
                            <span className="text-sm text-gray-600">{flight.eta}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <MapPin className="h-3.5 w-3.5 text-gray-400" />
                            <span className="text-sm text-gray-600">{flight.boardingPoint}</span>
                            <span className="text-xs text-gray-400">•</span>
                            <Package className="h-3.5 w-3.5 text-gray-400" />
                            <span className="text-sm text-gray-600">{flight.uldCount} ULDs</span>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* iOS-style file upload modal */}
      {showFileUpload && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleFileUploadCancel} />

          <div className="relative bg-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300 w-full max-w-md">
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Content */}
            <div className="px-4 pb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Upload File</h2>
              <p className="text-sm text-gray-600 mb-6">Select a CSV or Excel file to import flight data</p>

              {/* File input area */}
              <div className="mb-6">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                  disabled={isUploading}
                />
                <label
                  htmlFor="file-upload"
                  className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:border-[#D71A21] hover:bg-gray-50 transition-all active:scale-98"
                >
                  <FileUp className="h-12 w-12 text-gray-400 mb-3" />
                  <span className="text-sm font-medium text-gray-700">
                    {selectedFile ? selectedFile.name : "Tap to select file"}
                  </span>
                  <span className="text-xs text-gray-500 mt-1">CSV or Excel files only</span>
                </label>
              </div>

              {/* Selected file info */}
              {selectedFile && (
                <div className="mb-6 p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {(selectedFile.size / 1024).toFixed(2)} KB • {selectedFile.type || "Unknown type"}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        setSelectedFile(null)
                        setUploadError(null)
                        if (fileInputRef.current) {
                          fileInputRef.current.value = ""
                        }
                      }}
                      disabled={isUploading}
                      className="ml-3 p-2 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <X className="h-4 w-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              )}

              {uploadError && (
                <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-800">{uploadError}</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleFileUploadCancel}
                  disabled={isUploading}
                  className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors active:scale-98 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFileUploadSubmit}
                  disabled={!selectedFile || isUploading}
                  className="flex-1 py-3 px-4 bg-[#D71A21] text-white rounded-xl font-semibold hover:bg-[#B91419] transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-98"
                >
                  {isUploading ? "Uploading..." : "Upload"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <MenuDrawer isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} onNavigate={onNavigate} />
    </div>
  )
}

interface FlightRowProps {
  flight: Flight
  onClick: (flight: Flight) => void
}

function FlightRow({ flight, onClick }: FlightRowProps) {
  return (
    <button
      onClick={() => onClick(flight)}
      className="grid grid-cols-4 gap-1 px-1.5 py-1.5 text-sm hover:bg-gray-50 transition-colors w-full text-left group"
    >
      <div className="text-center font-semibold text-gray-900">{flight.flightNumber}</div>
      <div className="text-center text-gray-700">{flight.eta}</div>
      <div className="text-center text-gray-700">{flight.boardingPoint}</div>
      <div className="relative flex items-center justify-center pl-8">
        <span className="font-medium text-gray-900">{flight.uldCount}</span>
        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-[#D71A21] transition-colors ml-1" />
      </div>
    </button>
  )
}
