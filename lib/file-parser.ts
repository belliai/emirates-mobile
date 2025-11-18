import * as XLSX from "xlsx"
import type { Flight } from "./flight-data"

export async function parseFlightFile(file: File): Promise<Flight[]> {
  console.log("[v0] Starting file parsing:", file.name, file.type)

  try {
    const fileContent = await file.arrayBuffer()

    // Excel path: detect if this is the Shift 03 Allocation workbook and parse all sheets
    if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
      console.log("[v0] Parsing as Excel file")
      const workbook = XLSX.read(fileContent, { type: "array" })

      const targetSheets = new Set(["EM", "EM & LM", "AFT", "ADV AFT"]) // as seen in provided file
      const hasAllocationSheets = workbook.SheetNames.some((n) => targetSheets.has(n))

      if (hasAllocationSheets) {
        console.log("[v0] Detected allocation workbook; extracting flights from all relevant sheets")
        const flights = parseAllocationWorkbook(workbook, targetSheets)
        if (flights.length === 0) {
          throw new Error("No flights found in allocation sheets (EM/EM & LM/AFT/ADV AFT)")
        }
        return flights
      }

      // Fallback: generic first-sheet parsing (ULD import style)
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<string[]>(firstSheet, { header: 1, raw: false }) as string[][]
      return parseUldStyleRows(rows)
    }

    // CSV/TSV path (ULD import style)
    console.log("[v0] Parsing as CSV/TSV file")
    const text = new TextDecoder().decode(fileContent)
    const delimiter = text.includes("\t") ? "\t" : ","
    const rows = text.split("\n").map((line) => line.split(delimiter))

    // Try Early Morning flight summary structure first
    const summaryFlights = parseEarlyMorningCsvRows(rows)
    if (summaryFlights.length > 0) {
      console.log(`[v0] Early Morning CSV detected; parsed ${summaryFlights.length} flights`)
      return summaryFlights
    }

    // Fallback to ULD-style CSV
    return parseUldStyleRows(rows)
  } catch (error) {
    console.error("[v0] Error parsing file:", error)
    throw error
  }
}

// Parse the specific allocation workbook sheets into Flight[] with empty ULDs
function parseAllocationWorkbook(workbook: XLSX.WorkBook, targetSheets: Set<string>): Flight[] {
  const flightsMap = new Map<string, Flight>()

  for (const name of workbook.SheetNames) {
    if (!targetSheets.has(name)) continue
    const sheet = workbook.Sheets[name]
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false }) as string[][]
    if (!rows || rows.length === 0) continue

    // Find a header row that contains both "Flight No" and "Routing" (may appear twice across two blocks)
    let headerIndex = -1
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]?.map((c) => (typeof c === "string" ? c.trim() : c)) || []
      if (r.some((c) => c === "Flight No") && r.some((c) => c === "Routing")) {
        headerIndex = i
        break
      }
    }
    if (headerIndex === -1) continue

    const headerRow = rows[headerIndex].map((c) => (typeof c === "string" ? c.trim() : c))

    // Identify groups of columns: [Carrier?], Flight No, ETD, Routing — this may repeat horizontally
    // Build an array of group column indices by scanning header cells left-to-right
    type Group = { carrierCol: number | null; flightCol: number; etdCol: number; routingCol: number }
    const groups: Group[] = []
    for (let col = 0; col < headerRow.length; col++) {
      if (headerRow[col] === "Flight No") {
        const flightCol = col
        const etdCol = headerRow.indexOf("ETD", col + 1)
        const routingCol = headerRow.indexOf("Routing", col + 1)
        if (etdCol !== -1 && routingCol !== -1 && etdCol < routingCol) {
          const carrierCol = col - 1 >= 0 && headerRow[col - 1] === "Carrier" ? col - 1 : null
          groups.push({ carrierCol, flightCol, etdCol, routingCol })
        }
      }
    }

    if (groups.length === 0) continue

    // Data starts after header row; iterate until we hit a long blank stretch
    for (let r = headerIndex + 1; r < rows.length; r++) {
      const row = rows[r] || []
      let anyGroupHasFlight = false

      for (const g of groups) {
        const rawCarrier = g.carrierCol != null ? (row[g.carrierCol] || "").toString().trim() : "EK"
        const rawFlight = (row[g.flightCol] || "").toString().trim()
        const rawEtd = (row[g.etdCol] || "").toString().trim()
        const rawRouting = (row[g.routingCol] || "").toString().trim()

        if (!rawFlight && !rawEtd && !rawRouting) continue
        anyGroupHasFlight = true

        // Normalize values
        const carrier = rawCarrier || "EK"
        const flightDigits = rawFlight.replace(/[^0-9]/g, "")
        const flightNo = flightDigits ? flightDigits.padStart(4, "0") : rawFlight
        const flightNumber = carrier + flightNo

        const eta = normalizeTime(rawEtd)
        const routing = rawRouting

        const key = `${flightNumber}-${eta}-${routing}`
        if (!flightsMap.has(key)) {
          flightsMap.set(key, {
            flightNumber,
            eta,
            boardingPoint: routing,
            uldCount: 0,
            ulds: [],
          })
        }
      }

      // Heuristic stop condition: if the last 10 rows had no data groups, break
      if (!anyGroupHasFlight) {
        // continue to allow sparse blocks; do not early break aggressively
      }
    }
  }

  const flights = Array.from(flightsMap.values())
  console.log(`[v0] Allocation parse created ${flights.length} flights`)
  return flights
}

// Parse generic ULD-style rows into flights with ULDs
function parseUldStyleRows(rows: string[][]): Flight[] {
  console.log("[v0] Total rows read:", rows.length)
  const headerRow = rows[0]
  console.log("[v0] Header row:", headerRow)

  const dataRows = rows.slice(1)
  const flightMap = new Map<string, Flight>()

  let processedCount = 0
  let skippedCount = 0

  dataRows.forEach((row) => {
    const flightNumber = row[0]?.trim()
    const eta = row[1]?.trim()
    const boardingPoint = row[2]?.trim()
    const uldNumber = row[3]?.trim()
    const uldshc = row[4]?.trim() || ""
    const destination = row[5]?.trim() || ""
    const remarks = row[6]?.trim() || ""

    if (!flightNumber || flightNumber === "NaN" || flightNumber === "" || !uldNumber || uldNumber === "NaN" || uldNumber === "") {
      skippedCount++
      return
    }

    let formattedEta = eta
    if (eta && eta.includes(" ")) {
      const timePart = eta.split(" ")[1]
      if (timePart) formattedEta = timePart.substring(0, 5)
    }

    const flightKey = `${flightNumber}-${formattedEta}-${boardingPoint}`
    if (!flightMap.has(flightKey)) {
      flightMap.set(flightKey, {
        flightNumber,
        eta: formattedEta,
        boardingPoint,
        uldCount: 0,
        ulds: [],
      })
    }

    const flight = flightMap.get(flightKey)!
    flight.ulds.push({
      uldNumber,
      uldshc,
      destination,
      remarks,
      status: 1,
      statusHistory: [
        {
          status: 1,
          timestamp: new Date(),
          changedBy: "System",
        },
      ],
    })
    flight.uldCount = flight.ulds.length
    processedCount++
  })

  const flights = Array.from(flightMap.values())
  console.log("[v0] ULD-style parse complete:")
  console.log(`[v0] - Processed: ${processedCount} ULDs`)
  console.log(`[v0] - Skipped: ${skippedCount} rows`)
  console.log(`[v0] - Created: ${flights.length} flights`)

  if (flights.length === 0) {
    throw new Error(`No valid flight data found. Processed ${processedCount} rows, skipped ${skippedCount} rows.`)
  }
  return flights
}

function normalizeTime(value: string): string {
  const v = (value || "").trim()
  if (!v) return ""
  // Already HH:MM
  if (/^\d{2}:\d{2}$/.test(v)) return v
  // Possibly HH:MM:SS
  const m = v.match(/(\d{2}:\d{2})(?::\d{2})?/) // capture HH:MM optionally with :SS
  if (m) return m[1]
  // Excel may provide date-time like 2025-10-14 03:25:00
  const parts = v.split(" ")
  if (parts.length > 1 && /^\d{2}:\d{2}/.test(parts[1])) return parts[1].substring(0, 5)
  return v
}

// Parse the Early Morning Report CSV into flights with ULDs=0
function parseEarlyMorningCsvRows(rows: string[][]): Flight[] {
  if (!rows || rows.length === 0) return []

  // Detect if any header row resembles the Early Morning layout
  let isSummary = false
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const r = (rows[i] || []).map((c) => (c ?? "").toString().trim().toUpperCase())
    if (r.includes("ETD") && r.includes("ROUTING")) {
      // Heuristic: first col might be "FIRST WAVE FLIGHTS" or second wave
      if (r[0]?.includes("WAVE") || r[0] === "FLIGHT" || r[0].includes("FLIGHTS")) {
        isSummary = true
        break
      }
    }
  }
  if (!isSummary) return []

  const flightsMap = new Map<string, Flight>()

  for (const row of rows) {
    const c0 = (row[0] ?? "").toString().trim()
    const c1 = (row[1] ?? "").toString().trim()
    const c2 = (row[2] ?? "").toString().trim()

    // Skip section headers and totals
    const upper0 = c0.toUpperCase()
    if (
      !c0 && !c1 && !c2 ||
      upper0.includes("WAVE") ||
      upper0 === "TOTAL" ||
      upper0 === "FIRST WAVE FLIGHTS" ||
      upper0 === "SECOND WAVE FLIGHTS"
    ) {
      continue
    }

    // c0 is a numeric flight code (e.g., 0801), c1 is ETD, c2 is ROUTING
    if (!/^\d{3,4}$/.test(c0)) continue

    const flightDigits = c0.padStart(4, "0")
    const flightNumber = `EK${flightDigits}`
    const eta = normalizeTime(c1)
    const routing = c2

    if (!eta || !routing) continue

    const key = `${flightNumber}-${eta}-${routing}`
    if (!flightsMap.has(key)) {
      flightsMap.set(key, {
        flightNumber,
        eta,
        boardingPoint: routing,
        uldCount: 0,
        ulds: [],
      })
    }
  }

  return Array.from(flightsMap.values())
}
