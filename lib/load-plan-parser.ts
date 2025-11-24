import type { LoadPlanDetail, Sector, ULDSection, AWBRow } from "@/components/load-plan-types"

/**
 * Parse load plan from markdown/text content
 */
export function parseLoadPlanFromText(content: string, flightNumber: string): LoadPlanDetail | null {
  // Extract header information
  const flightMatch = content.match(new RegExp(`${flightNumber}\\s*/\\s*(\\w+)\\s+ACFT TYPE:\\s*(\\S+)\\s+ACFT REG:\\s*(\\S+)\\s+HEADER VERSION:\\s*(\\d+)`, "i"))
  if (!flightMatch) return null

  const date = flightMatch[1] || ""
  const acftType = flightMatch[2] || ""
  const acftReg = flightMatch[3] || ""
  const headerVersion = flightMatch[4] || "1"

  const paxMatch = content.match(/PAX:\s*([^\n]+?)\s+STD:/i)
  const pax = paxMatch ? paxMatch[1].trim() : ""

  const stdMatch = content.match(/STD:\s*(\d{2}:\d{2})/i)
  const std = stdMatch ? stdMatch[1] : ""

  const preparedByMatch = content.match(/PREPARED BY:\s*(\S+)/i)
  const preparedBy = preparedByMatch ? preparedByMatch[1] : ""

  const ttlPlnUldMatch = content.match(/TTL PLN ULD:\s*([^\n]+?)\s+ULD VERSION:/i)
  const ttlPlnUld = ttlPlnUldMatch ? ttlPlnUldMatch[1].trim() : ""

  const uldVersionMatch = content.match(/ULD VERSION:\s*([^\n]+?)\s+PREPARED ON:/i)
  const uldVersion = uldVersionMatch ? uldVersionMatch[1].trim() : ""

  const preparedOnMatch = content.match(/PREPARED ON:\s*([^\n]+)/i)
  const preparedOn = preparedOnMatch ? preparedOnMatch[1].trim() : ""

  // Extract remarks (lines that start with XX or quotes)
  const remarks: string[] = []
  const remarkMatches = content.matchAll(/(?:XX\s+[^X]+XX|"[^"]+")/gi)
  for (const match of remarkMatches) {
    const remark = match[0].trim()
    if (remark && !remark.includes("SER.") && !remark.includes("AWB NO")) {
      remarks.push(remark)
    }
  }

  // Extract sectors
  const sectors: Sector[] = []
  const sectorMatches = content.matchAll(/SECTOR:\s*([A-Z]{6})/gi)

  for (const sectorMatch of sectorMatches) {
    const sectorName = sectorMatch[1]
    const sectorStartIndex = sectorMatch.index || 0
    const nextSectorMatch = Array.from(content.matchAll(/SECTOR:\s*([A-Z]{6})/gi)).find(
      (m) => (m.index || 0) > sectorStartIndex
    )
    const sectorEndIndex = nextSectorMatch ? (nextSectorMatch.index || content.length) : content.length
    const sectorContent = content.substring(sectorStartIndex, sectorEndIndex)

    const uldSections: ULDSection[] = []
    let currentAWBs: AWBRow[] = []
    let pendingULD: string | null = null
    let pendingIsRampTransfer = false

    const lines = sectorContent.split("\n")
    let inRampTransfer = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      // Check for ramp transfer section
      if (line.includes("***** RAMP TRANSFER *****")) {
        inRampTransfer = true
        // Save any pending section before ramp transfer
        if (pendingULD !== null || currentAWBs.length > 0) {
          uldSections.push({
            uld: pendingULD || "",
            awbs: [...currentAWBs],
            isRampTransfer: pendingIsRampTransfer,
          })
          currentAWBs = []
          pendingULD = null
        }
        pendingIsRampTransfer = true
        continue
      }

      // Check for ULD line - this ULD applies to AWBs that came BEFORE it
      const uldMatch = line.match(/XX\s+([^X]+?)\s+XX/i)
      if (uldMatch) {
        // Save the AWBs we've collected so far with this ULD (which comes after them)
        const uldText = `XX ${uldMatch[1].trim()} XX`
        uldSections.push({
          uld: uldText,
          awbs: [...currentAWBs],
          isRampTransfer: inRampTransfer,
        })
        currentAWBs = []
        pendingULD = null
        continue
      }

      // Check for BULK
      if (line.match(/XX\s+BULK\s+XX/i)) {
        // Save the AWBs we've collected so far with BULK (which comes after them)
        uldSections.push({
          uld: "XX BULK XX",
          awbs: [...currentAWBs],
          isRampTransfer: inRampTransfer,
        })
        currentAWBs = []
        pendingULD = null
        continue
      }

      // Parse AWB line
      const awbMatch = line.match(
        /^(\d{3})\s+(\d{3}-\d{8})\s+([A-Z]{3})([A-Z]{3})\s+(\d+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([A-Z-]*)\s+(.+?)\s+([A-Z]{3})\s+([A-Z]\d*)\s+([A-Z0-9\s]*?)\s+(SS|NN)\s+([YN])\s+([A-Z]+\d+)?\s*(\d{2}[A-Za-z]{3}\d{4})?\s*([\d:\/]+)?\s*([YN])?/i
      )

      if (awbMatch) {
        const awb: AWBRow = {
          ser: awbMatch[1],
          awbNo: awbMatch[2],
          orgDes: awbMatch[3] + awbMatch[4],
          pcs: awbMatch[5],
          wgt: awbMatch[6],
          vol: awbMatch[7],
          lvol: awbMatch[8],
          shc: awbMatch[9] || "",
          manDesc: awbMatch[10].trim(),
          pcode: awbMatch[11] || "",
          pc: awbMatch[12] || "",
          thc: (awbMatch[13] || "").trim(),
          bs: awbMatch[14] || "SS",
          pi: awbMatch[15] || "N",
          fltin: awbMatch[16] || "",
          arrdtTime: awbMatch[17] && awbMatch[18] ? `${awbMatch[17]} ${awbMatch[18]}` : awbMatch[17] || awbMatch[18] || "",
          qnnAqnn: "",
          whs: "",
          si: awbMatch[19] || "N",
        }
        currentAWBs.push(awb)
        
        // Check next line for remarks
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim()
          if (nextLine.match(/^\[.+\]$/) || (nextLine.includes("[") && nextLine.includes("]"))) {
            awb.remarks = nextLine.replace(/[\[\]]/g, "").trim()
            i++ // Skip the remark line
          }
        }
      }

      // Check for standalone remarks (shouldn't happen after AWB, but handle just in case)
      if (line.match(/^\[.+\]$/) && currentAWBs.length > 0) {
        const lastAWB = currentAWBs[currentAWBs.length - 1]
        if (lastAWB && !lastAWB.remarks) {
          lastAWB.remarks = line.replace(/[\[\]]/g, "").trim()
        }
      }
      
      // Check for special instruction remarks (SI:)
      if (line.match(/^SI:/i) && i < lines.length - 1) {
        // This is a sector-level remark, we'll handle it separately if needed
      }
    }

    // Add final section if there are remaining AWBs without a ULD marker
    if (currentAWBs.length > 0) {
      uldSections.push({
        uld: "",
        awbs: [...currentAWBs],
        isRampTransfer: inRampTransfer,
      })
    }

    // Extract totals
    const totalsMatch = sectorContent.match(/TOTALS\s*:\s*(\d+)\s+([\d,]+\.?\d*)\s+([\d.]+)\s+([\d.]+)/i)
    const totals = totalsMatch
      ? {
          pcs: totalsMatch[1],
          wgt: totalsMatch[2],
          vol: totalsMatch[3],
          lvol: totalsMatch[4],
        }
      : {
          pcs: "0",
          wgt: "0",
          vol: "0",
          lvol: "0",
        }

    // Extract BAGG and COU
    const baggMatch = sectorContent.match(/BAGG\s+([^\n]+)/i)
    const bagg = baggMatch ? baggMatch[1].trim() : undefined

    const couMatch = sectorContent.match(/COU\s+([^\n]+)/i)
    const cou = couMatch ? couMatch[1].trim() : undefined

    sectors.push({
      sector: sectorName,
      uldSections,
      bagg,
      cou,
      totals,
    })
  }

  return {
    flight: flightNumber,
    date,
    acftType,
    acftReg,
    headerVersion,
    pax,
    std,
    preparedBy,
    ttlPlnUld,
    uldVersion,
    preparedOn,
    remarks: remarks.length > 0 ? remarks : undefined,
    sectors,
  }
}

