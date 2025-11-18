"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { getFlightData, type Flight, type ULD, type StatusHistoryEntry } from "@/lib/flight-data"

interface FlightContextType {
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
  randomizeFlightData: () => void
  setFlights: (flights: Flight[]) => void
  mergeFlights: (incoming: Flight[]) => void
}

const FlightContext = createContext<FlightContextType | undefined>(undefined)

export function FlightProvider({ children }: { children: ReactNode }) {
  const [flights, setFlights] = useState<Flight[]>([])
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState<string>("")
  const [newULDs, setNewULDs] = useState<string[]>([])

  useEffect(() => {
    loadFlights()
  }, [])

  const loadFlights = async () => {
    const data = await getFlightData()
    setFlights(data)
    setLoading(false)
  }

  const randomizeFlightData = () => {
    const flightNumbers = ["EK405", "EK816", "EK569", "EK523", "EK795", "EK802", "EK449", "EK766", "EK431", "EK585"]
    const destinations = [
      "MEL",
      "DAD",
      "BKK",
      "HYD",
      "DMM",
      "LUN",
      "COK",
      "RUH",
      "BLR",
      "TRV",
      "CKY",
      "JED",
      "AKL",
      "JNB",
      "BNE",
      "KUL",
      "SIN",
    ]
    const boardingPoints = ["DAC", "KWI", "SIN", "BKK", "HYD", "MEL"]

    const currentFlightCount = flights.length
    const numFlights = Math.max(currentFlightCount, 8)
    const newFlights: Flight[] = []

    for (let i = 0; i < numFlights; i++) {
      const flightNumber = flightNumbers[Math.floor(Math.random() * flightNumbers.length)]
      const boardingPoint = boardingPoints[Math.floor(Math.random() * boardingPoints.length)]

      const hours = Math.floor(Math.random() * 18) + 6
      const minutes = Math.floor(Math.random() * 60)
      const eta = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`

      const numUlds = Math.floor(Math.random() * 10) + 3
      const ulds: ULD[] = []

      for (let j = 0; j < numUlds; j++) {
        const destination = destinations[Math.floor(Math.random() * destinations.length)]
        ulds.push(generateRandomULD(destination))
      }

      newFlights.push({
        flightNumber,
        eta,
        boardingPoint,
        uldCount: ulds.length,
        ulds,
      })
    }

    setFlights(newFlights)
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

          return {
            ...flight,
            ulds: updatedUlds,
          }
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

          return {
            ...flight,
            ulds: updatedUlds,
          }
        }
        return flight
      }),
    )
  }

  const addULD = (flightNumber: string, uld: ULD) => {
    setFlights((prevFlights) =>
      prevFlights.map((flight) => {
        if (flight.flightNumber === flightNumber) {
          return {
            ...flight,
            ulds: [...flight.ulds, uld],
            uldCount: flight.ulds.length + 1,
          }
        }
        return flight
      }),
    )
  }

  const refreshFlights = async () => {
    await loadFlights()
  }

  const addNewULD = (uldNumber: string) => {
    setNewULDs((prev) => [...prev, uldNumber])
  }

  const removeNewULD = (uldNumber: string) => {
    setNewULDs((prev) => prev.filter((uld) => uld !== uldNumber))
  }

  const clearNewULDs = () => {
    setNewULDs([])
  }

  return (
    <FlightContext.Provider
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
        randomizeFlightData,
        setFlights,
        mergeFlights: (incoming: Flight[]) => {
          setFlights((prev) => mergeFlightLists(prev, incoming))
        },
      }}
    >
      {children}
    </FlightContext.Provider>
  )
}

export function useFlights() {
  const context = useContext(FlightContext)
  if (context === undefined) {
    throw new Error("useFlights must be used within a FlightProvider")
  }
  return context
}

const DESTINATIONS = ["DXB", "LAX", "JFK", "LHR", "SIN", "HKG", "SYD", "FRA", "CDG", "NRT"]
const REMARKS = ["PEP", "BULK", "CGO", "ECC", "UCB", "EAP", "FCE", "ECP"]
const ULD_TYPES = ["PMC", "AKE", "AKN", "PKC", "PAG", "BULK"]

function getRandomName(): string {
  return FICTIONAL_NAMES[Math.floor(Math.random() * FICTIONAL_NAMES.length)]
}

function getRandomDestination(): string {
  return DESTINATIONS[Math.floor(Math.random() * DESTINATIONS.length)]
}

function getRandomRemark(): string {
  return REMARKS[Math.floor(Math.random() * REMARKS.length)]
}

function generateRandomULD(destination?: string): ULD {
  const type = ULD_TYPES[Math.floor(Math.random() * ULD_TYPES.length)]
  const number =
    type === "BULK"
      ? `BULK-EK${Math.floor(Math.random() * 10000)
          .toString()
          .padStart(4, "0")}`
      : `${type}${Math.floor(Math.random() * 100000)
          .toString()
          .padStart(5, "0")}EK`

  const dest = destination || getRandomDestination()

  const shcOptions = ["", "ELI-ELM-RDS-REQ-RMD", "ELI-ELM", "RDS-REQ", "PER", "AVI", "DGR"]
  const uldshc = shcOptions[Math.floor(Math.random() * shcOptions.length)]

  const status = (Math.floor(Math.random() * 5) + 1) as 1 | 2 | 3 | 4 | 5

  const statusHistory: StatusHistoryEntry[] = []
  for (let s = 1; s <= status; s++) {
    statusHistory.push({
      status: s as 1 | 2 | 3 | 4 | 5,
      timestamp: new Date(Date.now() - (status - s + 1) * 60 * 60 * 1000),
      changedBy: getRandomName(),
    })
  }

  return {
    uldNumber: number,
    destination: dest,
    remarks: getRandomRemark(),
    status,
    uldshc,
    statusHistory,
  }
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

// Merge helper for combining multiple uploads
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
      // Prefer non-empty ULDs if incoming has them
      const combinedUlds = existing.ulds.length >= f.ulds.length ? existing.ulds : f.ulds
      map.set(k, { ...existing, ...f, ulds: combinedUlds, uldCount: combinedUlds.length })
    }
  }
  return Array.from(map.values())
}
