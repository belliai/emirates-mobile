"use client"

import { useState } from "react"
import React from "react"
import { ArrowLeft } from "lucide-react"
import type { LoadPlanDetail, AWBRow } from "./load-plan-types"
import { ULDNumberModal } from "./uld-number-modal"
import { parseULDSection, formatULDSection } from "@/lib/uld-parser"
import { AWBQuickActionModal } from "./awb-quick-action-modal"
import BCRModal, { generateBCRData } from "./bcr-modal"
import type { AWBComment } from "./bcr-modal"

type AWBAssignment = {
  awbNo: string
  sectorIndex: number
  uldSectionIndex: number
  awbIndex: number
  assignmentData: { type: "single"; isLoaded: boolean }
  isLoaded: boolean
}

interface MobileLoadPlanDetailScreenProps {
  loadPlan: LoadPlanDetail
  onBack: () => void
}

export default function MobileLoadPlanDetailScreen({ loadPlan, onBack }: MobileLoadPlanDetailScreenProps) {
  const [showBCRModal, setShowBCRModal] = useState(false)
  const [awbAssignments, setAwbAssignments] = useState<Map<string, AWBAssignment>>(new Map())
  const [awbComments, setAwbComments] = useState<AWBComment[]>([])
  const [hoveredUld, setHoveredUld] = useState<string | null>(null)
  
  // ULD numbers state management with localStorage
  const [uldNumbers, setUldNumbers] = useState<Map<string, string[]>>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`uld-numbers-${loadPlan.flight}`)
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          return new Map(Object.entries(parsed))
        } catch (e) {
          return new Map()
        }
      }
    }
    return new Map()
  })
  
  const [showULDModal, setShowULDModal] = useState(false)
  const [selectedULDSection, setSelectedULDSection] = useState<{
    sectorIndex: number
    uldSectionIndex: number
    uld: string
  } | null>(null)
  
  const [showQuickActionModal, setShowQuickActionModal] = useState(false)
  const [selectedAWBForQuickAction, setSelectedAWBForQuickAction] = useState<{
    awb: AWBRow
    sectorIndex: number
    uldSectionIndex: number
    awbIndex: number
  } | null>(null)

  const isReadOnly = true // Mobile is read-only

  const updateULDNumbers = (sectorIndex: number, uldSectionIndex: number, numbers: string[]) => {
    const key = `${sectorIndex}-${uldSectionIndex}`
    setUldNumbers((prev) => {
      const updated = new Map(prev)
      updated.set(key, numbers)
      // Save to localStorage
      if (typeof window !== 'undefined') {
        const toStore = Object.fromEntries(updated)
        localStorage.setItem(`uld-numbers-${loadPlan.flight}`, JSON.stringify(toStore))
      }
      return updated
    })
  }

  const handleMarkAWBLoaded = () => {
    if (!selectedAWBForQuickAction) return
    
    const { awb, sectorIndex, uldSectionIndex, awbIndex } = selectedAWBForQuickAction
    const assignmentKey = `${awb.awbNo}-${sectorIndex}-${uldSectionIndex}-${awbIndex}`
    
    setAwbAssignments((prev) => {
      const updated = new Map(prev)
      const existing = updated.get(assignmentKey)
      if (existing) {
        updated.set(assignmentKey, {
          ...existing,
          isLoaded: true,
        })
      } else {
        updated.set(assignmentKey, {
          awbNo: awb.awbNo,
          sectorIndex,
          uldSectionIndex,
          awbIndex,
          assignmentData: { type: "single", isLoaded: true },
          isLoaded: true,
        })
      }
      return updated
    })
  }

  const handleMarkAWBOffload = (remainingPieces: string, remarks: string) => {
    if (!selectedAWBForQuickAction) return
    
    const { awb } = selectedAWBForQuickAction
    const comment: AWBComment = {
      awbNo: awb.awbNo,
      status: "offloaded",
      remarks: `Remaining ${remainingPieces} pieces offloaded. ${remarks || ""}`.trim(),
    }
    
    setAwbComments((prev) => {
      const existingIndex = prev.findIndex(c => c.awbNo === awb.awbNo)
      if (existingIndex >= 0) {
        const updated = [...prev]
        updated[existingIndex] = comment
        return updated
      }
      return [...prev, comment]
    })
  }

  const awbFields: Array<{ key: keyof AWBRow; label: string; className?: string }> = [
    { key: "ser", label: "SER." },
    { key: "awbNo", label: "AWB NO", className: "font-medium" },
    { key: "orgDes", label: "ORG/DES" },
    { key: "pcs", label: "PCS" },
    { key: "wgt", label: "WGT" },
    { key: "vol", label: "VOL" },
    { key: "lvol", label: "LVOL" },
    { key: "shc", label: "SHC" },
    { key: "manDesc", label: "MAN.DESC" },
    { key: "pcode", label: "PCODE" },
    { key: "pc", label: "PC" },
    { key: "thc", label: "THC" },
    { key: "bs", label: "BS" },
    { key: "pi", label: "PI" },
    { key: "fltin", label: "FLTIN" },
    { key: "arrdtTime", label: "ARRDT.TIME" },
    { key: "qnnAqnn", label: "QNN/AQNN" },
    { key: "whs", label: "WHS" },
    { key: "si", label: "SI" },
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-2 sm:px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="h-5 w-5 text-gray-700" />
            </button>
            <h1 className="text-base font-semibold text-gray-900">Load Plan Detail</h1>
          </div>
          <button
            onClick={() => setShowBCRModal(true)}
            className="px-3 py-1.5 text-xs font-medium text-white bg-[#D71A21] hover:bg-[#B0151A] rounded-md transition-colors"
          >
            Generate BCR
          </button>
        </div>
        
        {/* Flight Header Row */}
        <div className="grid grid-cols-2 gap-1 sm:gap-2 text-xs text-gray-700 mt-2">
          <div><span className="font-semibold">Flight:</span> {loadPlan.flight}</div>
          <div><span className="font-semibold">Date:</span> {loadPlan.date}</div>
          <div><span className="font-semibold">ACFT TYPE:</span> {loadPlan.acftType}</div>
          <div><span className="font-semibold">ACFT REG:</span> {loadPlan.acftReg}</div>
          <div><span className="font-semibold">PAX:</span> {loadPlan.pax}</div>
          <div><span className="font-semibold">STD:</span> {loadPlan.std}</div>
          <div><span className="font-semibold">TTL PLN ULD:</span> {loadPlan.ttlPlnUld}</div>
          <div><span className="font-semibold">ULD Version:</span> {loadPlan.uldVersion}</div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-gray-50 p-2 sm:p-4">
        {loadPlan.sectors.map((sector, sectorIndex) => {
          const regularSections = sector.uldSections.filter((s) => !s.isRampTransfer)
          const rampTransferSections = sector.uldSections.filter((s) => s.isRampTransfer)

          return (
            <div key={sectorIndex} className="mb-6 space-y-4">
              {/* Sector Header */}
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-gray-900">SECTOR:</span>
                <span className="text-lg font-semibold text-gray-900">{sector.sector}</span>
              </div>

              {/* Table Container */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  {/* Table Header */}
                  <div className="border-b-2 border-gray-300 bg-gray-50 sticky top-0 z-10">
                    <div className="flex text-xs font-semibold text-gray-900 min-w-[800px]">
                      {awbFields.map((field) => (
                        <div key={field.key} className="px-2 py-2 flex-shrink-0" style={{ width: field.key === "manDesc" ? "120px" : field.key === "awbNo" ? "100px" : "60px" }}>
                          {field.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Remarks */}
                  {loadPlan.remarks && loadPlan.remarks.length > 0 && (
                    <div className="px-2 py-2 bg-gray-100 border-b border-gray-200">
                      <div className="space-y-1">
                        {loadPlan.remarks.map((remark, index) => (
                          <div key={index} className="text-xs text-gray-900">{remark}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Regular Sections */}
                  {regularSections.map((uldSection, uldSectionIndex) => {
                    const actualUldSectionIndex = sector.uldSections.indexOf(uldSection)
                    return (
                      <React.Fragment key={uldSectionIndex}>
                        {/* AWBs */}
                        {uldSection.awbs.map((awb, awbIndex) => {
                          const assignmentKey = `${awb.awbNo}-${sectorIndex}-${actualUldSectionIndex}-${awbIndex}`
                          const assignment = awbAssignments.get(assignmentKey)
                          const isLoaded = assignment?.isLoaded || false
                          const assignmentUld = assignment?.assignmentData.type === "single" 
                            ? assignment.assignmentData.uld 
                            : null
                          const isHovered = hoveredUld === assignmentUld && assignmentUld

                          return (
                            <React.Fragment key={awbIndex}>
                              <AWBRow
                                awb={awb}
                                awbFields={awbFields}
                                isLoaded={isLoaded}
                                isHovered={isHovered}
                                isReadOnly={isReadOnly}
                                assignmentUld={assignmentUld}
                                onLeftSectionClick={() => {
                                  setSelectedAWBForQuickAction({ awb, sectorIndex, uldSectionIndex: actualUldSectionIndex, awbIndex })
                                  setShowQuickActionModal(true)
                                }}
                                onMouseEnter={() => assignmentUld && setHoveredUld(assignmentUld)}
                                onMouseLeave={() => setHoveredUld(null)}
                              />
                              
                              {/* Remarks row */}
                              {awb.remarks && (
                                <div className="px-2 py-1 text-xs text-gray-700 italic border-b border-gray-100 min-w-[800px]">
                                  {awb.remarks}
                                </div>
                              )}
                            </React.Fragment>
                          )
                        })}
                        
                        {/* ULD Row */}
                        {uldSection.uld && (
                          <ULDRow
                            uld={uldSection.uld}
                            sectorIndex={sectorIndex}
                            uldSectionIndex={actualUldSectionIndex}
                            uldNumbers={uldNumbers.get(`${sectorIndex}-${actualUldSectionIndex}`) || []}
                            isReadOnly={isReadOnly}
                            onClick={() => {
                              setSelectedULDSection({ sectorIndex, uldSectionIndex: actualUldSectionIndex, uld: uldSection.uld })
                              setShowULDModal(true)
                            }}
                          />
                        )}
                      </React.Fragment>
                    )
                  })}

                  {/* Ramp Transfer Sections */}
                  {rampTransferSections.length > 0 && (
                    <>
                      <div className="px-2 py-1 font-semibold text-gray-900 text-center bg-gray-50 border-b border-gray-200 min-w-[800px]">
                        ***** RAMP TRANSFER *****
                      </div>
                      {rampTransferSections.map((uldSection, uldSectionIndex) => {
                        const actualUldSectionIndex = sector.uldSections.indexOf(uldSection)
                        return (
                          <React.Fragment key={uldSectionIndex}>
                            {/* ULD Row first */}
                            {uldSection.uld && (
                              <ULDRow
                                uld={uldSection.uld}
                                sectorIndex={sectorIndex}
                                uldSectionIndex={actualUldSectionIndex}
                                uldNumbers={uldNumbers.get(`${sectorIndex}-${actualUldSectionIndex}`) || []}
                                isReadOnly={isReadOnly}
                                onClick={() => {
                                  setSelectedULDSection({ sectorIndex, uldSectionIndex: actualUldSectionIndex, uld: uldSection.uld })
                                  setShowULDModal(true)
                                }}
                                isRampTransfer
                              />
                            )}
                            {/* Then AWBs */}
                            {uldSection.awbs.map((awb, awbIndex) => {
                              const assignmentKey = `${awb.awbNo}-${sectorIndex}-${actualUldSectionIndex}-${awbIndex}`
                              const assignment = awbAssignments.get(assignmentKey)
                              const isLoaded = assignment?.isLoaded || false
                              const assignmentUld = assignment?.assignmentData.type === "single" 
                                ? assignment.assignmentData.uld 
                                : null
                              const isHovered = hoveredUld === assignmentUld && assignmentUld

                              return (
                                <React.Fragment key={awbIndex}>
                                  <AWBRow
                                    awb={awb}
                                    awbFields={awbFields}
                                    isLoaded={isLoaded}
                                    isHovered={isHovered}
                                    isReadOnly={isReadOnly}
                                    assignmentUld={assignmentUld}
                                    onLeftSectionClick={() => {
                                      setSelectedAWBForQuickAction({ awb, sectorIndex, uldSectionIndex: actualUldSectionIndex, awbIndex })
                                      setShowQuickActionModal(true)
                                    }}
                                    onMouseEnter={() => assignmentUld && setHoveredUld(assignmentUld)}
                                    onMouseLeave={() => setHoveredUld(null)}
                                    isRampTransfer
                                  />
                                  
                                  {awb.remarks && (
                                    <div className="px-2 py-1 text-xs text-gray-700 italic border-b border-gray-100 min-w-[800px]">
                                      {awb.remarks}
                                    </div>
                                  )}
                                </React.Fragment>
                              )
                            })}
                          </React.Fragment>
                        )
                      })}
                    </>
                  )}
                </div>
              </div>

              {/* Footer Info */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
                <div className="text-sm text-gray-900">
                  <span className="font-semibold">BAGG</span> {sector.bagg || ""}
                </div>
                <div className="text-sm text-gray-900">
                  <span className="font-semibold">COU</span> {sector.cou || ""}
                </div>
                <div className="text-sm text-gray-900 mt-4">
                  <span className="font-semibold">TOTALS:</span> {sector.totals.pcs} {sector.totals.wgt} {sector.totals.vol} {sector.totals.lvol}
                </div>
              </div>
            </div>
          )
        })}

        {/* Footer */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-700">
            <span>PREPARED BY:</span>
            <span>{loadPlan.preparedBy}</span>
            <span>PREPARED ON:</span>
            <span>{loadPlan.preparedOn}</span>
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedULDSection && (
        <ULDNumberModal
          isOpen={showULDModal}
          onClose={() => {
            setShowULDModal(false)
            setSelectedULDSection(null)
          }}
          uldSection={selectedULDSection.uld}
          sectorIndex={selectedULDSection.sectorIndex}
          uldSectionIndex={selectedULDSection.uldSectionIndex}
          initialNumbers={uldNumbers.get(`${selectedULDSection.sectorIndex}-${selectedULDSection.uldSectionIndex}`) || []}
          onSave={(numbers) => {
            updateULDNumbers(selectedULDSection.sectorIndex, selectedULDSection.uldSectionIndex, numbers)
          }}
        />
      )}

      {selectedAWBForQuickAction && (
        <AWBQuickActionModal
          isOpen={showQuickActionModal}
          onClose={() => {
            setShowQuickActionModal(false)
            setSelectedAWBForQuickAction(null)
          }}
          awb={selectedAWBForQuickAction.awb}
          onMarkLoaded={handleMarkAWBLoaded}
          onMarkOffload={handleMarkAWBOffload}
        />
      )}

      {/* BCR Modal */}
      <BCRModal
        isOpen={showBCRModal}
        onClose={() => setShowBCRModal(false)}
        loadPlan={loadPlan}
        bcrData={generateBCRData(loadPlan, awbComments, awbAssignments, uldNumbers)}
      />
    </div>
  )
}

// AWB Row Component
interface AWBRowProps {
  awb: AWBRow
  awbFields: Array<{ key: keyof AWBRow; label: string; className?: string }>
  isLoaded: boolean
  isHovered: boolean
  isReadOnly: boolean
  assignmentUld: string | null
  onLeftSectionClick: () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
  isRampTransfer?: boolean
}

function AWBRow({
  awb,
  awbFields,
  isLoaded,
  isHovered,
  isReadOnly,
  assignmentUld,
  onLeftSectionClick,
  onMouseEnter,
  onMouseLeave,
  isRampTransfer,
}: AWBRowProps) {
  const [hoveredSection, setHoveredSection] = useState<"left" | "right" | null>(null)

  const leftFields = awbFields.slice(0, 8) // SER through SHC
  const rightFields = awbFields.slice(8) // MAN.DESC onward

  return (
    <div
      className={`flex text-xs border-b border-gray-100 min-w-[800px] ${isLoaded ? "bg-gray-200 opacity-60" : isRampTransfer ? "bg-gray-50" : ""} ${isHovered ? "border-l-4 border-l-red-500" : ""}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={() => {
        onMouseLeave()
        setHoveredSection(null)
      }}
    >
      {/* Left section - Quick Actions (SER through SHC) */}
      {leftFields.map((field) => (
        <div
          key={field.key}
          className={`px-2 py-1 flex-shrink-0 ${field.className || ""} ${isReadOnly ? "cursor-pointer" : ""} ${hoveredSection === "left" && isReadOnly ? "bg-blue-50" : ""}`}
          style={{ width: field.key === "awbNo" ? "100px" : "60px" }}
          onMouseEnter={() => isReadOnly && setHoveredSection("left")}
          onMouseLeave={() => setHoveredSection(null)}
          onClick={(e) => {
            if (isReadOnly && onLeftSectionClick) {
              e.stopPropagation()
              onLeftSectionClick()
            }
          }}
        >
          {awb[field.key] || "-"}
        </div>
      ))}
      
      {/* Right section - Display only (MAN.DESC onward) */}
      {rightFields.map((field) => (
        <div
          key={field.key}
          className={`px-2 py-1 flex-shrink-0 ${field.className || ""}`}
          style={{ width: field.key === "manDesc" ? "120px" : "60px" }}
        >
          {awb[field.key] || "-"}
        </div>
      ))}
    </div>
  )
}

// ULD Row Component
interface ULDRowProps {
  uld: string
  sectorIndex: number
  uldSectionIndex: number
  uldNumbers: string[]
  isReadOnly: boolean
  onClick: () => void
  isRampTransfer?: boolean
}

function ULDRow({ uld, uldNumbers, isReadOnly, onClick, isRampTransfer }: ULDRowProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const hasULDNumbers = uldNumbers.length > 0 && uldNumbers.some(n => n.trim() !== "")
  const filteredNumbers = uldNumbers.filter(n => n.trim() !== "")
  const allNumbers = filteredNumbers.join(", ")
  const finalSection = hasULDNumbers ? formatULDSection(uldNumbers, uld) : null
  
  // Truncate to show max 2 ULD numbers, add ".." if more exist
  const shouldTruncate = filteredNumbers.length > 2
  const displayNumbers = shouldTruncate 
    ? filteredNumbers.slice(0, 2).join(", ") + ".."
    : allNumbers
  
  return (
    <div className={`flex text-xs font-semibold text-gray-900 border-b border-gray-200 ${isRampTransfer ? "bg-gray-50" : ""}`}>
      <div className="flex items-center gap-2 px-2 py-1 w-full">
        {/* Left: ULD Section */}
        <div 
          className={`flex-shrink-0 ${isReadOnly ? "cursor-pointer hover:bg-gray-50 rounded px-2 py-1 transition-colors" : ""}`}
          onClick={isReadOnly ? onClick : undefined}
        >
          {uld}
        </div>
        {/* Middle: Separator */}
        {(hasULDNumbers || finalSection) && (
          <span className="text-gray-400">|</span>
        )}
        {/* Middle: ULD Numbers */}
        {hasULDNumbers && (
          <div 
            className="group relative flex-shrink-0"
            onTouchStart={(e) => {
              if (shouldTruncate) {
                e.stopPropagation()
                setShowTooltip(true)
                // Hide tooltip after 3 seconds
                setTimeout(() => setShowTooltip(false), 3000)
              }
            }}
            onClick={(e) => {
              if (shouldTruncate) {
                e.stopPropagation()
                setShowTooltip(!showTooltip)
              }
            }}
          >
            <div 
              className={`text-xs font-normal text-gray-500 ${shouldTruncate ? "cursor-pointer" : ""}`}
              title={shouldTruncate ? allNumbers : undefined}
            >
              {displayNumbers}
            </div>
            {/* Mobile tooltip - shows on tap */}
            {shouldTruncate && showTooltip && (
              <div className="absolute left-0 bottom-full mb-1.5 px-2 py-1 bg-gray-800/95 text-white text-xs rounded shadow-lg whitespace-nowrap z-20 md:hidden">
                {allNumbers}
                <div className="absolute top-full left-3 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] border-transparent border-t-gray-800/95"></div>
              </div>
            )}
            {/* Desktop hover tooltip */}
            {shouldTruncate && (
              <div className="absolute left-0 bottom-full mb-1.5 px-2 py-1 bg-gray-800/95 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap z-20 hidden md:block">
                {allNumbers}
                <div className="absolute top-full left-3 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] border-transparent border-t-gray-800/95"></div>
              </div>
            )}
          </div>
        )}
        {/* Right: Final Section */}
        {finalSection && (
          <>
            <span className="text-gray-400">|</span>
            <div className="text-xs font-normal text-gray-600 flex-shrink-0">
              Final: <span className="font-mono font-semibold">{finalSection}</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

