"use client"
import { ArrowLeft } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import type { ULD } from "@/lib/flight-data"

interface ImportHistoryScreenProps {
  uld: ULD
  onBack: () => void
  onStatusUpdate: (newStatus: number) => void
  onMultipleStatusUpdates: (statuses: Array<1 | 2 | 3 | 4 | 5>) => void
}

export default function ImportHistoryScreen({
  uld,
  onBack,
  onStatusUpdate,
  onMultipleStatusUpdates,
}: ImportHistoryScreenProps) {
  const [isScrollable, setIsScrollable] = useState(false)
  const mainRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const checkScrollable = () => {
      if (mainRef.current) {
        const hasScroll = mainRef.current.scrollHeight > mainRef.current.clientHeight
        setIsScrollable(hasScroll)
      }
    }

    checkScrollable()
    window.addEventListener("resize", checkScrollable)
    return () => window.removeEventListener("resize", checkScrollable)
  }, [uld.statusHistory])

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

  const getStatusColor = (status: number) => {
    switch (status) {
      case 1:
        return "rgba(215, 26, 33, 0.25)" // Very light Emirates red (25% opacity)
      case 2:
        return "rgba(215, 26, 33, 0.4)" // Light Emirates red (40% opacity)
      case 3:
        return "rgba(215, 26, 33, 0.6)" // Medium Emirates red (60% opacity)
      case 4:
        return "rgba(215, 26, 33, 0.8)" // Strong Emirates red (80% opacity)
      case 5:
        return "#D71A21" // Full Emirates red (100% opacity)
      default:
        return "rgba(215, 26, 33, 0.25)"
    }
  }

  const formatDate = (date: Date) => {
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${month}/${day}`
  }

  const formatTime = (date: Date) => {
    const hours = String(date.getHours()).padStart(2, "0")
    const minutes = String(date.getMinutes()).padStart(2, "0")
    return `${hours}:${minutes}`
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

  const latestStatus =
    uld.statusHistory && uld.statusHistory.length > 0
      ? uld.statusHistory[uld.statusHistory.length - 1].status
      : uld.status

  const isCompleted = latestStatus === 5
  const buttonText = isCompleted ? "Unmark as Completed" : "Mark as Completed"

  const handleToggleCompletion = () => {
    if (isCompleted) {
      const confirmed = window.confirm(
        "Are you sure you want to unmark as completed?\n\nThis will change the status\nfrom 5) breakdown completed\nto 4) store the ULD (MHS)",
      )
      if (confirmed) {
        onStatusUpdate(4)
      }
    } else {
      const statusesToAdd: Array<1 | 2 | 3 | 4 | 5> = []
      for (let status = latestStatus + 1; status <= 5; status++) {
        statusesToAdd.push(status as 1 | 2 | 3 | 4 | 5)
      }
      onMultipleStatusUpdates(statusesToAdd)
    }
  }

  const getPersonName = (status: number): string => {
    const names = [
      "Ahmed Hassan",
      "Sarah Johnson",
      "Mohammed Ali",
      "Emily Chen",
      "Fatima Ahmed",
      "David Smith",
      "Aisha Khan",
      "John Williams",
    ]
    // Use status to consistently pick a name
    return names[status % names.length]
  }

  // This allows showing duplicate statuses (e.g., 1→2→3→4→5→4 when unmarking)
  const displayTimeline = () => {
    if (!uld.statusHistory || uld.statusHistory.length === 0) {
      // If no history, create a single entry for current status
      return [
        {
          status: uld.status,
          timestamp: new Date(),
          changedBy: getPersonName(uld.status),
        },
      ]
    }

    // Return the actual history as-is, preserving all entries including duplicates
    return uld.statusHistory
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

  const timeline = displayTimeline()
  const reversedTimeline = [...timeline].reverse()

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <button onClick={onBack} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </button>
          <h1 className="text-base font-semibold text-gray-900">Status History</h1>
        </div>
      </header>

      {/* ULD Info */}
      <div className="bg-gray-50 border-b border-gray-200 px-2 py-1.5">
        {/* Row 1: ULD Number */}
        <div className="text-sm font-bold text-gray-900 mb-0 break-words">
          {isBulkULD(uld) ? getCleanBulkNumber(uld.uldNumber) : uld.uldNumber}
        </div>

        {/* Row 2: destination • remarks (left), date (right) for BULK only */}
        <div className="flex justify-between items-center text-xs text-gray-500 gap-2">
          <span className="break-words">
            {uld.destination} • {uld.remarks}
          </span>
          {isBulkULD(uld) && <span className="break-words whitespace-nowrap">{parseBulkDate(uld.uldNumber)}</span>}
        </div>

        {/* Row 3: SHC chips (always) */}
        <div className="mt-1 break-words">{renderShcChips(uld.uldshc)}</div>
      </div>

      <main ref={mainRef} className={`flex-1 p-2 ${isScrollable ? "pb-32" : "pb-40"} overflow-y-auto`}>
        {reversedTimeline.length > 0 ? (
          <div className="space-y-1">
            {reversedTimeline.map((entry, index) => {
              const timestamp = typeof entry.timestamp === "string" ? new Date(entry.timestamp) : entry.timestamp

              return (
                <div key={index} className="flex items-center gap-2 h-14">
                  {/* Date and Time */}
                  <div className="text-xs font-medium w-14 flex-shrink-0 flex flex-col items-center justify-center">
                    <span className="text-gray-500 whitespace-nowrap">{formatDate(timestamp)}</span>
                    <span className="text-gray-500 whitespace-nowrap">{formatTime(timestamp)}</span>
                  </div>

                  <div className="relative flex items-center justify-center w-4 h-full flex-shrink-0">
                    {/* Vertical bar - uniform size for all entries */}
                    <div className="absolute w-0.5 h-10 bg-gray-300 z-0" />

                    {/* Circle positioned on bar based on status (1=top, 3=middle, 5=bottom) */}
                    <div
                      className="absolute w-4 h-4 rounded-full border-2 border-white z-[5]"
                      style={{
                        backgroundColor: getStatusColor(entry.status),
                        top: `${((entry.status - 1) / 4) * 100}%`,
                        transform: "translateY(-50%)",
                      }}
                    />
                  </div>

                  {/* Name and Status */}
                  <div className="flex-1 flex flex-col justify-center min-w-0">
                    <span className="text-xs font-medium text-gray-900 whitespace-nowrap truncate">
                      {entry.changedBy || getPersonName(entry.status)}
                    </span>
                    <span className="text-xs text-gray-500 whitespace-nowrap truncate">
                      changed to {getStatusLabel(entry.status)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-6 text-sm">No status history available</div>
        )}
      </main>

      <div
        className={`${isScrollable ? "sticky bottom-0" : "fixed bottom-0"} left-0 right-0 h-40 bg-white border-t border-gray-200 z-40`}
      />

      <div
        className={`${isScrollable ? "sticky bottom-20" : "fixed bottom-20"} left-0 right-0 bg-transparent z-50 flex flex-col gap-2 p-2`}
      >
        <button
          onClick={handleToggleCompletion}
          className="w-full py-2 bg-[#D71A21] text-white rounded-lg font-semibold hover:bg-[#B91419] transition-colors text-sm"
        >
          {buttonText}
        </button>
      </div>
    </div>
  )
}
