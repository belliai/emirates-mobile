"use client"

import { useState } from "react"
import { Plane, Clock, MapPin, Package, RefreshCw, Loader2 } from "lucide-react"
import MenuDrawer from "./menu-drawer"
import ScreeningDetailScreen from "./screening-detail-screen"

interface ScreeningScreenProps {
  onBack: () => void
  onNavigate: (screen: "landing" | "import" | "export" | "loadPlan" | "newULD" | "dropStatus" | "inductionStatus" | "reconciliation" | "screening") => void
}

type ScreeningFlight = {
  flightNumber: string
  destination: string
  etd: string
  shipmentCount: number
  defaultScreened?: {
    noOfShipments: number
    noOfPcs: number
    grWeight: number
  }
  defaultUnits?: {
    maBase: number
    lBase: number
    kBase: number
  }
}

const SCREENING_FLIGHTS: ScreeningFlight[] = [
  { flightNumber: "EK0213", destination: "MIA-BOG", etd: "02:15", shipmentCount: 0, defaultScreened: { noOfShipments: 0, noOfPcs: 0, grWeight: 0 }, defaultUnits: { maBase: 1, lBase: 0, kBase: 0 } },
  { flightNumber: "EK0231", destination: "IAD", etd: "02:20", shipmentCount: 0, defaultScreened: { noOfShipments: 0, noOfPcs: 5, grWeight: 1285 }, defaultUnits: { maBase: 1, lBase: 1, kBase: 0 } },
  { flightNumber: "EK0243", destination: "YUL", etd: "02:30", shipmentCount: 0, defaultScreened: { noOfShipments: 0, noOfPcs: 0, grWeight: 0 }, defaultUnits: { maBase: 0, lBase: 0, kBase: 0 } },
  { flightNumber: "EK0221", destination: "DFW", etd: "02:40", shipmentCount: 0, defaultScreened: { noOfShipments: 0, noOfPcs: 0, grWeight: 0 }, defaultUnits: { maBase: 0, lBase: 0, kBase: 0 } },
  { flightNumber: "EK0203", destination: "JFK", etd: "02:50", shipmentCount: 0, defaultScreened: { noOfShipments: 0, noOfPcs: 0, grWeight: 0 }, defaultUnits: { maBase: 0, lBase: 0, kBase: 0 } },
  { flightNumber: "EK0241", destination: "YYZ", etd: "03:30", shipmentCount: 0, defaultScreened: { noOfShipments: 0, noOfPcs: 0, grWeight: 0 }, defaultUnits: { maBase: 0, lBase: 0, kBase: 0 } },
  { flightNumber: "EK0237", destination: "BOS", etd: "08:20", shipmentCount: 2, defaultScreened: { noOfShipments: 2, noOfPcs: 822, grWeight: 9242 }, defaultUnits: { maBase: 4, lBase: 0, kBase: 0 } },
  { flightNumber: "EK0201", destination: "JFK", etd: "08:30", shipmentCount: 5, defaultScreened: { noOfShipments: 5, noOfPcs: 120, grWeight: 1230 }, defaultUnits: { maBase: 4, lBase: 1, kBase: 0 } },
  { flightNumber: "EK0215", destination: "LAX", etd: "08:55", shipmentCount: 0, defaultScreened: { noOfShipments: 0, noOfPcs: 0, grWeight: 0 }, defaultUnits: { maBase: 0, lBase: 4, kBase: 0 } },
  { flightNumber: "EK0225", destination: "SFO", etd: "09:10", shipmentCount: 2, defaultScreened: { noOfShipments: 2, noOfPcs: 11, grWeight: 289 }, defaultUnits: { maBase: 0, lBase: 0, kBase: 1 } },
  { flightNumber: "EK0205", destination: "JFK", etd: "09:30", shipmentCount: 1, defaultScreened: { noOfShipments: 1, noOfPcs: 45, grWeight: 1300 }, defaultUnits: { maBase: 0, lBase: 0, kBase: 2 } },
  { flightNumber: "EK0211", destination: "IAH", etd: "09:30", shipmentCount: 3, defaultScreened: { noOfShipments: 3, noOfPcs: 4, grWeight: 22 }, defaultUnits: { maBase: 1, lBase: 0, kBase: 0 } },
  { flightNumber: "EK0235", destination: "ORD", etd: "09:55", shipmentCount: 2, defaultScreened: { noOfShipments: 2, noOfPcs: 360, grWeight: 4205 }, defaultUnits: { maBase: 1, lBase: 0, kBase: 0 } },
  { flightNumber: "EK0229", destination: "SEA", etd: "09:55", shipmentCount: 0, defaultScreened: { noOfShipments: 0, noOfPcs: 0, grWeight: 0 }, defaultUnits: { maBase: 0, lBase: 0, kBase: 1 } },
  { flightNumber: "EK0209", destination: "EWR", etd: "10:50", shipmentCount: 1, defaultScreened: { noOfShipments: 1, noOfPcs: 4, grWeight: 160 }, defaultUnits: { maBase: 0, lBase: 1, kBase: 0 } },
  { flightNumber: "EK0957", destination: "BEY", etd: "07:35", shipmentCount: 0, defaultScreened: { noOfShipments: 0, noOfPcs: 0, grWeight: 0 }, defaultUnits: { maBase: 8, lBase: 0, kBase: 2 } },
  { flightNumber: "EK0943", destination: "BGW", etd: "12:40", shipmentCount: 0, defaultScreened: { noOfShipments: 0, noOfPcs: 0, grWeight: 0 }, defaultUnits: { maBase: 3, lBase: 0, kBase: 0 } },
  { flightNumber: "EK0953", destination: "BEY", etd: "15:10", shipmentCount: 0, defaultScreened: { noOfShipments: 0, noOfPcs: 0, grWeight: 0 }, defaultUnits: { maBase: 2, lBase: 1, kBase: 1 } },
]

export default function ScreeningScreen({ onBack, onNavigate }: ScreeningScreenProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [loading] = useState(false)
  const [flights] = useState<ScreeningFlight[]>(SCREENING_FLIGHTS)
  const [selectedFlight, setSelectedFlight] = useState<ScreeningFlight | null>(null)

  // If a flight is selected, show the detail screen
  if (selectedFlight) {
    return (
      <ScreeningDetailScreen
        flight={selectedFlight}
        onBack={() => setSelectedFlight(null)}
      />
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Menu Drawer */}
      <MenuDrawer isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} onNavigate={onNavigate} />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between px-2 py-1.5">
          <div className="flex items-center gap-1">
            <button onClick={() => setIsMenuOpen(true)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="h-5 w-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          <h1 className="text-base font-semibold text-gray-900">Screening</h1>

          <div className="flex items-center">
            <button
              disabled
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh data"
            >
              <RefreshCw className="h-5 w-5 text-gray-700" />
            </button>
          </div>
        </div>
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
      <main className="px-1.5 pb-20">
        <div className="bg-white overflow-hidden">
          {/* Table Rows */}
          <div className="divide-y divide-gray-200">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                <span className="ml-2 text-sm text-gray-500">Loading data...</span>
              </div>
            ) : flights.length === 0 ? (
              <div className="px-1.5 py-3 text-center text-gray-500 text-sm">No screening data available</div>
            ) : (
              flights.map((flight, index) => (
                <ScreeningFlightRow 
                  key={index} 
                  flight={flight}
                  onClick={() => setSelectedFlight(flight)}
                />
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

interface ScreeningFlightRowProps {
  flight: ScreeningFlight
  onClick: () => void
}

function ScreeningFlightRow({ flight, onClick }: ScreeningFlightRowProps) {
  return (
    <button
      onClick={onClick}
      className="grid grid-cols-4 gap-1 px-1.5 py-1.5 text-sm hover:bg-gray-50 transition-colors w-full text-left group"
    >
      <div className="text-center font-semibold text-gray-900">{flight.flightNumber}</div>
      <div className="text-center text-gray-700">{flight.etd}</div>
      <div className="text-center text-gray-700">{flight.destination}</div>
      <div className="relative flex items-center justify-center pl-8">
        <span className="font-medium text-gray-900">{flight.shipmentCount}</span>
        <svg
          className="h-5 w-5 text-gray-400 group-hover:text-[#D71A21] transition-colors ml-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  )
}


