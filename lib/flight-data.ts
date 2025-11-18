export interface StatusHistoryEntry {
  status: 1 | 2 | 3 | 4 | 5
  timestamp: Date
  changedBy?: string
}

export interface StatusHistory {
  status: 1 | 2 | 3 | 4 | 5
  timestamp: Date
}

export interface ULD {
  uldNumber: string
  uldshc: string
  destination: string
  remarks: string
  status: 1 | 2 | 3 | 4 | 5
  statusHistory?: StatusHistoryEntry[]
}

export interface Flight {
  flightNumber: string
  eta: string
  boardingPoint: string
  uldCount: number
  ulds: ULD[]
}

// Parse CSV text into array of objects
function parseCSV(csvText: string): any[] {
  const lines = csvText.trim().split("\n")
  const headers = lines[0].split(",").map((h) => h.trim())

  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim())
    const obj: any = {}
    headers.forEach((header, index) => {
      obj[header] = values[index] || ""
    })
    return obj
  })
}

// Fetch and process flight data from CSV
export async function getFlightData(): Promise<Flight[]> {
  try {
    const response = await fetch(
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Emirates%20distribtion%20-%20EF%20%28wareshouse%20modules%29-Mo7zpcsy5wICzmbw9Pd47ClRyKa5qq.csv",
    )
    const csvText = await response.text()
    const rows = parseCSV(csvText)

    // Group by flight number, ETA, and boarding point
    const flightMap = new Map<string, Flight>()

    rows.forEach((row) => {
      if (!row["FLTno."] || !row["ETA"] || !row["Brdpnt"]) {
        return
      }

      const flightKey = `${row["FLTno."]}-${row["ETA"]}-${row["Brdpnt"]}`

      if (!flightMap.has(flightKey)) {
        flightMap.set(flightKey, {
          flightNumber: row["FLTno."],
          eta: row["ETA"],
          boardingPoint: row["Brdpnt"],
          uldCount: 0,
          ulds: [],
        })
      }

      const flight = flightMap.get(flightKey)!

      const randomStatus = (Math.floor(Math.random() * 5) + 1) as 1 | 2 | 3 | 4 | 5

      const statusHistory: StatusHistoryEntry[] = []
      for (let status = 1; status <= randomStatus; status++) {
        statusHistory.push({
          status: status as 1 | 2 | 3 | 4 | 5,
          timestamp: getRandomPastTimestamp(randomStatus - status + 1), // Earlier statuses have older timestamps
          changedBy: getRandomName(),
        })
      }

      // Add ULD to flight
      flight.ulds.push({
        uldNumber: row["ULDNumber"],
        uldshc: row["ULDSHC"],
        destination: row["Dest"],
        remarks: row["Remarks"],
        status: randomStatus,
        statusHistory,
      })

      flight.uldCount = flight.ulds.length
    })

    return Array.from(flightMap.values())
  } catch (error) {
    console.error("[v0] Error fetching flight data:", error)
    return []
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

function getRandomName(): string {
  return FICTIONAL_NAMES[Math.floor(Math.random() * FICTIONAL_NAMES.length)]
}

function getRandomPastTimestamp(hoursAgo: number): Date {
  const now = new Date()
  const randomMinutes = Math.floor(Math.random() * 60) // Random minutes within the hour
  return new Date(now.getTime() - hoursAgo * 60 * 60 * 1000 - randomMinutes * 60 * 1000)
}
