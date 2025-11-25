"use client"

import { useState, useEffect } from "react"
import { Plane, Clock, MapPin, Package, Calendar, RefreshCw, Loader2 } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase"
import type { LoadPlanDetail, Sector, ULDSection, AWBRow } from "./load-plan-types"
import MobileLoadPlanDetailScreen from "./mobile-load-plan-detail-screen"
import LoadPlanLogsScreen from "./load-plan-logs-screen"
import BottomNav from "./bottom-nav"
import MenuDrawer from "./menu-drawer"

interface LoadPlan {
  id: string
  flight_number: string
  flight_date: string
  aircraft_type: string | null
  aircraft_registration: string | null
  route_origin: string | null
  route_destination: string | null
  route_full: string | null
  std_time: string | null
  prepared_by: string | null
  total_planned_uld: string | null
  uld_version: string | null
  prepared_on: string | null
  sector: string | null
  created_at: string
  updated_at: string
}

interface LoadPlanItem {
  id: string
  load_plan_id: string
  serial_number: number | null
  awb_number: string | null
  origin_destination: string | null
  pieces: number | null
  weight: number | null
  volume: number | null
  load_volume: number | null
  special_handling_code: string | null
  uld_allocation: string | null
  manual_description: string | null
  product_code_pc: string | null
  booking_status: string | null
  priority_indicator: string | null
  flight_in: string | null
  arrival_date_time: string | null
  special_instructions: string | null
  [key: string]: any
}

const STORAGE_KEY_LOAD_PLANS = 'emirates_export_load_plans'
const STORAGE_KEY_LOAD_PLAN_ITEMS = 'emirates_export_load_plan_items'
const STORAGE_KEY_LAST_FETCH = 'emirates_export_load_plans_last_fetch'
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds

// Function to convert Supabase data to LoadPlanDetail format
function convertToLoadPlanDetail(plan: LoadPlan, items: LoadPlanItem[]): LoadPlanDetail {
  // Format date from flight_date (YYYY-MM-DD) to format like "01Mar"
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString)
      const day = date.getDate().toString().padStart(2, '0')
      const month = date.toLocaleDateString('en-US', { month: 'short' })
      return `${day}${month}`
    } catch {
      return dateString
    }
  }

  // Format time from std_time (HH:MM:SS) to HH:MM format
  const formatTime = (timeString: string | null): string => {
    if (!timeString) return ""
    return timeString.substring(0, 5)
  }

  // Format prepared_on timestamp to expected format
  const formatPreparedOn = (timestamp: string | null): string => {
    if (!timestamp) return ""
    try {
      const date = new Date(timestamp)
      const day = date.getDate().toString().padStart(2, '0')
      const month = date.toLocaleDateString('en-US', { month: 'short' })
      const year = date.getFullYear()
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      const seconds = date.getSeconds().toString().padStart(2, '0')
      return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`
    } catch {
      return timestamp
    }
  }

  // Create PAX string from route
  const pax = plan.route_full || 
    (plan.route_origin && plan.route_destination 
      ? `${plan.route_origin}/${plan.route_destination}` 
      : "")

  // Group items by sector and ULD allocation
  // Sector is usually from plan.sector, or can be grouped by destination
  const sectorsMap = new Map<string, Map<string, AWBRow[]>>()
  
  items.forEach((item) => {
    // Use plan.sector if available, or get from destination (last 3 characters of origin_destination)
    let sector = plan.sector || "UNKNOWN"
    if (!sector || sector === "UNKNOWN") {
      if (item.origin_destination && item.origin_destination.length >= 6) {
        // Get destination (last 3 characters)
        sector = item.origin_destination.substring(3, 6)
      }
    }
    
    // If still not available, try to create from route
    if (!sector || sector === "UNKNOWN") {
      if (plan.route_destination) {
        sector = plan.route_destination
      } else if (plan.route_full) {
        const parts = plan.route_full.split('-')
        if (parts.length >= 2) {
          sector = parts[1]
        }
      }
    }
    
    const uld = item.uld_allocation || "XX BULK XX"
    
    if (!sectorsMap.has(sector)) {
      sectorsMap.set(sector, new Map())
    }
    
    const uldMap = sectorsMap.get(sector)!
    if (!uldMap.has(uld)) {
      uldMap.set(uld, [])
    }
    
    const awb: AWBRow = {
      ser: item.serial_number?.toString().padStart(3, '0') || "000",
      awbNo: item.awb_number || "",
      orgDes: item.origin_destination || "",
      pcs: item.pieces?.toString() || "0",
      wgt: item.weight?.toString() || "0",
      vol: item.volume?.toString() || "0",
      lvol: item.load_volume?.toString() || item.volume?.toString() || "0",
      shc: item.special_handling_code || "",
      manDesc: item.manual_description || "",
      pcode: item.product_code_pc || "",
      pc: "",
      thc: "",
      bs: item.booking_status || "SS",
      pi: item.priority_indicator || "N",
      fltin: item.flight_in || "",
      arrdtTime: item.arrival_date_time 
        ? new Date(item.arrival_date_time).toLocaleString('en-GB', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }).replace(',', '')
        : "",
      qnnAqnn: "",
      whs: "",
      si: item.special_instructions ? "Y" : "N",
      remarks: item.special_instructions || undefined,
    }
    
    uldMap.get(uld)!.push(awb)
  })

  // Convert Map to Sector array
  const sectors: Sector[] = Array.from(sectorsMap.entries()).map(([sectorName, uldMap]) => {
    const allAWBs: AWBRow[] = []
    const uldSections: ULDSection[] = Array.from(uldMap.entries()).map(([uld, awbs]) => {
      allAWBs.push(...awbs)
      return {
        uld: uld.startsWith("XX") ? uld : `XX ${uld} XX`,
        awbs,
        isRampTransfer: false,
      }
    })

    // Calculate totals from all AWBs in this sector
    const totals = {
      pcs: allAWBs.reduce((sum, awb) => sum + parseInt(awb.pcs) || 0, 0).toString(),
      wgt: allAWBs.reduce((sum, awb) => sum + parseFloat(awb.wgt) || 0, 0).toFixed(2),
      vol: allAWBs.reduce((sum, awb) => sum + parseFloat(awb.vol) || 0, 0).toFixed(2),
      lvol: allAWBs.reduce((sum, awb) => sum + parseFloat(awb.lvol) || 0, 0).toFixed(2),
    }

    return {
      sector: sectorName,
      uldSections,
      totals,
    }
  })

  return {
    flight: plan.flight_number,
    date: formatDate(plan.flight_date),
    acftType: plan.aircraft_type || "",
    acftReg: plan.aircraft_registration || "",
    headerVersion: "1",
    pax,
    std: formatTime(plan.std_time),
    preparedBy: plan.prepared_by || "",
    ttlPlnUld: plan.total_planned_uld || "",
    uldVersion: plan.uld_version || "",
    preparedOn: formatPreparedOn(plan.prepared_on),
    sectors,
  }
}

interface ExportScreenProps {
  onLogout: () => void
  onFlightSelect: (flight: any) => void
  onNavigate: (screen: "landing" | "import" | "export" | "loadPlan" | "newULD" | "dropStatus" | "inductionStatus" | "reconciliation") => void
}

export default function ExportScreen({ onLogout, onFlightSelect, onNavigate }: ExportScreenProps) {
  const [loadPlans, setLoadPlans] = useState<LoadPlanDetail[]>([])
  const [selectedLoadPlan, setSelectedLoadPlan] = useState<LoadPlanDetail | null>(null)
  const [currentView, setCurrentView] = useState<"list" | "detail" | "logs">("list")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isNavVisible, setIsNavVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [hasVisitedDetail, setHasVisitedDetail] = useState(false)
  const [hasVisitedLogs, setHasVisitedLogs] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadPlanItems, setLoadPlanItems] = useState<Record<string, LoadPlanItem[]>>({})

  const loadFromCache = (): LoadPlan[] | null => {
    try {
      const cachedPlans = localStorage.getItem(STORAGE_KEY_LOAD_PLANS)
      if (cachedPlans) {
        const parsed = JSON.parse(cachedPlans) as LoadPlan[]
        console.log('Loaded load plans from cache:', parsed.length, 'items')
      }

      const cachedItems = localStorage.getItem(STORAGE_KEY_LOAD_PLAN_ITEMS)
      if (cachedItems) {
        const parsed = JSON.parse(cachedItems) as Record<string, LoadPlanItem[]>
        setLoadPlanItems(parsed)
        console.log('Loaded load plan items from cache')
      }

      return cachedPlans ? JSON.parse(cachedPlans) as LoadPlan[] : null
    } catch (err) {
      console.error('Error loading from cache:', err)
      return null
    }
  }

  const saveToCache = (plans: LoadPlan[], items?: Record<string, LoadPlanItem[]>) => {
    try {
      localStorage.setItem(STORAGE_KEY_LOAD_PLANS, JSON.stringify(plans))
      localStorage.setItem(STORAGE_KEY_LAST_FETCH, Date.now().toString())
      
      if (items) {
        localStorage.setItem(STORAGE_KEY_LOAD_PLAN_ITEMS, JSON.stringify(items))
      }
      console.log('Saved to cache')
    } catch (err) {
      console.error('Error saving to cache:', err)
    }
  }

  const shouldRefreshCache = (): boolean => {
    try {
      const lastFetch = localStorage.getItem(STORAGE_KEY_LAST_FETCH)
      if (!lastFetch) return true
      
      const lastFetchTime = parseInt(lastFetch, 10)
      const now = Date.now()
      return (now - lastFetchTime) > CACHE_DURATION
    } catch {
      return true
    }
  }

  const fetchLoadPlanData = async (useCache: boolean = false) => {
    try {
      if (!useCache) {
        setIsRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      console.log('Fetching load plans from Supabase...')
      
      const supabase = getSupabaseClient()
      if (!supabase) {
        throw new Error('Supabase client is not available. Make sure environment variables are set.')
      }
      
      const { data: loadPlanData, error: fetchError } = await supabase
        .from('load_plans')
        .select('*')
        .order('flight_date', { ascending: false })
        .order('created_at', { ascending: false })

      console.log('Fetch result:', { data: loadPlanData, error: fetchError })

      if (fetchError) {
        console.error('Supabase error details:', {
          code: fetchError.code,
          message: fetchError.message,
          details: fetchError.details,
          hint: fetchError.hint
        })

        if (fetchError.code === 'PGRST116' || 
            fetchError.message?.includes('does not exist') ||
            fetchError.message?.includes('schema cache')) {
          if (loadPlans.length > 0) {
            console.log('Using cached data due to error')
            setError(`Unable to load latest data. Displaying data from cache.\n\nError: ${fetchError.message}`)
            setLoading(false)
            setIsRefreshing(false)
            return
          }
          
          throw new Error(
            `Table load_plans not found.\n\n` +
            `Error: ${fetchError.message}\n` +
            `Code: ${fetchError.code}\n\n` +
            `Please ensure:\n` +
            `1. Table load_plans has been created in public schema\n` +
            `2. Table name is correct: load_plans (with 's' at the end)\n` +
            `3. Refresh schema cache in Supabase Dashboard > Settings > API\n` +
            `4. Restart dev server after creating the table`
          )
        }
        throw fetchError
      }

      const plans = (loadPlanData || []) as LoadPlan[]
      
      // Fetch items for all load plans
      const itemsMap: Record<string, LoadPlanItem[]> = {}
      for (const plan of plans) {
        const { data: items, error: itemsError } = await supabase
          .from('load_plan_items')
          .select('*')
          .eq('load_plan_id', plan.id)
          .order('serial_number', { ascending: true })

        if (itemsError) {
          console.error(`Error fetching items for plan ${plan.id}:`, itemsError)
        } else {
          itemsMap[plan.id] = (items || []) as LoadPlanItem[]
        }
      }

      setLoadPlanItems(itemsMap)
      
      // Convert to LoadPlanDetail format
      const convertedPlans: LoadPlanDetail[] = plans.map(plan => 
        convertToLoadPlanDetail(plan, itemsMap[plan.id] || [])
      )

      setLoadPlans(convertedPlans)
      saveToCache(plans, itemsMap)
    } catch (err: any) {
      console.error('Error fetching load plan data:', err)
      
      if (loadPlans.length > 0) {
        console.log('Using cached data due to error')
        setError(`Unable to load latest data. Displaying data from cache.\n\nError: ${err.message}`)
        setLoading(false)
        setIsRefreshing(false)
        return
      }
      
      const errorMessage = err.message || 'Failed to load data from Supabase'
      setError(errorMessage)
      setLoadPlans([])
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  // Load data from localStorage when component mounts
  useEffect(() => {
    const loadInitialData = () => {
      try {
        // Load cached plans
        const cachedPlans = localStorage.getItem(STORAGE_KEY_LOAD_PLANS)
        const cachedItems = localStorage.getItem(STORAGE_KEY_LOAD_PLAN_ITEMS)
        
        if (cachedPlans) {
          const plans = JSON.parse(cachedPlans) as LoadPlan[]
          const items = cachedItems ? JSON.parse(cachedItems) as Record<string, LoadPlanItem[]> : {}
          
          setLoadPlanItems(items)
          
          // Convert cached plans to LoadPlanDetail
          const convertedPlans: LoadPlanDetail[] = plans.map(plan => 
            convertToLoadPlanDetail(plan, items[plan.id] || [])
          )
          setLoadPlans(convertedPlans)
          setLoading(false)
          
          if (shouldRefreshCache()) {
            fetchLoadPlanData(false) // Refresh in background
          }
        } else {
          // No cache, fetch directly
          fetchLoadPlanData(false)
        }
      } catch (err) {
        console.error('Error loading initial data:', err)
        fetchLoadPlanData(false)
      }
    }
    
    loadInitialData()
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
    await fetchLoadPlanData(false)
  }

  const handleRowClick = (loadPlan: LoadPlanDetail) => {
    setSelectedLoadPlan(loadPlan)
    setCurrentView("detail")
    setHasVisitedDetail(true)
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

  const getTotalAWBs = (loadPlan: LoadPlanDetail) => {
    return loadPlan.sectors.reduce((sum, sector) => {
      return sum + sector.uldSections.reduce((s, uld) => s + uld.awbs.length, 0)
    }, 0)
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
                fetchLoadPlanData(false)
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
                <LoadPlanRow key={index} loadPlan={loadPlan} onClick={() => handleRowClick(loadPlan)} totalAWBs={getTotalAWBs(loadPlan)} />
              ))
            )}
          </div>
        </div>
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
  loadPlan: LoadPlanDetail
  onClick: () => void
  totalAWBs: number
}

function LoadPlanRow({ loadPlan, onClick, totalAWBs }: LoadPlanRowProps) {
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
      className="grid grid-cols-4 gap-1 px-1.5 py-1.5 text-sm hover:bg-gray-50 transition-colors w-full text-left group"
    >
      <div className="text-center font-semibold text-gray-900">{loadPlan.flight}</div>
      <div className="text-center text-gray-700">{loadPlan.std}</div>
      <div className="text-center text-gray-700">{getRoute()}</div>
      <div className="relative flex items-center justify-center pl-8">
        <span className="font-medium text-gray-900">{totalAWBs}</span>
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
