"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import type { LoadPlanDetail } from "@/components/load-plan-types"

export interface LoadPlanLogEntry {
  id: string
  timestamp: Date
  user: string
  action: "assign_uld" | "split_awb" | "offload_awb" | "mark_loaded" | "unmark_loaded"
  awbNo: string
  details: string
  sector?: string
}

interface LoadPlanLogContextType {
  logs: Map<string, LoadPlanLogEntry[]>
  addLog: (flightNumber: string, entry: Omit<LoadPlanLogEntry, "id" | "timestamp">) => void
  getLogs: (flightNumber: string) => LoadPlanLogEntry[]
  clearLogs: (flightNumber: string) => void
}

const LoadPlanLogContext = createContext<LoadPlanLogContextType | undefined>(undefined)

function cryptoRandomId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function getRandomName() {
  const names = [
    "Sarah Mitchell",
    "James Rodriguez",
    "Emily Chen",
    "Michael Thompson",
    "Jessica Williams",
    "David Martinez",
    "Amanda Brown",
    "Christopher Lee",
    "Ashley Davis",
    "Matthew Wilson",
  ]
  return names[Math.floor(Math.random() * names.length)]
}

export function LoadPlanLogProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<Map<string, LoadPlanLogEntry[]>>(new Map())

  const addLog = (flightNumber: string, entry: Omit<LoadPlanLogEntry, "id" | "timestamp">) => {
    setLogs((prev) => {
      const updated = new Map(prev)
      const flightLogs = updated.get(flightNumber) || []
      updated.set(flightNumber, [
        ...flightLogs,
        {
          ...entry,
          id: cryptoRandomId(),
          timestamp: new Date(),
          user: entry.user || getRandomName(),
        },
      ])
      return updated
    })
  }

  const getLogs = (flightNumber: string): LoadPlanLogEntry[] => {
    return logs.get(flightNumber) || []
  }

  const clearLogs = (flightNumber: string) => {
    setLogs((prev) => {
      const updated = new Map(prev)
      updated.delete(flightNumber)
      return updated
    })
  }

  return (
    <LoadPlanLogContext.Provider value={{ logs, addLog, getLogs, clearLogs }}>
      {children}
    </LoadPlanLogContext.Provider>
  )
}

export function useLoadPlanLogs() {
  const context = useContext(LoadPlanLogContext)
  if (context === undefined) {
    throw new Error("useLoadPlanLogs must be used within a LoadPlanLogProvider")
  }
  return context
}

