/*
  One-off script to generate default flights from the AFT sheet
  of the allocation workbook. Produces public/default-flights.json
*/
const fs = require('fs')
const path = require('path')
const XLSX = require('xlsx')

function normalizeTime(value) {
  const v = (value || '').trim()
  if (!v) return ''
  if (/^\d{2}:\d{2}$/.test(v)) return v
  const m = v.match(/(\d{2}:\d{2})(?::\d{2})?/)
  if (m) return m[1]
  const parts = v.split(' ')
  if (parts.length > 1 && /^\d{2}:\d{2}/.test(parts[1])) return parts[1].substring(0, 5)
  return v
}

function parseAftSheet(workbook) {
  const sheet = workbook.Sheets['AFT']
  if (!sheet) return []
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false })
  if (!rows || rows.length === 0) return []

  let headerIndex = -1
  for (let i = 0; i < rows.length; i++) {
    const r = (rows[i] || []).map((c) => (typeof c === 'string' ? c.trim() : c))
    if (r && r.some((c) => c === 'Flight No') && r.some((c) => c === 'Routing')) {
      headerIndex = i
      break
    }
  }
  if (headerIndex === -1) return []
  const headerRow = rows[headerIndex].map((c) => (typeof c === 'string' ? c.trim() : c))

  const groups = []
  for (let col = 0; col < headerRow.length; col++) {
    if (headerRow[col] === 'Flight No') {
      const flightCol = col
      const etdCol = headerRow.indexOf('ETD', col + 1)
      const routingCol = headerRow.indexOf('Routing', col + 1)
      if (etdCol !== -1 && routingCol !== -1 && etdCol < routingCol) {
        const carrierCol = col - 1 >= 0 && headerRow[col - 1] === 'Carrier' ? col - 1 : null
        groups.push({ carrierCol, flightCol, etdCol, routingCol })
      }
    }
  }
  if (groups.length === 0) return []

  const flightsMap = new Map()

  for (let r = headerIndex + 1; r < rows.length; r++) {
    const row = rows[r] || []
    for (const g of groups) {
      const rawCarrier = g.carrierCol != null ? String(row[g.carrierCol] || '').trim() : 'EK'
      const rawFlight = String(row[g.flightCol] || '').trim()
      const rawEtd = String(row[g.etdCol] || '').trim()
      const rawRouting = String(row[g.routingCol] || '').trim()
      if (!rawFlight && !rawEtd && !rawRouting) continue

      const carrier = rawCarrier || 'EK'
      const flightDigits = rawFlight.replace(/[^0-9]/g, '')
      const flightNo = flightDigits ? flightDigits.padStart(4, '0') : rawFlight
      const flightNumber = carrier + flightNo
      const eta = normalizeTime(rawEtd)
      const routing = rawRouting
      if (!flightNo || !eta || !routing) continue

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
  }
  return Array.from(flightsMap.values())
}

function main() {
  const xlsxPath = path.resolve(process.cwd(), "16) BUP ALLOCATION LIST 14 OCT 2025 DX 0900-2100 H ...xlsx")
  if (!fs.existsSync(xlsxPath)) {
    console.error('Workbook not found:', xlsxPath)
    process.exit(1)
  }
  const wb = XLSX.read(fs.readFileSync(xlsxPath))
  const flights = parseAftSheet(wb)
  const outPath = path.resolve(process.cwd(), 'public', 'default-flights.json')
  fs.writeFileSync(outPath, JSON.stringify(flights, null, 2))
  console.log('Wrote', flights.length, 'flights to', outPath)
}

main()
