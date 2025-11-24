"use client"

import { X, ArrowLeft } from "lucide-react"
import type { LoadPlanDetail, AWBRow } from "./load-plan-types"
import { useState } from "react"
import React from "react"
import AWBAssignmentModal, { LoadedStatusModal, type AWBAssignmentData } from "./awb-assignment-modal"
import { useLoadPlanLogs } from "@/lib/load-plan-log-context"

type AWBAssignment = {
  awbNo: string
  sectorIndex: number
  uldSectionIndex: number
  awbIndex: number
  assignmentData: AWBAssignmentData
  isLoaded: boolean
}

interface MobileLoadPlanModalProps {
  loadPlan: LoadPlanDetail
  isOpen: boolean
  onClose: () => void
  isFullScreen?: boolean
}

export default function MobileLoadPlanModal({ loadPlan, isOpen, onClose, isFullScreen = false }: MobileLoadPlanModalProps) {
  const { addLog } = useLoadPlanLogs()
  const [selectedAWB, setSelectedAWB] = useState<{ awb: AWBRow; sectorIndex: number; uldSectionIndex: number; awbIndex: number } | null>(null)
  const [showAssignmentModal, setShowAssignmentModal] = useState(false)
  const [showLoadedModal, setShowLoadedModal] = useState(false)
  const [loadedAWBNo, setLoadedAWBNo] = useState("")
  const [awbAssignments, setAwbAssignments] = useState<Map<string, AWBAssignment>>(new Map())
  const [hoveredUld, setHoveredUld] = useState<string | null>(null)

  if (!isOpen) return null

  const isReadOnly = true // Mobile is read-only, clicking opens assignment modal

  const handleAWBRowClick = (
    awb: AWBRow,
    sectorIndex: number,
    uldSectionIndex: number,
    awbIndex: number,
    assignment: AWBAssignment | undefined
  ) => {
    if (assignment?.isLoaded) {
      setLoadedAWBNo(awb.awbNo)
      setShowLoadedModal(true)
    } else {
      setSelectedAWB({ awb, sectorIndex, uldSectionIndex, awbIndex })
      setShowAssignmentModal(true)
    }
  }

  const handleAssignmentConfirm = (data: AWBAssignmentData) => {
    if (!selectedAWB) return
    
    const key = `${selectedAWB.awb.awbNo}-${selectedAWB.sectorIndex}-${selectedAWB.uldSectionIndex}-${selectedAWB.awbIndex}`
    const sector = loadPlan.sectors[selectedAWB.sectorIndex]
    
    // Log the action
    if (data.type === "single" && data.uld) {
      addLog(loadPlan.flight, {
        action: "assign_uld",
        awbNo: selectedAWB.awb.awbNo,
        details: `Assigned to ULD ${data.uld}`,
        sector: sector?.sector || undefined,
      })
    } else if (data.type === "split") {
      addLog(loadPlan.flight, {
        action: "split_awb",
        awbNo: selectedAWB.awb.awbNo,
        details: `Split into ${data.splitGroups?.length || 0} groups`,
        sector: sector?.sector || undefined,
      })
    } else if (data.type === "offload") {
      addLog(loadPlan.flight, {
        action: "offload_awb",
        awbNo: selectedAWB.awb.awbNo,
        details: data.remarks || "Offloaded",
        sector: sector?.sector || undefined,
      })
    }
    
    if (data.isLoaded) {
      addLog(loadPlan.flight, {
        action: "mark_loaded",
        awbNo: selectedAWB.awb.awbNo,
        details: "Marked as loaded",
        sector: sector?.sector || undefined,
      })
    }
    
    setAwbAssignments((prev) => {
      const updated = new Map(prev)
      updated.set(key, {
        awbNo: selectedAWB.awb.awbNo,
        sectorIndex: selectedAWB.sectorIndex,
        uldSectionIndex: selectedAWB.uldSectionIndex,
        awbIndex: selectedAWB.awbIndex,
        assignmentData: data,
        isLoaded: data.isLoaded !== false,
      })
      return updated
    })
    setShowAssignmentModal(false)
    setSelectedAWB(null)
  }

  const existingUlds = Array.from(new Set(
    Array.from(awbAssignments.values())
      .map(a => {
        if (a.assignmentData.type === "single") return a.assignmentData.uld
        if (a.assignmentData.type === "existing") return a.assignmentData.existingUld
        return null
      })
      .filter((uld): uld is string => uld !== null)
  ))

  // AWB Fields in desktop order
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

  if (isFullScreen) {
    return (
      <div className="fixed inset-0 z-[100] bg-white overflow-hidden flex flex-col">
        {/* Header - matching desktop */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft className="h-5 w-5 text-gray-700" />
              </button>
              <h1 className="text-base font-semibold text-gray-900">Load Plan Detail</h1>
            </div>
          </div>
          
          {/* Flight Header Row - matching desktop */}
          <div className="grid grid-cols-4 gap-2 text-xs text-gray-700 mt-2">
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

        {/* Content - matching desktop order exactly */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
          {/* Sectors */}
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

                    {/* Remarks - matching desktop order (before AWBs) */}
                    {loadPlan.remarks && loadPlan.remarks.length > 0 && (
                      <div className="px-2 py-2 bg-gray-100 border-b border-gray-200">
                        <div className="space-y-1">
                          {loadPlan.remarks.map((remark, index) => (
                            <div key={index} className="text-xs text-gray-900">{remark}</div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Regular Sections - AWBs first, then ULD row AFTER (matching markdown structure) */}
                    {regularSections.map((uldSection, uldSectionIndex) => {
                      const actualUldSectionIndex = sector.uldSections.indexOf(uldSection)
                      return (
                        <React.Fragment key={uldSectionIndex}>
                          {/* AWBs first - render all AWBs in this section */}
                          {uldSection.awbs.map((awb, awbIndex) => {
                            const assignmentKey = `${awb.awbNo}-${sectorIndex}-${actualUldSectionIndex}-${awbIndex}`
                            const assignment = awbAssignments.get(assignmentKey)
                            const isLoaded = assignment?.isLoaded || false
                            const assignmentUld = assignment?.assignmentData.type === "single" 
                              ? assignment.assignmentData.uld 
                              : assignment?.assignmentData.type === "existing"
                              ? assignment.assignmentData.existingUld
                              : null
                            const isHovered = hoveredUld === assignmentUld && assignmentUld
                            const splitGroups = assignment?.assignmentData.type === "split" ? assignment.assignmentData.splitGroups : []

                            return (
                              <React.Fragment key={awbIndex}>
                                {/* AWB Row */}
                                <div
                                  className={`flex text-xs border-b border-gray-100 min-w-[800px] ${isLoaded ? "bg-gray-200 opacity-60" : "hover:bg-gray-50"} ${isHovered ? "border-l-4 border-l-red-500" : ""} ${isReadOnly ? "cursor-pointer" : ""}`}
                                  onClick={() => handleAWBRowClick(awb, sectorIndex, actualUldSectionIndex, awbIndex, assignment)}
                                  onMouseEnter={() => assignmentUld && setHoveredUld(assignmentUld)}
                                  onMouseLeave={() => setHoveredUld(null)}
                                >
                                  {awbFields.map((field) => (
                                    <div
                                      key={field.key}
                                      className={`px-2 py-1 flex-shrink-0 ${field.className || ""}`}
                                      style={{ width: field.key === "manDesc" ? "120px" : field.key === "awbNo" ? "100px" : "60px" }}
                                    >
                                      {awb[field.key] || "-"}
                                    </div>
                                  ))}
                                </div>
                                
                                {/* Remarks row */}
                                {awb.remarks && (
                                  <div className="px-2 py-1 text-xs text-gray-700 italic border-b border-gray-100 min-w-[800px]">
                                    {awb.remarks}
                                  </div>
                                )}

                                {/* Split Groups */}
                                {splitGroups && splitGroups.length > 0 && splitGroups.map((group) => {
                                  const groupUld = group.uld
                                  const isGroupHovered = hoveredUld === groupUld && groupUld
                                  return (
                                    <div
                                      key={`split-${group.id}`}
                                      className={`flex text-xs border-b border-gray-100 bg-gray-50 min-w-[800px] ${isGroupHovered ? "border-l-4 border-l-red-500" : ""}`}
                                      onMouseEnter={() => groupUld && setHoveredUld(groupUld)}
                                      onMouseLeave={() => setHoveredUld(null)}
                                    >
                                      <div className="px-2 py-1 pl-8 text-gray-500" style={{ width: "60px" }}>
                                        <span className="text-gray-400">└─</span>
                                      </div>
                                      <div className="px-2 py-1 font-medium text-gray-700" style={{ width: "100px" }}>{awb.awbNo}</div>
                                      <div className="px-2 py-1 text-gray-500" style={{ width: "60px" }}>{awb.orgDes}</div>
                                      <div className="px-2 py-1 font-semibold text-gray-700" style={{ width: "60px" }}>{group.pieces || "-"}</div>
                                      <div className="px-2 py-1 text-gray-500" style={{ width: "60px" }}>{groupUld || "-"}</div>
                                      <div className="px-2 py-1 text-gray-600 font-mono" style={{ width: "60px" }}>{group.no || "-"}</div>
                                      <div className="flex-1"></div>
                                    </div>
                                  )
                                })}
                              </React.Fragment>
                            )
                          })}
                          
                          {/* ULD Row AFTER all AWBs (matching markdown structure exactly) */}
                          {uldSection.uld && (
                            <div className="flex text-xs font-semibold text-gray-900 text-center border-b border-gray-200 min-w-[800px]">
                              <div className="px-2 py-1 flex-1">
                                {uldSection.uld}
                              </div>
                            </div>
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
                            <div key={uldSectionIndex}>
                              {/* ULD Row first in ramp transfer */}
                              {uldSection.uld && (
                                <div className="flex text-xs font-semibold text-gray-900 text-center bg-gray-50 border-b border-gray-200 min-w-[800px]">
                                  <div className="px-2 py-1 flex-1 col-span-full">
                                    {uldSection.uld}
                                  </div>
                                </div>
                              )}
                              {/* Then AWBs */}
                              {uldSection.awbs.map((awb, awbIndex) => {
                                const assignmentKey = `${awb.awbNo}-${sectorIndex}-${actualUldSectionIndex}-${awbIndex}`
                                const assignment = awbAssignments.get(assignmentKey)
                                return (
                                  <div
                                    key={awbIndex}
                                    className="flex text-xs border-b border-gray-100 bg-gray-50 hover:bg-gray-50 min-w-[800px]"
                                  >
                                    {awbFields.map((field) => (
                                      <div
                                        key={field.key}
                                        className={`px-2 py-1 flex-shrink-0 ${field.className || ""}`}
                                        style={{ width: field.key === "manDesc" ? "120px" : field.key === "awbNo" ? "100px" : "60px" }}
                                      >
                                        {awb[field.key] || "-"}
                                      </div>
                                    ))}
                                  </div>
                                )
                              })}
                            </div>
                          )
                        })}
                      </>
                    )}
                  </div>
                </div>

                {/* Footer Info - BAGG, COU, TOTALS (matching desktop order) */}
                <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
                  {sector.bagg && (
                    <div className="text-sm text-gray-900">
                      <span className="font-semibold">BAGG</span> {sector.bagg}
                    </div>
                  )}
                  {sector.cou && (
                    <div className="text-sm text-gray-900">
                      <span className="font-semibold">COU</span> {sector.cou}
                    </div>
                  )}
                  <div className="text-sm text-gray-900 mt-4">
                    <span className="font-semibold">TOTALS:</span>{" "}
                    {sector.totals.pcs} {sector.totals.wgt} {sector.totals.vol} {sector.totals.lvol}
                  </div>
                </div>
              </div>
            )
          })}

          {/* Bottom Footer - PREPARED BY/ON */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-700">
              <span>PREPARED BY:</span>
              <span>{loadPlan.preparedBy}</span>
              <span>PREPARED ON:</span>
              <span>{loadPlan.preparedOn}</span>
            </div>
          </div>
        </div>

        {/* AWB Assignment Modal */}
        {selectedAWB && (
          <AWBAssignmentModal
            isOpen={showAssignmentModal}
            onClose={() => {
              setShowAssignmentModal(false)
              setSelectedAWB(null)
            }}
            awb={selectedAWB.awb}
            existingUlds={existingUlds}
            onConfirm={handleAssignmentConfirm}
          />
        )}

        {/* Loaded Status Modal */}
        <LoadedStatusModal
          isOpen={showLoadedModal}
          onClose={() => {
            setShowLoadedModal(false)
            setLoadedAWBNo("")
          }}
          awbNo={loadedAWBNo}
          onCancelLoading={() => {
            // Log unmark loaded
            addLog(loadPlan.flight, {
              action: "unmark_loaded",
              awbNo: loadedAWBNo,
              details: "Unmarked as loaded",
            })
            
            setAwbAssignments((prev) => {
              const updated = new Map(prev)
              for (const [key, assignment] of updated.entries()) {
                if (assignment.awbNo === loadedAWBNo) {
                  updated.set(key, { ...assignment, isLoaded: false })
                }
              }
              return updated
            })
            setShowLoadedModal(false)
            setLoadedAWBNo("")
          }}
        />
      </div>
    )
  }

  // Modal mode (default)
  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="absolute inset-x-0 bottom-0 top-0 bg-white overflow-hidden flex flex-col">
        {/* Header - matching desktop */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft className="h-5 w-5 text-gray-700" />
              </button>
              <h1 className="text-base font-semibold text-gray-900">Load Plan Detail</h1>
            </div>
          </div>
          
          {/* Flight Header Row - matching desktop */}
          <div className="grid grid-cols-4 gap-2 text-xs text-gray-700 mt-2">
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

        {/* Content - matching desktop order exactly */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
          {/* Sectors */}
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

                    {/* Remarks - matching desktop order (before AWBs) */}
                    {loadPlan.remarks && loadPlan.remarks.length > 0 && (
                      <div className="px-2 py-2 bg-gray-100 border-b border-gray-200">
                        <div className="space-y-1">
                          {loadPlan.remarks.map((remark, index) => (
                            <div key={index} className="text-xs text-gray-900">{remark}</div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Regular Sections - AWBs first, then ULD row AFTER (matching markdown structure) */}
                    {regularSections.map((uldSection, uldSectionIndex) => {
                      const actualUldSectionIndex = sector.uldSections.indexOf(uldSection)
                      return (
                        <React.Fragment key={uldSectionIndex}>
                          {/* AWBs first - render all AWBs in this section */}
                          {uldSection.awbs.map((awb, awbIndex) => {
                            const assignmentKey = `${awb.awbNo}-${sectorIndex}-${actualUldSectionIndex}-${awbIndex}`
                            const assignment = awbAssignments.get(assignmentKey)
                            const isLoaded = assignment?.isLoaded || false
                            const assignmentUld = assignment?.assignmentData.type === "single" 
                              ? assignment.assignmentData.uld 
                              : assignment?.assignmentData.type === "existing"
                              ? assignment.assignmentData.existingUld
                              : null
                            const isHovered = hoveredUld === assignmentUld && assignmentUld
                            const splitGroups = assignment?.assignmentData.type === "split" ? assignment.assignmentData.splitGroups : []

                            return (
                              <React.Fragment key={awbIndex}>
                                {/* AWB Row */}
                                <div
                                  className={`flex text-xs border-b border-gray-100 min-w-[800px] ${isLoaded ? "bg-gray-200 opacity-60" : "hover:bg-gray-50"} ${isHovered ? "border-l-4 border-l-red-500" : ""} ${isReadOnly ? "cursor-pointer" : ""}`}
                                  onClick={() => handleAWBRowClick(awb, sectorIndex, actualUldSectionIndex, awbIndex, assignment)}
                                  onMouseEnter={() => assignmentUld && setHoveredUld(assignmentUld)}
                                  onMouseLeave={() => setHoveredUld(null)}
                                >
                                  {awbFields.map((field) => (
                                    <div
                                      key={field.key}
                                      className={`px-2 py-1 flex-shrink-0 ${field.className || ""}`}
                                      style={{ width: field.key === "manDesc" ? "120px" : field.key === "awbNo" ? "100px" : "60px" }}
                                    >
                                      {awb[field.key] || "-"}
                                    </div>
                                  ))}
                                </div>
                                
                                {/* Remarks row */}
                                {awb.remarks && (
                                  <div className="px-2 py-1 text-xs text-gray-700 italic border-b border-gray-100 min-w-[800px]">
                                    {awb.remarks}
                                  </div>
                                )}

                                {/* Split Groups */}
                                {splitGroups && splitGroups.length > 0 && splitGroups.map((group) => {
                                  const groupUld = group.uld
                                  const isGroupHovered = hoveredUld === groupUld && groupUld
                                  return (
                                    <div
                                      key={`split-${group.id}`}
                                      className={`flex text-xs border-b border-gray-100 bg-gray-50 min-w-[800px] ${isGroupHovered ? "border-l-4 border-l-red-500" : ""}`}
                                      onMouseEnter={() => groupUld && setHoveredUld(groupUld)}
                                      onMouseLeave={() => setHoveredUld(null)}
                                    >
                                      <div className="px-2 py-1 pl-8 text-gray-500" style={{ width: "60px" }}>
                                        <span className="text-gray-400">└─</span>
                                      </div>
                                      <div className="px-2 py-1 font-medium text-gray-700" style={{ width: "100px" }}>{awb.awbNo}</div>
                                      <div className="px-2 py-1 text-gray-500" style={{ width: "60px" }}>{awb.orgDes}</div>
                                      <div className="px-2 py-1 font-semibold text-gray-700" style={{ width: "60px" }}>{group.pieces || "-"}</div>
                                      <div className="px-2 py-1 text-gray-500" style={{ width: "60px" }}>{groupUld || "-"}</div>
                                      <div className="px-2 py-1 text-gray-600 font-mono" style={{ width: "60px" }}>{group.no || "-"}</div>
                                      <div className="flex-1"></div>
                                    </div>
                                  )
                                })}
                              </React.Fragment>
                            )
                          })}
                          
                          {/* ULD Row AFTER all AWBs (matching markdown structure exactly) */}
                          {uldSection.uld && (
                            <div className="flex text-xs font-semibold text-gray-900 text-center border-b border-gray-200 min-w-[800px]">
                              <div className="px-2 py-1 flex-1">
                                {uldSection.uld}
                              </div>
                            </div>
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
                            <div key={uldSectionIndex}>
                              {/* ULD Row first in ramp transfer */}
                              {uldSection.uld && (
                                <div className="flex text-xs font-semibold text-gray-900 text-center bg-gray-50 border-b border-gray-200 min-w-[800px]">
                                  <div className="px-2 py-1 flex-1 col-span-full">
                                    {uldSection.uld}
                                  </div>
                                </div>
                              )}
                              {/* Then AWBs */}
                              {uldSection.awbs.map((awb, awbIndex) => {
                                const assignmentKey = `${awb.awbNo}-${sectorIndex}-${actualUldSectionIndex}-${awbIndex}`
                                const assignment = awbAssignments.get(assignmentKey)
                                return (
                                  <div
                                    key={awbIndex}
                                    className="flex text-xs border-b border-gray-100 bg-gray-50 hover:bg-gray-50 min-w-[800px]"
                                  >
                                    {awbFields.map((field) => (
                                      <div
                                        key={field.key}
                                        className={`px-2 py-1 flex-shrink-0 ${field.className || ""}`}
                                        style={{ width: field.key === "manDesc" ? "120px" : field.key === "awbNo" ? "100px" : "60px" }}
                                      >
                                        {awb[field.key] || "-"}
                                      </div>
                                    ))}
                                  </div>
                                )
                              })}
                            </div>
                          )
                        })}
                      </>
                    )}
                  </div>
                </div>

                {/* Footer Info - BAGG, COU, TOTALS (matching desktop order) */}
                <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
                  {sector.bagg && (
                    <div className="text-sm text-gray-900">
                      <span className="font-semibold">BAGG</span> {sector.bagg}
                    </div>
                  )}
                  {sector.cou && (
                    <div className="text-sm text-gray-900">
                      <span className="font-semibold">COU</span> {sector.cou}
                    </div>
                  )}
                  <div className="text-sm text-gray-900 mt-4">
                    <span className="font-semibold">TOTALS:</span>{" "}
                    {sector.totals.pcs} {sector.totals.wgt} {sector.totals.vol} {sector.totals.lvol}
                  </div>
                </div>
              </div>
            )
          })}

          {/* Bottom Footer - PREPARED BY/ON */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-700">
              <span>PREPARED BY:</span>
              <span>{loadPlan.preparedBy}</span>
              <span>PREPARED ON:</span>
              <span>{loadPlan.preparedOn}</span>
            </div>
          </div>
        </div>
      </div>

      {/* AWB Assignment Modal */}
      {selectedAWB && (
        <AWBAssignmentModal
          isOpen={showAssignmentModal}
          onClose={() => {
            setShowAssignmentModal(false)
            setSelectedAWB(null)
          }}
          awb={selectedAWB.awb}
          existingUlds={existingUlds}
          onConfirm={handleAssignmentConfirm}
        />
      )}

      {/* Loaded Status Modal */}
      <LoadedStatusModal
        isOpen={showLoadedModal}
        onClose={() => {
          setShowLoadedModal(false)
          setLoadedAWBNo("")
        }}
        awbNo={loadedAWBNo}
        onCancelLoading={() => {
          // Log unmark loaded
          addLog(loadPlan.flight, {
            action: "unmark_loaded",
            awbNo: loadedAWBNo,
            details: "Unmarked as loaded",
          })
          
          setAwbAssignments((prev) => {
            const updated = new Map(prev)
            for (const [key, assignment] of updated.entries()) {
              if (assignment.awbNo === loadedAWBNo) {
                updated.set(key, { ...assignment, isLoaded: false })
              }
            }
            return updated
          })
          setShowLoadedModal(false)
          setLoadedAWBNo("")
        }}
      />
    </div>
  )
}
