"use client"

import { createContext, useContext, useState, ReactNode } from "react"
import { type BuildupStaff, parseStaffName, getAssignedFlights, type BUPAllocation } from "./buildup-staff"

type StaffContextType = {
  // Current logged-in staff
  staff: BuildupStaff | null
  // Parsed display name for the staff
  displayName: string
  // Full name for tooltips
  fullName: string
  // Set staff on login
  setStaff: (staff: BuildupStaff | null) => void
  // Logout
  logout: () => void
  // Get assigned flights for current staff
  fetchAssignedFlights: () => Promise<BUPAllocation[]>
  // Cached assigned flights
  assignedFlights: BUPAllocation[]
  // Loading state for assigned flights
  isLoadingFlights: boolean
  // Refresh assigned flights
  refreshAssignedFlights: () => Promise<void>
}

const StaffContext = createContext<StaffContextType | undefined>(undefined)

export function StaffProvider({ children }: { children: ReactNode }) {
  const [staff, setStaffState] = useState<BuildupStaff | null>(null)
  const [assignedFlights, setAssignedFlights] = useState<BUPAllocation[]>([])
  const [isLoadingFlights, setIsLoadingFlights] = useState(false)

  // Parse staff name for display
  const parsed = staff?.name ? parseStaffName(staff.name) : null
  const displayName = parsed?.displayName || ""
  const fullName = parsed?.fullName || ""

  const setStaff = (newStaff: BuildupStaff | null) => {
    setStaffState(newStaff)
    // Clear assigned flights when staff changes
    setAssignedFlights([])
  }

  const logout = () => {
    setStaffState(null)
    setAssignedFlights([])
  }

  const fetchAssignedFlights = async (): Promise<BUPAllocation[]> => {
    if (!staff || !displayName) {
      console.log("[StaffContext] No staff logged in, returning empty flights")
      return []
    }

    setIsLoadingFlights(true)
    try {
      console.log(`[StaffContext] Fetching assigned flights for ${displayName}`)
      const flights = await getAssignedFlights(displayName)
      setAssignedFlights(flights)
      console.log(`[StaffContext] Found ${flights.length} assigned flights`)
      return flights
    } catch (error) {
      console.error("[StaffContext] Error fetching assigned flights:", error)
      return []
    } finally {
      setIsLoadingFlights(false)
    }
  }

  const refreshAssignedFlights = async () => {
    await fetchAssignedFlights()
  }

  return (
    <StaffContext.Provider
      value={{
        staff,
        displayName,
        fullName,
        setStaff,
        logout,
        fetchAssignedFlights,
        assignedFlights,
        isLoadingFlights,
        refreshAssignedFlights,
      }}
    >
      {children}
    </StaffContext.Provider>
  )
}

export function useStaff() {
  const context = useContext(StaffContext)
  if (context === undefined) {
    throw new Error("useStaff must be used within a StaffProvider")
  }
  return context
}




