"use client"

import { useState, useEffect } from "react"
import { Plane, Clock, MapPin, Package, RefreshCw, Loader2 } from "lucide-react"
import { getLoadPlansFromSupabase, getLoadPlanDetailFromSupabase, type LoadPlan } from "@/lib/load-plans-supabase"
import type { LoadPlanDetail } from "./load-plan-types"
import MobileLoadPlanDetailScreen from "./mobile-load-plan-detail-screen"
import LoadPlanLogsScreen from "./load-plan-logs-screen"
import BottomNav from "./bottom-nav"
import MenuDrawer from "./menu-drawer"
import { useStaff } from "@/lib/staff-context"
import { getSupabaseClient } from "@/lib/supabase"

interface ExportScreenProps {
  onLogout: () => void
  onFlightSelect: (flight: any) => void
  onNavigate: (screen: "landing" | "import" | "export" | "loadPlan" | "newULD" | "dropStatus" | "inductionStatus" | "reconciliation") => void
}

export default function ExportScreen({ onLogout, onFlightSelect, onNavigate }: ExportScreenProps) {
  const [loadPlans, setLoadPlans] = useState<LoadPlan[]>([])
  const [selectedLoadPlan, setSelectedLoadPlan] = useState<LoadPlanDetail | null>(null)
  const [currentView, setCurrentView] = useState<"list" | "detail" | "logs">("list")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [isNavVisible, setIsNavVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [hasVisitedDetail, setHasVisitedDetail] = useState(false)
  const [hasVisitedLogs, setHasVisitedLogs] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { staff, displayName, fetchAssignedFlights } = useStaff()

  // Fetch load plans list on mount - filtered by staff if logged in
  const fetchLoadPlans = async () => {
    try {
      setIsRefreshing(true)
      setError(null)
      
      console.log('[ExportScreen] Fetching load plans list...')
      
      // If staff is logged in, filter by assigned flights
      if (staff && displayName) {
        console.log(`[ExportScreen] Staff logged in: ${displayName}, fetching assigned flights...`)
        const assignedFlights = await fetchAssignedFlights()
        
        if (assignedFlights.length === 0) {
          console.log('[ExportScreen] No flights assigned to this staff member')
          setLoadPlans([])
          setLoading(false)
          setIsRefreshing(false)
          return
        }
        
        // Get flight numbers with EK prefix
        const flightNumbers = assignedFlights.map(f => {
          const flightNo = f.flightNo // Use camelCase (TypeScript type)
          return flightNo && flightNo.startsWith("EK") ? flightNo : `EK${flightNo || ""}`
        })
        
        console.log(`[ExportScreen] Fetching load plans for ${flightNumbers.length} assigned flights`)
        
        // Fetch load plans for assigned flights only
        const supabase = getSupabaseClient()
        if (!supabase) {
          throw new Error('Supabase client not available')
        }
        
        const { data: plans, error: fetchError } = await supabase
          .from('load_plans')
          .select('*')
          .in('flight_number', flightNumbers)
          .order('flight_date', { ascending: false })
        
        if (fetchError) {
          throw new Error(fetchError.message)
        }
        
        // Transform to LoadPlan format
        const transformedPlans = (plans || []).map((plan: any) => ({
          flight: plan.flight_number || "",
          date: formatDateForDisplay(plan.flight_date),
          acftType: plan.aircraft_type || "",
          acftReg: plan.aircraft_registration || "",
          pax: plan.route_full || (plan.route_origin && plan.route_destination ? `${plan.route_origin}/${plan.route_destination}` : ""),
          std: formatTime(plan.std_time),
          uldVersion: plan.uld_version || "",
          ttlPlnUld: plan.total_planned_uld || "",
        }))
        
        setLoadPlans(transformedPlans)
        console.log(`[ExportScreen] Loaded ${transformedPlans.length} load plans`)
      } else {
        // No staff - show all load plans
        console.log('[ExportScreen] No staff logged in, showing all load plans')
        const plans = await getLoadPlansFromSupabase()
        setLoadPlans(plans)
        console.log(`[ExportScreen] Loaded ${plans.length} load plans`)
      }
    } catch (err: any) {
      console.error('[ExportScreen] Error fetching load plans:', err)
      setError(err.message || 'Failed to load data')
      setLoadPlans([])
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }
  
  // Helper to format date
  function formatDateForDisplay(dateStr: string | null): string {
    if (!dateStr) return ""
    try {
      const date = new Date(dateStr)
      const day = date.getDate()
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      const month = monthNames[date.getMonth()]
      return `${day}${month}`
    } catch {
      return dateStr
    }
  }
  
  // Helper to format time
  function formatTime(timeStr: string | null): string {
    if (!timeStr) return ""
    return timeStr.substring(0, 5)
  }

  useEffect(() => {
    fetchLoadPlans()
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight

      const isAtBottom = currentScrollY + windowHeight >= documentHeight - 100

      if (isAtBottom) {
        setIsNavVisible(false)
      } else if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setIsNavVisible(false)
      } else if (currentScrollY < lastScrollY) {
        setIsNavVisible(true)
      }

      setLastScrollY(currentScrollY)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [lastScrollY])

  const handleRefresh = async () => {
    await fetchLoadPlans()
  }

  // Fetch detail only when user clicks on a row (lazy loading)
  const handleRowClick = async (loadPlan: LoadPlan) => {
    try {
      setIsLoadingDetail(true)
      console.log(`[ExportScreen] Fetching detail for ${loadPlan.flight}...`)
      
      const detail = await getLoadPlanDetailFromSupabase(loadPlan.flight)
      
      if (detail) {
        setSelectedLoadPlan(detail)
        setCurrentView("detail")
        setHasVisitedDetail(true)
      } else {
        setError(`Could not load details for flight ${loadPlan.flight}`)
      }
    } catch (err: any) {
      console.error('[ExportScreen] Error fetching load plan detail:', err)
      setError(err.message || 'Failed to load flight details')
    } finally {
      setIsLoadingDetail(false)
    }
  }

  const handleBottomNavNavigate = (screen: "home" | "detail" | "history") => {
    if (screen === "home") {
      setCurrentView("list")
      setSelectedLoadPlan(null)
    } else if (screen === "detail" && selectedLoadPlan) {
      setCurrentView("detail")
      setHasVisitedDetail(true)
    } else if (screen === "history" && selectedLoadPlan) {
      setCurrentView("logs")
      setHasVisitedLogs(true)
    }
  }

  // Render different views based on currentView
  if (currentView === "logs" && selectedLoadPlan) {
    return (
      <LoadPlanLogsScreen
        loadPlan={selectedLoadPlan}
        onBack={() => setCurrentView("detail")}
      />
    )
  }

  if (currentView === "detail" && selectedLoadPlan) {
    return (
      <MobileLoadPlanDetailScreen
        loadPlan={selectedLoadPlan}
        onBack={() => {
          setCurrentView("list")
          setSelectedLoadPlan(null)
        }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-white">
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

          <h1 className="text-base font-semibold text-gray-900">Load Plans</h1>

          <div className="flex items-center">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh data"
            >
              <RefreshCw className={`h-5 w-5 text-gray-700 ${isRefreshing ? "animate-[spin_1.5s_linear_infinite]" : ""}`} />
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
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-800 whitespace-pre-line">{error}</p>
            <button
              onClick={(e) => {
                e.preventDefault()
                setError(null)
                fetchLoadPlans()
              }}
              className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        )}

        <div className="bg-white overflow-hidden">
          {/* Table Rows */}
          <div className="divide-y divide-gray-200">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                <span className="ml-2 text-sm text-gray-500">Loading data...</span>
              </div>
            ) : loadPlans.length === 0 ? (
              <div className="px-1.5 py-3 text-center text-gray-500 text-sm">No load plan data available</div>
            ) : (
              loadPlans.map((loadPlan, index) => (
                <LoadPlanRow 
                  key={index} 
                  loadPlan={loadPlan} 
                  onClick={() => handleRowClick(loadPlan)} 
                  isLoadingDetail={isLoadingDetail}
                />
              ))
            )}
          </div>
        </div>

        {/* Loading overlay for detail fetch */}
        {isLoadingDetail && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-4 shadow-lg flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-[#D71A21]" />
              <span className="text-sm text-gray-700">Loading flight details...</span>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav
        currentScreen={currentView === "list" ? "home" : currentView === "detail" ? "detail" : "history"}
        onNavigate={handleBottomNavNavigate}
        isVisible={isNavVisible}
        hasVisitedDetail={hasVisitedDetail}
        hasVisitedHistory={hasVisitedLogs}
      />

      {/* Menu Drawer */}
      <MenuDrawer isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} onNavigate={onNavigate} />
    </div>
  )
}

interface LoadPlanRowProps {
  loadPlan: LoadPlan
  onClick: () => void
  isLoadingDetail: boolean
}

function LoadPlanRow({ loadPlan, onClick, isLoadingDetail }: LoadPlanRowProps) {
  // Extract origin and destination from PAX field (e.g., "DXB/MAA/0/23/251" -> "DXB-MAA")
  const getRoute = () => {
    const parts = loadPlan.pax.split("/")
    if (parts.length >= 2) {
      return `${parts[0]}-${parts[1]}`
    }
    return loadPlan.pax
  }

  return (
    <button
      onClick={onClick}
      disabled={isLoadingDetail}
      className="grid grid-cols-4 gap-1 px-1.5 py-1.5 text-sm hover:bg-gray-50 transition-colors w-full text-left group disabled:opacity-50"
    >
      <div className="text-center font-semibold text-gray-900">{loadPlan.flight}</div>
      <div className="text-center text-gray-700">{loadPlan.std}</div>
      <div className="text-center text-gray-700">{getRoute()}</div>
      <div className="relative flex items-center justify-center pl-8">
        <span className="font-medium text-gray-900">{loadPlan.ttlPlnUld || "-"}</span>
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
