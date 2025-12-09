"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, FileText, ChevronUp, ChevronDown } from "lucide-react"

interface ScreeningDetailScreenProps {
  flight: {
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
  onBack: () => void
}

type ScreeningData = {
  noOfShipments: number
  noOfPcs: string
  grWeight: string
  maBase: number
  lBase: number
  kBase: number
  remarks: string
}

export default function ScreeningDetailScreen({ flight, onBack }: ScreeningDetailScreenProps) {
  const storageKey = `screening-${flight.flightNumber}`
  
  // Load saved data or use defaults
  const [data, setData] = useState<ScreeningData>(() => {
    const defaultData = {
      noOfShipments: 0, // Empty, will show as placeholder
      noOfPcs: "", // Empty, will show as placeholder
      grWeight: String(flight.defaultScreened?.grWeight || 0), // Pre-filled with actual value
      maBase: flight.defaultUnits?.maBase || 0,
      lBase: flight.defaultUnits?.lBase || 0,
      kBase: flight.defaultUnits?.kBase || 0,
      remarks: "",
    }

    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const savedData = JSON.parse(saved)
        // If grWeight is empty in saved data, use default value
        return {
          ...savedData,
          grWeight: savedData.grWeight || String(flight.defaultScreened?.grWeight || 0),
          maBase: savedData.maBase ?? flight.defaultUnits?.maBase ?? 0,
          lBase: savedData.lBase ?? flight.defaultUnits?.lBase ?? 0,
          kBase: savedData.kBase ?? flight.defaultUnits?.kBase ?? 0,
        }
      }
    }
    // Initialize with default values
    // Gr. Wt. gets pre-filled with actual value like Units Build
    return defaultData
  })

  // Auto-save whenever data changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, JSON.stringify(data))
    }
  }, [data, storageKey])

  const handleFieldChange = (field: keyof ScreeningData, value: string | number) => {
    setData((prev) => ({ ...prev, [field]: value }))
  }

  const handleShipmentsChange = (delta: number) => {
    setData((prev) => ({
      ...prev,
      noOfShipments: Math.max(0, prev.noOfShipments + delta),
    }))
  }

  const handleBaseChange = (field: "maBase" | "lBase" | "kBase", delta: number) => {
    setData((prev) => ({
      ...prev,
      [field]: Math.max(0, prev[field] + delta),
    }))
  }

  const [maInput, setMaInput] = useState(String(data.maBase))
  const [lInput, setLInput] = useState(String(data.lBase))
  const [kInput, setKInput] = useState(String(data.kBase))

  useEffect(() => {
    setMaInput(String(data.maBase))
    setLInput(String(data.lBase))
    setKInput(String(data.kBase))
  }, [data.maBase, data.lBase, data.kBase])

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between px-2 py-1.5">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="h-5 w-5 text-gray-700" />
            </button>
            <h1 className="text-base font-semibold text-gray-900">Screening Details</h1>
          </div>
        </div>
      </header>

      {/* Flight Info Banner */}
      <div className="bg-[#D71A21] px-3 py-2">
        <div className="flex items-center justify-between text-white">
          <div className="text-sm font-semibold">{flight.flightNumber}</div>
          <div className="text-sm">{flight.etd}</div>
          <div className="text-sm">{flight.destination}</div>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {/* Top Section - Screened Info */}
        <div className="bg-white">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Screened</h2>
            <button
              onClick={() => {
                setData((prev) => ({
                  ...prev,
                  noOfShipments: flight.defaultScreened?.noOfShipments || 0,
                  noOfPcs: String(flight.defaultScreened?.noOfPcs || 0),
                }))
              }}
              className="px-4 py-2 text-sm font-semibold text-white bg-[#D71A21] hover:bg-[#B01419] rounded-lg transition-colors"
            >
              Auto Fill
            </button>
          </div>
          <div className="space-y-3">
            {/* No of shipments - with arrows */}
            <div>
              <label className="text-xs text-gray-600 mb-2 block">No of shipments</label>
              <div className="flex flex-col items-center">
                <button
                  onClick={() => handleShipmentsChange(1)}
                  className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 active:scale-95 w-full mb-1"
                >
                  <ChevronUp className="h-4 w-4 text-gray-700 mx-auto" />
                </button>
                <input
                  type="text"
                  inputMode="numeric"
                  value={data.noOfShipments === 0 ? "" : String(data.noOfShipments)}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val === "") {
                      handleFieldChange("noOfShipments", 0)
                    } else {
                      const n = Number.parseInt(val, 10)
                      if (Number.isFinite(n) && n >= 0) {
                        handleFieldChange("noOfShipments", n)
                      }
                    }
                  }}
                  placeholder={String(flight.defaultScreened?.noOfShipments || 0)}
                  className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm text-center focus:outline-none focus:ring-2 focus:ring-red-200 placeholder:text-gray-400 my-1"
                />
                <button
                  onClick={() => handleShipmentsChange(-1)}
                  className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 active:scale-95 w-full mt-1"
                >
                  <ChevronDown className="h-4 w-4 text-gray-700 mx-auto" />
                </button>
              </div>
            </div>

            {/* No of Pcs - simple input with gray placeholder */}
            <div>
              <label className="text-xs text-gray-600 mb-1 block">No of Pcs</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={data.noOfPcs}
                onChange={(e) => {
                  const val = e.target.value
                  if (val === "" || /^\d+$/.test(val)) {
                    handleFieldChange("noOfPcs", val)
                  }
                }}
                placeholder={String(flight.defaultScreened?.noOfPcs || 0)}
                className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm text-center focus:outline-none focus:ring-2 focus:ring-red-200 placeholder:text-gray-400"
              />
            </div>

            {/* Gr. Wt. - pre-filled with actual value, shows gray placeholder when deleted */}
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Gr. Wt.</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={data.grWeight}
                onChange={(e) => {
                  const val = e.target.value
                  if (val === "" || /^\d+$/.test(val)) {
                    handleFieldChange("grWeight", val)
                  }
                }}
                placeholder={String(flight.defaultScreened?.grWeight || 0)}
                className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm text-center focus:outline-none focus:ring-2 focus:ring-red-200 placeholder:text-gray-400"
              />
            </div>
          </div>
        </div>

        {/* Bottom Section - Units Built */}
        <div className="bg-white">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Units Built</h2>
          
          {/* Horizontal Layout for ULD Counters */}
          <div className="grid grid-cols-3 gap-3">
            {/* M/A Base */}
            <div className="flex flex-col items-center">
              <span className="text-xs text-gray-600 mb-2">M/A Base</span>
              <button
                onClick={() => handleBaseChange("maBase", 1)}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 active:scale-95 w-full mb-1"
              >
                <ChevronUp className="h-4 w-4 text-gray-700 mx-auto" />
              </button>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={maInput}
                onChange={(e) => {
                  const val = e.target.value
                  if (val === "" || /^\d+$/.test(val)) {
                    setMaInput(val)
                    const n = Number.parseInt(val, 10)
                    handleFieldChange("maBase", val === "" ? 0 : n)
                  }
                }}
                className="h-12 w-full rounded-lg border border-gray-300 px-2 text-base text-center font-semibold focus:outline-none focus:ring-2 focus:ring-red-200 my-1"
              />
              <button
                onClick={() => handleBaseChange("maBase", -1)}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 active:scale-95 w-full mt-1"
              >
                <ChevronDown className="h-4 w-4 text-gray-700 mx-auto" />
              </button>
            </div>

            {/* L Base */}
            <div className="flex flex-col items-center">
              <span className="text-xs text-gray-600 mb-2">L Base</span>
              <button
                onClick={() => handleBaseChange("lBase", 1)}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 active:scale-95 w-full mb-1"
              >
                <ChevronUp className="h-4 w-4 text-gray-700 mx-auto" />
              </button>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={lInput}
                onChange={(e) => {
                  const val = e.target.value
                  if (val === "" || /^\d+$/.test(val)) {
                    setLInput(val)
                    const n = Number.parseInt(val, 10)
                    handleFieldChange("lBase", val === "" ? 0 : n)
                  }
                }}
                className="h-12 w-full rounded-lg border border-gray-300 px-2 text-base text-center font-semibold focus:outline-none focus:ring-2 focus:ring-red-200 my-1"
              />
              <button
                onClick={() => handleBaseChange("lBase", -1)}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 active:scale-95 w-full mt-1"
              >
                <ChevronDown className="h-4 w-4 text-gray-700 mx-auto" />
              </button>
            </div>

            {/* K Base */}
            <div className="flex flex-col items-center">
              <span className="text-xs text-gray-600 mb-2">K Base</span>
              <button
                onClick={() => handleBaseChange("kBase", 1)}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 active:scale-95 w-full mb-1"
              >
                <ChevronUp className="h-4 w-4 text-gray-700 mx-auto" />
              </button>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={kInput}
                onChange={(e) => {
                  const val = e.target.value
                  if (val === "" || /^\d+$/.test(val)) {
                    setKInput(val)
                    const n = Number.parseInt(val, 10)
                    handleFieldChange("kBase", val === "" ? 0 : n)
                  }
                }}
                className="h-12 w-full rounded-lg border border-gray-300 px-2 text-base text-center font-semibold focus:outline-none focus:ring-2 focus:ring-red-200 my-1"
              />
              <button
                onClick={() => handleBaseChange("kBase", -1)}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 active:scale-95 w-full mt-1"
              >
                <ChevronDown className="h-4 w-4 text-gray-700 mx-auto" />
              </button>
            </div>
          </div>
        </div>

        {/* Remarks Section */}
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-900">Remarks</span>
          </div>
          <textarea
            value={data.remarks}
            onChange={(e) => handleFieldChange("remarks", e.target.value)}
            className="w-full resize-none rounded-lg border border-gray-300 p-2 text-sm outline-none focus:ring-2 focus:ring-red-200"
            rows={3}
            placeholder="Enter remarks..."
          />
        </div>
      </main>
    </div>
  )
}

