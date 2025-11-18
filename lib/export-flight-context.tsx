"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { Flight, ULD, StatusHistoryEntry } from "@/lib/flight-data"

type UldType = "PMC/AMF" | "ALF/PLA" | "AKE/AKL"

export interface ExportLogEntry {
  id: string
  timestamp: Date
  user: string
  action: "increment" | "decrement" | "set_remarks"
  type?: UldType
  value?: number
  remarks?: string
}

export interface ExportProgress {
  pmc: number
  alf: number
  ake: number
  remarks: string
  log: ExportLogEntry[]
}

interface ExportFlightContextType {
  flights: Flight[]
  loading: boolean
  username: string
  newULDs: string[]
  setUsername: (name: string) => void
  updateULDStatus: (flightNumber: string, uldIndex: number, newStatus: 1 | 2 | 3 | 4 | 5) => void
  addMultipleStatusUpdates: (flightNumber: string, uldIndex: number, statuses: Array<1 | 2 | 3 | 4 | 5>) => void
  addULD: (flightNumber: string, uld: ULD) => void
  refreshFlights: () => Promise<void>
  addNewULD: (uldNumber: string) => void
  removeNewULD: (uldNumber: string) => void
  clearNewULDs: () => void
  setFlights: (flights: Flight[]) => void
  mergeFlights: (incoming: Flight[]) => void
  getProgress: (flight: Flight) => ExportProgress
  changeCount: (flight: Flight, type: UldType, delta: number) => void
  setRemarks: (flight: Flight, remarks: string) => void
}

const ExportFlightContext = createContext<ExportFlightContextType | undefined>(undefined)

export function ExportFlightProvider({ children }: { children: ReactNode }) {
  const [flights, setFlights] = useState<Flight[]>([])
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState<string>("")
  const [newULDs, setNewULDs] = useState<string[]>([])
  const [progressMap, setProgressMap] = useState<Record<string, ExportProgress>>({})

  useEffect(() => {
    loadFlights()
  }, [])

  const loadFlights = async () => {
    try {
      const res = await fetch("/default-flights.json")
      if (!res.ok) throw new Error("Failed to load default flights")
      const data = (await res.json()) as Flight[]
      setFlights(data)
    } catch (e) {
      console.error("[v0] Failed to load default flights (export):", e)
      setFlights([])
    } finally {
      setLoading(false)
    }
  }

  const updateULDStatus = (flightNumber: string, uldIndex: number, newStatus: 1 | 2 | 3 | 4 | 5) => {
    setFlights((prevFlights) =>
      prevFlights.map((flight) => {
        if (flight.flightNumber === flightNumber) {
          const updatedUlds = [...flight.ulds]
          const currentUld = updatedUlds[uldIndex]
          updatedUlds[uldIndex] = {
            ...currentUld,
            status: newStatus,
            statusHistory: [
              ...(currentUld.statusHistory || []),
              {
                status: newStatus,
                timestamp: new Date(),
                changedBy: username || getRandomName(),
              },
            ],
          }
          return { ...flight, ulds: updatedUlds }
        }
        return flight
      }),
    )
  }

  const addMultipleStatusUpdates = (flightNumber: string, uldIndex: number, statuses: Array<1 | 2 | 3 | 4 | 5>) => {
    setFlights((prevFlights) =>
      prevFlights.map((flight) => {
        if (flight.flightNumber === flightNumber) {
          const updatedUlds = [...flight.ulds]
          const currentUld = updatedUlds[uldIndex]
          const changedBy = username || getRandomName()
          const newEntries = statuses.map((status) => ({
            status,
            timestamp: new Date(),
            changedBy,
          }))
          updatedUlds[uldIndex] = {
            ...currentUld,
            status: statuses[statuses.length - 1],
            statusHistory: [...(currentUld.statusHistory || []), ...newEntries],
          }
          return { ...flight, ulds: updatedUlds }
        }
        return flight
      }),
    )
  }

  const addULD = (flightNumber: string, uld: ULD) => {
    setFlights((prevFlights) =>
      prevFlights.map((flight) => {
        if (flight.flightNumber === flightNumber) {
          return { ...flight, ulds: [...flight.ulds, uld], uldCount: flight.ulds.length + 1 }
        }
        return flight
      }),
    )
  }

  const refreshFlights = async () => {
    await loadFlights()
  }

  const addNewULD = (uldNumber: string) => setNewULDs((prev) => [...prev, uldNumber])
  const removeNewULD = (uldNumber: string) => setNewULDs((prev) => prev.filter((uld) => uld !== uldNumber))
  const clearNewULDs = () => setNewULDs([])

  const keyOf = (f: Flight) => `${f.flightNumber}-${f.eta}-${f.boardingPoint}`

  const ensureProgress = (f: Flight): ExportProgress => {
    const k = keyOf(f)
    const existing = progressMap[k]
    if (existing) return existing
    const init: ExportProgress = { pmc: 0, alf: 0, ake: 0, remarks: "", log: [] }
    setProgressMap((prev) => ({ ...prev, [k]: init }))
    return init
  }

  const getProgress = (flight: Flight): ExportProgress => {
    return progressMap[keyOf(flight)] || { pmc: 0, alf: 0, ake: 0, remarks: "", log: [] }
  }

  const changeCount = (flight: Flight, type: UldType, delta: number) => {
    const k = keyOf(flight)
    setProgressMap((prev) => {
      const cur = prev[k] || { pmc: 0, alf: 0, ake: 0, remarks: "", log: [] }
      const next = { ...cur }
      const d = Number.isFinite(delta) ? Math.trunc(delta) : 0
      if (type === "PMC/AMF") next.pmc = Math.max(0, (next.pmc || 0) + d)
      if (type === "ALF/PLA") next.alf = Math.max(0, (next.alf || 0) + d)
      if (type === "AKE/AKL") next.ake = Math.max(0, (next.ake || 0) + d)
      const user = username || getRandomName()
      next.log = [
        ...next.log,
        {
          id: cryptoRandomId(),
          timestamp: new Date(),
          user,
          action: d >= 0 ? "increment" : "decrement",
          type,
          value: type === "PMC/AMF" ? next.pmc : type === "ALF/PLA" ? next.alf : next.ake,
        },
      ]
      return { ...prev, [k]: next }
    })
  }

  const setRemarks = (flight: Flight, remarks: string) => {
    const k = keyOf(flight)
    setProgressMap((prev) => {
      const cur = prev[k] || { pmc: 0, alf: 0, ake: 0, remarks: "", log: [] }
      const user = username || getRandomName()
      const next = {
        ...cur,
        remarks,
        log: [
          ...cur.log,
          { id: cryptoRandomId(), timestamp: new Date(), user, action: "set_remarks", remarks },
        ],
      }
      return { ...prev, [k]: next }
    })
  }

  return (
    <ExportFlightContext.Provider
      value={{
        flights,
        loading,
        username,
        newULDs,
        setUsername,
        updateULDStatus,
        addMultipleStatusUpdates,
        addULD,
        refreshFlights,
        addNewULD,
        removeNewULD,
        clearNewULDs,
        setFlights,
        mergeFlights: (incoming: Flight[]) => {
          setFlights((prev) => mergeFlightLists(prev, incoming))
        },
        getProgress,
        changeCount,
        setRemarks,
      }}
    >
      {children}
    </ExportFlightContext.Provider>
  )
}

export function useExportFlights() {
  const context = useContext(ExportFlightContext)
  if (context === undefined) {
    throw new Error("useExportFlights must be used within an ExportFlightProvider")
  }
  return context
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

function mergeFlightLists(base: Flight[], incoming: Flight[]): Flight[] {
  const map = new Map<string, Flight>()
  const keyOf = (f: Flight) => `${f.flightNumber}-${f.eta}-${f.boardingPoint}`

  for (const f of base) map.set(keyOf(f), { ...f, ulds: [...f.ulds] })
  for (const f of incoming) {
    const k = keyOf(f)
    if (!map.has(k)) {
      map.set(k, { ...f, ulds: [...f.ulds] })
    } else {
      const existing = map.get(k)!
      const combinedUlds = existing.ulds.length >= f.ulds.length ? existing.ulds : f.ulds
      map.set(k, { ...existing, ...f, ulds: combinedUlds, uldCount: combinedUlds.length })
    }
  }
  return Array.from(map.values())
}

function cryptoRandomId(): string {
  // Simple unique id generator
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    // @ts-ignore
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}
