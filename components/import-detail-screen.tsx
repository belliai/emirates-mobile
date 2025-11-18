"use client"

import type React from "react"

import { ArrowLeft, Plane, Clock, MapPin, Package, Plus, X, ChevronRight } from "lucide-react"
import type { Flight, ULD, StatusHistoryEntry } from "@/lib/flight-data"
import { useState, useRef, useEffect } from "react"
import { useFlights } from "@/lib/flight-context"

interface ImportDetailScreenProps {
  flight: Flight
  onBack: () => void
  onULDSelect: (uld: ULD) => void
}

export default function ImportDetailScreen({ flight, onBack, onULDSelect }: ImportDetailScreenProps) {
  const { flights, updateULDStatus: updateGlobalStatus, addULD: addGlobalULD, username, addNewULD } = useFlights()

  const currentFlight = flights.find((f) => f.flightNumber === flight.flightNumber) || flight
  const [ulds, setUlds] = useState<ULD[]>(currentFlight.ulds)

  useEffect(() => {
    const updatedFlight = flights.find((f) => f.flightNumber === flight.flightNumber)
    if (updatedFlight) {
      setUlds(updatedFlight.ulds)
    }
  }, [flights, flight.flightNumber])

  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    uldNumber: "",
    uldshc: "",
    destination: "",
    remarks: "",
    status: 1,
  })

  const [swipeStates, setSwipeStates] = useState<{ [key: number]: number }>({})
  const [isSwipingStates, setIsSwipingStates] = useState<{ [key: number]: boolean }>({})
  const [hapticTriggered, setHapticTriggered] = useState<{ [key: number]: boolean }>({})
  const [leftHapticTriggered, setLeftHapticTriggered] = useState<{ [key: number]: boolean }>({})
  const touchStartX = useRef<number>(0)
  const touchCurrentX = useRef<number>(0)
  const touchStartTime = useRef<number>(0)
  const lastTouchX = useRef<number>(0)
  const lastTouchTime = useRef<number>(0)

  const triggerHaptic = () => {
    if ("vibrate" in navigator) {
      navigator.vibrate(10)
    }
  }

  const groupedUlds = ulds.reduce(
    (acc, uld, originalIndex) => {
      const status = uld.status
      if (!acc[status]) {
        acc[status] = []
      }
      acc[status].push({ uld, originalIndex })
      return acc
    },
    {} as Record<number, Array<{ uld: ULD; originalIndex: number }>>,
  )

  const sortedStatuses = Object.keys(groupedUlds)
    .map(Number)
    .sort((a, b) => a - b)

  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    const currentOffset = swipeStates[index] || 0
    touchStartX.current = e.touches[0].clientX
    touchCurrentX.current = e.touches[0].clientX
    touchStartTime.current = Date.now()
    lastTouchX.current = e.touches[0].clientX
    lastTouchTime.current = Date.now()
    setIsSwipingStates((prev) => ({ ...prev, [index]: true }))
    setHapticTriggered((prev) => ({ ...prev, [index]: false }))
    setLeftHapticTriggered((prev) => ({ ...prev, [index]: false }))
  }

  const handleTouchMove = (e: React.TouchEvent, index: number) => {
    lastTouchX.current = touchCurrentX.current
    lastTouchTime.current = Date.now()

    touchCurrentX.current = e.touches[0].clientX
    const currentOffset = swipeStates[index] || 0
    const touchDiff = touchCurrentX.current - touchStartX.current

    if (currentOffset < -50 && touchDiff < 0) {
      return
    }
    if (currentOffset > 100 && touchDiff > 0) {
      return
    }

    const diff = currentOffset + touchDiff

    const maxSwipe = diff < 0 ? -200 : 350
    let limitedDiff: number

    if (diff < 0) {
      const resistance = Math.abs(diff) / 200
      const easedDiff = diff * (1 - resistance * 0.3)
      limitedDiff = Math.max(easedDiff, maxSwipe)

      if (limitedDiff <= -100 && !hapticTriggered[index]) {
        triggerHaptic()
        setHapticTriggered((prev) => ({ ...prev, [index]: true }))
      }
    } else {
      const resistance = diff / 350
      const easedDiff = diff * (1 - resistance * 0.3)
      limitedDiff = Math.min(easedDiff, maxSwipe)

      if (limitedDiff >= 150 && !leftHapticTriggered[index]) {
        triggerHaptic()
        setLeftHapticTriggered((prev) => ({ ...prev, [index]: true }))
      }
    }

    setSwipeStates((prev) => ({ ...prev, [index]: limitedDiff }))
  }

  const handleTouchEnd = (index: number) => {
    const currentOffset = swipeStates[index] || 0
    const touchDistance = touchCurrentX.current - touchStartX.current
    const finalPosition = currentOffset + touchDistance

    setIsSwipingStates((prev) => ({ ...prev, [index]: false }))

    const currentTime = Date.now()
    const timeDiff = currentTime - lastTouchTime.current
    const distance = touchCurrentX.current - lastTouchX.current
    const velocity = timeDiff > 0 ? Math.abs(distance / timeDiff) : 0
    const isQuickSwipe = velocity > 0.5

    if (currentOffset < -50 && touchDistance > 0 && isQuickSwipe) {
      setSwipeStates((prev) => ({ ...prev, [index]: 0 }))
      return
    }

    if (currentOffset > 100 && touchDistance < 0 && isQuickSwipe) {
      setSwipeStates((prev) => ({ ...prev, [index]: 0 }))
      return
    }

    if (touchDistance < -150 && currentOffset === 0) {
      triggerHaptic()
      updateULDStatus(index, 5)
      setSwipeStates((prev) => ({ ...prev, [index]: 0 }))
    } else if (finalPosition < -50) {
      setSwipeStates((prev) => ({ ...prev, [index]: -200 }))
    } else if (finalPosition > 200) {
      setSwipeStates((prev) => ({ ...prev, [index]: 350 }))
    } else if (finalPosition > 100) {
      setSwipeStates((prev) => ({ ...prev, [index]: 350 }))
    } else {
      setSwipeStates((prev) => ({ ...prev, [index]: 0 }))
    }
  }

  const updateULDStatus = (index: number, newStatus: number) => {
    updateGlobalStatus(flight.flightNumber, index, newStatus as 1 | 2 | 3 | 4 | 5)
    setSwipeStates((prev) => ({ ...prev, [index]: 0 }))
  }

  const handleAddULD = (e: React.FormEvent) => {
    e.preventDefault()

    const statusHistory: StatusHistoryEntry[] = []
    const now = new Date()

    for (let i = 1; i <= formData.status; i++) {
      const minutesAgo = (formData.status - i) * 5
      statusHistory.push({
        status: i as 1 | 2 | 3 | 4 | 5,
        timestamp: new Date(now.getTime() - minutesAgo * 60000),
        changedBy: username || getRandomName(),
      })
    }

    const newULD: ULD = {
      uldNumber: formData.uldNumber,
      uldshc: formData.uldshc,
      destination: formData.destination,
      remarks: formData.remarks,
      status: formData.status as 1 | 2 | 3 | 4 | 5,
      statusHistory,
    }

    addGlobalULD(flight.flightNumber, newULD)
    addNewULD(formData.uldNumber)
    setShowAddForm(false)
    setFormData({
      uldNumber: "",
      uldshc: "",
      destination: "",
      remarks: "",
      status: 1,
    })
  }

  const parseBulkDate = (uldNumber: string): string => {
    const match = uldNumber.match(/\/(.+)$/)
    return match ? match[1] : ""
  }

  const getCleanBulkNumber = (uldNumber: string): string => {
    return uldNumber.split("/")[0]
  }

  const isBulkULD = (uld: ULD): boolean => {
    return uld.uldNumber.startsWith("BULK") && uld.remarks === "BULK"
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

  const renderShcChips = (uldshc: string) => {
    if (!uldshc || uldshc.trim() === "") return null

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

  const FICTIONAL_NAMES = [
    "Sarah Mitchell",
    "James Rodriguez",
    "Aisha Patel",
    "Mohammed Al-Rashid",
    "Elena Volkov",
    "Carlos Santos",
    "Yuki Tanaka",
    "Fatima Hassan",
    "David Chen",
    "Priya Sharma",
    "Ahmed Ibrahim",
    "Maria Garcia",
    "John Williams",
    "Leila Mansour",
    "Robert Johnson",
    "Amina Osman",
    "Michael Brown",
    "Zara Khan",
    "Thomas Anderson",
    "Nadia Abadi",
  ]

  function getRandomName(): string {
    return FICTIONAL_NAMES[Math.floor(Math.random() * FICTIONAL_NAMES.length)]
  }

  const handleCardClick = (index: number) => {
    const currentSwipeOffset = swipeStates[index] || 0

    if (currentSwipeOffset !== 0) {
      // Row is swiped, close it instead of navigating
      setSwipeStates((prev) => ({ ...prev, [index]: 0 }))
      return
    }

    // Row is not swiped, navigate to status history
    const selectedULD = ulds[index]
    onULDSelect(selectedULD)
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between px-2 py-1.5">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="h-5 w-5 text-gray-700" />
            </button>
            <h1 className="text-base font-semibold text-gray-900">ULDs</h1>
          </div>
          <button onClick={() => setShowAddForm(true)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <Plus className="h-5 w-5 text-gray-700" />
          </button>
        </div>
      </header>

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

      <div
        className="bg-white border-b border-gray-200 px-1.5 py-1.5 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onBack}
      >
        <div className="grid grid-cols-4 gap-1 text-center">
          <div className="text-sm font-semibold text-gray-900">{flight.flightNumber}</div>
          <div className="text-sm font-semibold text-gray-900">{flight.eta}</div>
          <div className="text-sm font-semibold text-gray-900">{flight.boardingPoint}</div>
          <div className="relative flex items-center justify-center pl-6">
            <span className="text-sm font-semibold text-gray-900">{flight.uldCount}</span>
            <ChevronRight className="h-5 w-5 text-white ml-1" />
          </div>
        </div>
      </div>

      <main className="p-1.5 space-y-1.5 overflow-x-hidden">
        {sortedStatuses.map((status, statusIndex) => (
          <div key={status}>
            <div className="px-1.5 py-0.5 mb-0.5">
              <span className="text-xs font-semibold text-gray-700">{getStatusLabel(status)}</span>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {groupedUlds[status].map(({ uld, originalIndex }, groupIndex) => {
                const swipeOffset = swipeStates[originalIndex] || 0
                const isActivelySwiping = isSwipingStates[originalIndex] || false

                const rightSwipeProgress = Math.min(Math.abs(Math.min(swipeOffset, 0)) / 150, 1)
                const actionOpacity = 0.7 + rightSwipeProgress * 0.3
                const actionScale = 0.95 + rightSwipeProgress * 0.05

                const leftSwipeProgress = Math.min(Math.max(swipeOffset, 0) / 200, 1)
                const leftActionOpacity = 0.7 + leftSwipeProgress * 0.3
                const leftActionScale = 0.95 + leftSwipeProgress * 0.05

                return (
                  <div key={originalIndex}>
                    <div className="relative overflow-hidden">
                      {swipeOffset <= -50 && (
                        <div
                          className="absolute right-0 top-0 bottom-0 w-[200px] bg-green-500 flex items-center justify-center rounded-r-lg transition-all duration-200"
                          style={{
                            opacity: actionOpacity,
                            transform: `scale(${actionScale})`,
                          }}
                        >
                          <button
                            onClick={() => updateULDStatus(originalIndex, 5)}
                            className="text-white text-xs font-semibold px-4 py-2"
                          >
                            ✓ 5) breakdown completed
                          </button>
                        </div>
                      )}

                      {swipeOffset >= 100 && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation()
                            setSwipeStates((prev) => ({ ...prev, [originalIndex]: 0 }))
                          }}
                          className="absolute left-0 top-0 bottom-0 w-[350px] bg-[#D71A21] flex items-stretch rounded-l-lg transition-all duration-200"
                          style={{
                            opacity: leftActionOpacity,
                            transform: `scale(${leftActionScale})`,
                          }}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              updateULDStatus(originalIndex, 2)
                            }}
                            className="flex-1 text-white text-[10px] font-semibold hover:bg-[#B91419] transition-colors px-1 leading-tight"
                          >
                            2) received by GHA (AACS)
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              updateULDStatus(originalIndex, 3)
                            }}
                            className="flex-1 text-white text-[10px] font-semibold hover:bg-[#B91419] transition-colors border-l border-red-300 px-1 leading-tight"
                          >
                            3) tunnel inducted (Skychain)
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              updateULDStatus(originalIndex, 4)
                            }}
                            className="flex-1 text-white text-[10px] font-semibold hover:bg-[#B91419] transition-colors border-l border-red-300 px-1 leading-tight"
                          >
                            4) store the ULD (MHS)
                          </button>
                        </div>
                      )}

                      <div
                        className="bg-white py-1.5 px-2 touch-pan-y relative"
                        style={{
                          transform: `translateX(${swipeOffset}px)`,
                          transition: isActivelySwiping ? "none" : "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
                        }}
                        onTouchStart={(e) => handleTouchStart(e, originalIndex)}
                        onTouchMove={(e) => handleTouchMove(e, originalIndex)}
                        onTouchEnd={() => handleTouchEnd(originalIndex)}
                        onClick={() => handleCardClick(originalIndex)}
                      >
                        <div className="space-y-0">
                          <div className="text-sm font-bold text-gray-900 break-words">
                            {isBulkULD(uld) ? getCleanBulkNumber(uld.uldNumber) : uld.uldNumber}
                          </div>
                          <div className="flex justify-between items-center text-xs text-gray-500 gap-2">
                            <span className="break-words">
                              {uld.destination} • {uld.remarks}
                            </span>
                            {isBulkULD(uld) && (
                              <span className="break-words whitespace-nowrap">{parseBulkDate(uld.uldNumber)}</span>
                            )}
                          </div>
                          <div className="break-words mt-1">{renderShcChips(uld.uldshc)}</div>
                        </div>
                      </div>

                      {groupIndex < groupedUlds[status].length - 1 && <div className="h-px bg-gray-100 mx-2" />}
                    </div>
                  </div>
                )
              })}
            </div>

            {statusIndex < sortedStatuses.length - 1 && <div className="my-4 border-t-2 border-gray-200" />}
          </div>
        ))}
      </main>

      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Add ULD</h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-700" />
              </button>
            </div>

            <form onSubmit={handleAddULD} className="p-4 space-y-4">
              <div>
                <label htmlFor="uldNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  ULD Number
                </label>
                <input
                  type="text"
                  id="uldNumber"
                  required
                  value={formData.uldNumber}
                  onChange={(e) => setFormData({ ...formData, uldNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D71A21]"
                  placeholder="e.g., PMC31580EK or BULK-EK0393/31-AUG-25"
                />
              </div>

              <div>
                <label htmlFor="uldshc" className="block text-sm font-medium text-gray-700 mb-1">
                  ULD SHC
                </label>
                <input
                  type="text"
                  id="uldshc"
                  required
                  value={formData.uldshc}
                  onChange={(e) => setFormData({ ...formData, uldshc: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D71A21]"
                  placeholder="e.g., HEA or EAW"
                />
              </div>

              <div>
                <label htmlFor="destination" className="block text-sm font-medium text-gray-700 mb-1">
                  Destination
                </label>
                <input
                  type="text"
                  id="destination"
                  required
                  value={formData.destination}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D71A21]"
                  placeholder="e.g., FRA or LAX"
                />
              </div>

              <div>
                <label htmlFor="remarks" className="block text-sm font-medium text-gray-700 mb-1">
                  Remarks
                </label>
                <input
                  type="text"
                  id="remarks"
                  required
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D71A21]"
                  placeholder="e.g., QWM or BULK"
                />
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D71A21]"
                >
                  <option value={1}>1) on aircraft</option>
                  <option value={2}>2) received by GHA (AACS)</option>
                  <option value={3}>3) tunnel inducted (Skychain)</option>
                  <option value={4}>4) store the ULD (MHS)</option>
                  <option value={5}>5) breakdown completed</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#D71A21] text-white rounded-lg font-medium hover:bg-[#B91419] transition-colors"
                >
                  Add ULD
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
