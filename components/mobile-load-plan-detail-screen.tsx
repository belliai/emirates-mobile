"use client"

import type React from "react"

import { useState, useEffect } from "react"
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Package,
  AlertTriangle,
  Plane,
  Edit2,
  FileText,
  MoreVertical,
} from "lucide-react"
import type { LoadPlanDetail, AWBRow } from "./load-plan-types"
import { ULDNumberModal, type ULDEntry } from "./uld-number-modal"
import BCRModal, { type BCRData, type AWBComment, generateBCRData } from "./bcr-modal"
import { AWBSplitOffloadModal } from "./awb-split-offload-modal"
import { getULDEntriesFromSupabase, updateULDEntriesInSupabase, getULDEntriesFromStorage } from "@/lib/uld-storage"

interface MobileLoadPlanDetailScreenProps {
  loadPlan: LoadPlanDetail
  onBack: () => void
}

export default function MobileLoadPlanDetailScreen({ loadPlan, onBack }: MobileLoadPlanDetailScreenProps) {
  const [expandedAWBs, setExpandedAWBs] = useState<Set<string>>(new Set())
  const [expandedULDs, setExpandedULDs] = useState<Set<string>>(
    new Set(
      // Expand first ULD by default
      loadPlan.sectors.length > 0 && loadPlan.sectors[0].uldSections.length > 0 ? [`0-0`] : [],
    ),
  )

  const [showULDModal, setShowULDModal] = useState(false)
  const [selectedULDSection, setSelectedULDSection] = useState<{
    sectorIndex: number
    uldSectionIndex: number
    uldSection: string
    initialNumbers: string[]
    initialEntries?: ULDEntry[]
  } | null>(null)
  
  // Initialize ULD entries from localStorage (for immediate display)
  const [uldEntriesMap, setUldEntriesMap] = useState<Record<string, ULDEntry[]>>(() => {
    const entries = getULDEntriesFromStorage(loadPlan.flight, loadPlan.sectors)
    return Object.fromEntries(entries)
  })

  // Fetch ULD entries from Supabase on mount (for cross-device sync)
  useEffect(() => {
    const fetchULDEntriesFromDB = async () => {
      try {
        const entries = await getULDEntriesFromSupabase(loadPlan.flight, loadPlan.sectors)
        if (entries.size > 0) {
          setUldEntriesMap(Object.fromEntries(entries))
          console.log(`[MobileLoadPlanDetail] Loaded ${entries.size} ULD sections from Supabase for ${loadPlan.flight}`)
        }
      } catch (error) {
        console.error(`[MobileLoadPlanDetail] Error fetching ULD entries from Supabase:`, error)
      }
    }
    
    fetchULDEntriesFromDB()
  }, [loadPlan.flight])

  const [showBCRModal, setShowBCRModal] = useState(false)
  const [bcrData, setBcrData] = useState<BCRData | null>(null)

  const [showAWBActionModal, setShowAWBActionModal] = useState(false)
  const [selectedAWB, setSelectedAWB] = useState<AWBRow | null>(null)
  const [awbStatuses, setAwbStatuses] = useState<
    Map<string, { loaded: boolean; offloadPcs?: string; offloadRemarks?: string }>
  >(new Map())

  const toggleAWB = (key: string) => {
    setExpandedAWBs((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const toggleULD = (key: string) => {
    setExpandedULDs((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const handleOpenULDModal = (
    e: React.MouseEvent,
    sectorIndex: number,
    uldSectionIndex: number,
    uldSection: string,
  ) => {
    e.stopPropagation() // Prevent toggling the ULD section
    // Don't open ULD Numbers modal for BULK ULD types - BULK is view-only
    if (uldSection && uldSection.toUpperCase().includes("BULK")) {
      return
    }
    const uldKey = `${sectorIndex}-${uldSectionIndex}`
    const existingEntries = uldEntriesMap[uldKey] || []
    setSelectedULDSection({
      sectorIndex,
      uldSectionIndex,
      uldSection,
      initialNumbers: existingEntries.map((e) => e.number),
      initialEntries: existingEntries,
    })
    setShowULDModal(true)
  }

  const handleSaveULDEntries = (numbers: string[], entries: ULDEntry[]) => {
    if (selectedULDSection) {
      const uldKey = `${selectedULDSection.sectorIndex}-${selectedULDSection.uldSectionIndex}`
      
      // Update local state immediately
      setUldEntriesMap((prev) => ({
        ...prev,
        [uldKey]: entries,
      }))
      
      // Sync to Supabase in background
      updateULDEntriesInSupabase(
        loadPlan.flight,
        selectedULDSection.sectorIndex,
        selectedULDSection.uldSectionIndex,
        entries
      ).catch(error => {
        console.error(`[MobileLoadPlanDetail] Error saving to Supabase:`, error)
      })
    }
  }

  const handleOpenAWBAction = (e: React.MouseEvent, awb: AWBRow, uldType: string) => {
    e.stopPropagation()
    // AWB Actions modal is allowed for all ULD types including BULK
    setSelectedAWB(awb)
    setShowAWBActionModal(true)
  }

  const handleMarkLoaded = () => {
    if (selectedAWB) {
      setAwbStatuses((prev) => {
        const next = new Map(prev)
        next.set(selectedAWB.awbNo, { loaded: true })
        return next
      })
    }
  }

  const handleMarkOffload = (remainingPieces: string, remarks: string) => {
    if (selectedAWB) {
      setAwbStatuses((prev) => {
        const next = new Map(prev)
        next.set(selectedAWB.awbNo, { loaded: false, offloadPcs: remainingPieces, offloadRemarks: remarks })
        return next
      })
    }
  }

  // Calculate totals per ULD section
  const getULDTotals = (awbs: AWBRow[]) => {
    let pcs = 0
    let wgt = 0
    awbs.forEach((awb) => {
      pcs += Number.parseInt(awb.pcs || "0") || 0
      wgt += Number.parseFloat(awb.wgt || "0") || 0
    })
    return { pcs, wgt: wgt.toFixed(1) }
  }

  const convertStatusesToComments = (): AWBComment[] => {
    const comments: AWBComment[] = []
    awbStatuses.forEach((status, awbNo) => {
      if (!status.loaded && status.offloadPcs) {
        // Format remarks to match what generateBCRData expects: "Remaining X pieces offloaded. [remarks]"
        let remarksText = `Remaining ${status.offloadPcs} pieces offloaded`
        if (status.offloadRemarks) {
          remarksText += `. ${status.offloadRemarks}`
        }
        comments.push({
          awbNo,
          status: "offloaded",
          remarks: remarksText,
          reason: status.offloadRemarks || "Offloaded",
        })
      }
    })
    return comments
  }

  const handleGenerateBCR = () => {
    const comments = convertStatusesToComments()
    const generatedBCR = generateBCRData(loadPlan, comments)
    setBcrData(generatedBCR)
    setShowBCRModal(true)
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 px-3 py-2">
          <button
            onClick={onBack}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors active:bg-gray-200"
          >
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-gray-900">{loadPlan.flight}</span>
              <span className="text-sm text-gray-500">{loadPlan.date}</span>
            </div>
            <div className="text-xs text-gray-500 truncate">
              {loadPlan.pax} • STD {loadPlan.std}
            </div>
            {loadPlan.ttlPlnUld && (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-xs font-medium text-[#D71A21]">TTL ULD:</span>
                <span className="text-xs font-mono font-semibold text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded">
                  {loadPlan.ttlPlnUld}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={handleGenerateBCR}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#D71A21] text-white text-xs font-medium rounded-lg hover:bg-[#b81219] active:bg-[#a0101a] transition-colors"
          >
            <FileText className="h-4 w-4" />
            BCR
          </button>
        </div>

        {/* Remarks Banner */}
        {loadPlan.remarks && loadPlan.remarks.length > 0 && (
          <div className="bg-amber-50 border-t border-amber-200 px-3 py-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                {loadPlan.remarks.map((remark, i) => (
                  <p key={i} className="text-xs text-amber-800 leading-tight">
                    {remark}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="pb-6">
        {loadPlan.sectors.map((sector, sectorIndex) => (
          <div key={sectorIndex} className="mt-3">
            {/* Sector Header */}
            <div className="flex items-center gap-2 px-3 py-2 bg-[#D71A21]">
              <Plane className="h-4 w-4 text-white" />
              <span className="text-sm font-semibold text-white">SECTOR: {sector.sector}</span>
            </div>

            {/* ULD Sections */}
            <div className="space-y-2 mt-2 px-2">
              {sector.uldSections.map((uldSection, uldSectionIndex) => {
                const uldKey = `${sectorIndex}-${uldSectionIndex}`
                const isULDExpanded = expandedULDs.has(uldKey)
                const totals = getULDTotals(uldSection.awbs)
                const savedEntries = uldEntriesMap[uldKey] || []

                return (
                  <div
                    key={uldSectionIndex}
                    className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200"
                  >
                    {/* ULD Header - Tappable */}
                    <div
                      onClick={() => toggleULD(uldKey)}
                      className="w-full flex items-center justify-between px-3 py-3 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-1.5 rounded-md ${uldSection.isRampTransfer ? "bg-orange-100" : "bg-[#D71A21]/10"}`}
                        >
                          <Package
                            className={`h-4 w-4 ${uldSection.isRampTransfer ? "text-orange-600" : "text-[#D71A21]"}`}
                          />
                        </div>
                        <div className="text-left">
                          <div className="font-bold text-gray-900 text-sm">
                            {uldSection.uld || "BULK"}
                            {uldSection.isRampTransfer && (
                              <span className="ml-2 text-xs font-normal text-orange-600">(Ramp Transfer)</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            {uldSection.awbs.length} AWB{uldSection.awbs.length !== 1 ? "s" : ""} • {totals.pcs} pcs •{" "}
                            {totals.wgt} kg
                          </div>
                          {savedEntries.filter(e => e.checked).length > 0 && (
                            <div className="text-xs text-[#D71A21] font-mono mt-0.5">
                              {savedEntries
                                .filter((e) => e.checked)
                                .map((e) => e.number.trim() !== "" ? `${e.type}${e.number.trim()}EK` : e.type)
                                .join(", ")}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenULDModal(e, sectorIndex, uldSectionIndex, uldSection.uld || "BULK")
                          }}
                          className="p-2 hover:bg-gray-200 active:bg-gray-300 rounded-full transition-colors"
                          aria-label="Edit ULD numbers"
                        >
                          <Edit2 className="h-4 w-4 text-gray-500" />
                        </button>
                        {isULDExpanded ? (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </div>

                    {/* AWB List */}
                    {isULDExpanded && (
                      <div className="divide-y divide-gray-100">
                        {uldSection.awbs.map((awb, awbIndex) => {
                          const awbKey = `${sectorIndex}-${uldSectionIndex}-${awbIndex}`
                          const isAWBExpanded = expandedAWBs.has(awbKey)
                          const hasRemarks = awb.remarks || awb.shc
                          const awbStatus = awbStatuses.get(awb.awbNo)
                          const isLoaded = awbStatus?.loaded
                          const isOffloaded = awbStatus?.offloadPcs
                          // Check if this is additional/revised data (should be highlighted)
                          const isAdditionalData = awb.additional_data === true

                          return (
                            <div
                              key={awbIndex}
                              className={`${isLoaded ? "bg-green-50" : isOffloaded ? "bg-orange-50" : ""} ${isAdditionalData ? "border-l-4 border-l-red-500 bg-red-50/30" : ""}`}
                            >
                              {/* AWB Row - Tappable */}
                              <div
                                onClick={() => toggleAWB(awbKey)}
                                className="w-full px-3 py-2.5 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  {/* Left: AWB info */}
                                  <div className="flex-1 text-left min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-xs w-5 ${isAdditionalData ? "text-red-500" : "text-gray-400"}`}>{awb.ser}</span>
                                      <span className={`font-mono text-lg font-bold ${isAdditionalData ? "text-red-600" : "text-gray-900"}`}>{awb.awbNo}</span>
                                      {isAdditionalData && (
                                        <span className="px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">
                                          Revised
                                        </span>
                                      )}
                                      {isLoaded && (
                                        <span className="px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
                                          Loaded
                                        </span>
                                      )}
                                      {isOffloaded && (
                                        <span className="px-1.5 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 rounded">
                                          {awbStatus.offloadPcs} pcs offload
                                        </span>
                                      )}
                                    </div>
                                    <p className={`text-xs truncate mt-0.5 ml-7 ${isAdditionalData ? "text-red-600" : "text-gray-600"}`}>
                                      {awb.manDesc || awb.pcode || "-"}
                                    </p>
                                    {hasRemarks && (
                                      <div className="flex items-center gap-1 mt-1 ml-7">
                                        {awb.shc && (
                                          <span className="inline-flex px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                                            {awb.shc}
                                          </span>
                                        )}
                                        {awb.remarks && (
                                          <span className="inline-flex px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">
                                            Note
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* Right: Pcs/Wgt and action button */}
                                  <div className="flex items-center gap-2">
                                    <div className="text-right flex-shrink-0">
                                      <div className={`text-sm font-semibold ${isAdditionalData ? "text-red-600" : "text-gray-900"}`}>{awb.pcs} pcs</div>
                                      <div className={`text-xs ${isAdditionalData ? "text-red-500" : "text-gray-500"}`}>{awb.wgt} kg</div>
                                    </div>
                                    {/* AWB actions button - allowed for all ULD types including BULK */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleOpenAWBAction(e, awb, uldSection.uld || "")
                                      }}
                                      className="p-2 hover:bg-gray-200 active:bg-gray-300 rounded-full transition-colors"
                                      aria-label="AWB actions"
                                    >
                                      <MoreVertical className="h-4 w-4 text-gray-500" />
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Expanded AWB Details */}
                              {isAWBExpanded && (
                                <div className="px-3 py-2 bg-gray-50 border-t border-gray-100">
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                                    <div>
                                      <span className="text-gray-500">Origin/Dest:</span>
                                      <span className="ml-1 text-gray-900 font-medium">{awb.orgDes || "-"}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">Volume:</span>
                                      <span className="ml-1 text-gray-900">{awb.vol || "-"} m³</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">SHC:</span>
                                      <span className="ml-1 text-gray-900">{awb.shc || "-"}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">PCODE:</span>
                                      <span className="ml-1 text-gray-900">{awb.pcode || "-"}</span>
                                    </div>
                                    {awb.fltin && (
                                      <div>
                                        <span className="text-gray-500">Flight In:</span>
                                        <span className="ml-1 text-gray-900">{awb.fltin}</span>
                                      </div>
                                    )}
                                    {awb.arrdtTime && (
                                      <div>
                                        <span className="text-gray-500">Arrival:</span>
                                        <span className="ml-1 text-gray-900">{awb.arrdtTime}</span>
                                      </div>
                                    )}
                                  </div>

                                  {awb.remarks && (
                                    <div className="mt-2 p-2 bg-amber-50 rounded border border-amber-200">
                                      <p className="text-xs text-amber-800">{awb.remarks}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Sector Totals - Calculated from displayed AWBs */}
            {(() => {
              // Calculate totals from all AWBs in this sector
              const sectorTotals = sector.uldSections.reduce(
                (acc, uldSection) => {
                  uldSection.awbs.forEach((awb) => {
                    acc.pcs += parseFloat(awb.pcs) || 0
                    acc.wgt += parseFloat(awb.wgt) || 0
                    acc.vol += parseFloat(awb.vol) || 0
                    acc.lvol += parseFloat(awb.lvol) || 0
                  })
                  return acc
                },
                { pcs: 0, wgt: 0, vol: 0, lvol: 0 }
              )
              
              return (
                <div className="mx-2 mt-2 px-3 py-2 bg-gray-800 rounded-lg">
                  <div className="flex items-center justify-between text-white text-sm">
                    <span className="font-medium">Sector Total</span>
                    <div className="flex gap-3 text-xs">
                      <span>{sectorTotals.pcs} pcs</span>
                      <span>{sectorTotals.wgt.toFixed(2)} kg</span>
                      <span>{sectorTotals.vol.toFixed(2)} m³</span>
                      <span>{sectorTotals.lvol.toFixed(2)} m³</span>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        ))}

        {/* Overall Totals - Calculated from all AWBs */}
        {(() => {
          // Calculate totals from all AWBs across all sectors
          const overallTotals = loadPlan.sectors.reduce(
            (acc, sector) => {
              sector.uldSections.forEach((uldSection) => {
                uldSection.awbs.forEach((awb) => {
                  acc.pcs += parseFloat(awb.pcs) || 0
                  acc.wgt += parseFloat(awb.wgt) || 0
                  acc.vol += parseFloat(awb.vol) || 0
                  acc.lvol += parseFloat(awb.lvol) || 0
                })
              })
              return acc
            },
            { pcs: 0, wgt: 0, vol: 0, lvol: 0 }
          )
          
          return (
            <div className="mx-2 mt-4 px-3 py-3 bg-[#D71A21] rounded-lg">
              <div className="flex items-center justify-between text-white">
                <span className="font-semibold">Total</span>
                <div className="flex gap-3 text-sm">
                  <div className="text-center">
                    <div className="font-bold">{overallTotals.pcs}</div>
                    <div className="text-xs opacity-80">pcs</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold">{overallTotals.wgt.toFixed(2)}</div>
                    <div className="text-xs opacity-80">kg</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold">{overallTotals.vol.toFixed(2)}</div>
                    <div className="text-xs opacity-80">m³</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold">{overallTotals.lvol.toFixed(2)}</div>
                    <div className="text-xs opacity-80">lvol</div>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

        {/* Baggage Info */}
        {loadPlan.bagg && (
          <div className="mx-2 mt-3 px-3 py-2 bg-white rounded-lg border border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Baggage</span>
              <span className="font-medium text-gray-900">{loadPlan.bagg}</span>
            </div>
          </div>
        )}
      </div>

      {/* ULD Number Modal */}
      {selectedULDSection && (
        <ULDNumberModal
          isOpen={showULDModal}
          onClose={() => {
            setShowULDModal(false)
            setSelectedULDSection(null)
          }}
          uldSection={selectedULDSection.uldSection}
          ttlPlnUld={loadPlan.ttlPlnUld} // Use TTL PLN ULD from header as source of truth
          sectorIndex={selectedULDSection.sectorIndex}
          uldSectionIndex={selectedULDSection.uldSectionIndex}
          initialNumbers={selectedULDSection.initialNumbers}
          initialEntries={selectedULDSection.initialEntries}
          onSave={handleSaveULDEntries}
        />
      )}

      {bcrData && (
        <BCRModal
          isOpen={showBCRModal}
          onClose={() => {
            setShowBCRModal(false)
            setBcrData(null)
          }}
          loadPlan={loadPlan}
          bcrData={bcrData}
        />
      )}

      {selectedAWB && (
        <AWBSplitOffloadModal
          isOpen={showAWBActionModal}
          onClose={() => {
            setShowAWBActionModal(false)
            setSelectedAWB(null)
          }}
          awb={selectedAWB}
          onMarkLoaded={handleMarkLoaded}
          onMarkOffload={handleMarkOffload}
          onConfirmSplit={(splitGroups) => {
            // TODO: Handle split logic
            console.log("Split groups:", splitGroups)
          }}
        />
      )}
    </div>
  )
}
