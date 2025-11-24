"use client"

import { ArrowLeft } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useLoadPlanLogs } from "@/lib/load-plan-log-context"
import type { LoadPlanDetail } from "./load-plan-types"

interface LoadPlanLogsScreenProps {
  loadPlan: LoadPlanDetail
  onBack: () => void
}

export default function LoadPlanLogsScreen({ loadPlan, onBack }: LoadPlanLogsScreenProps) {
  const { getLogs } = useLoadPlanLogs()
  const [isScrollable, setIsScrollable] = useState(false)
  const mainRef = useRef<HTMLDivElement>(null)
  const entries = [...getLogs(loadPlan.flight)].reverse()

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
  }, [entries])

  const formatDate = (date: Date) => {
    const d = new Date(date)
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    return `${month}/${day}`
  }

  const formatTime = (date: Date) => {
    const d = new Date(date)
    const hours = String(d.getHours()).padStart(2, "0")
    const minutes = String(d.getMinutes()).padStart(2, "0")
    return `${hours}:${minutes}`
  }

  const renderEntry = (entry: any) => {
    const actionLabels: Record<string, string> = {
      assign_uld: "Assigned ULD",
      split_awb: "Split AWB",
      offload_awb: "Offloaded AWB",
      mark_loaded: "Marked as loaded",
      unmark_loaded: "Unmarked as loaded",
    }

    return (
      <>
        <div className="font-medium text-sm text-gray-900">
          {actionLabels[entry.action] || entry.action} - {entry.awbNo}
        </div>
        {entry.details && (
          <div className="mt-1 text-xs text-gray-600 break-words">{entry.details}</div>
        )}
        {entry.sector && (
          <div className="mt-1 text-xs text-gray-500">Sector: {entry.sector}</div>
        )}
      </>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <button onClick={onBack} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </button>
          <h1 className="text-base font-semibold text-gray-900">Activity Log</h1>
        </div>
      </header>

      <main ref={mainRef} className="flex-1 overflow-y-auto">
        <div className="px-3 py-2">
          {entries.length === 0 ? (
            <div className="text-sm text-gray-500">No activity yet for this load plan.</div>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="relative pl-6 pb-3">
                <div className="absolute left-1 top-0.5 w-2 h-2 rounded-full border border-red-300 bg-white" />
                <div className="flex items-center justify-between">
                  {renderEntry(entry)}
                  <div className="text-xs text-gray-500 ml-2">
                    {formatDate(entry.timestamp)} {formatTime(entry.timestamp)}
                  </div>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-gray-600">
                  <span>By {entry.user}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}

