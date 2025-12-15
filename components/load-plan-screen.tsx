"use client"

import { useState, useEffect } from 'react'
import { ArrowLeft, Loader2, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import { useStaff } from '@/lib/staff-context'

interface LoadPlanScreenProps {
  onBack: () => void
}

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
  [key: string]: any
}

export default function LoadPlanScreen({ onBack }: LoadPlanScreenProps) {
  const [loadPlans, setLoadPlans] = useState<LoadPlan[]>([])
  const [loadPlanItems, setLoadPlanItems] = useState<Record<string, LoadPlanItem[]>>({})
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { staff, displayName, fullName, fetchAssignedFlights, assignedFlights } = useStaff()

  // Fetch load plans on mount - filtered by assigned flights if staff is logged in
  useEffect(() => {
    fetchLoadPlans()
  }, [])

  const fetchLoadPlans = async () => {
    try {
      setIsRefreshing(true)
      setError(null)

      console.log('[LoadPlanScreen] Fetching load plans from Supabase...')
      
      const supabase = getSupabaseClient()
      if (!supabase) {
        throw new Error('Supabase client not available. Check environment variables.')
      }
      
      // Build query - filter by assigned_to if staff is logged in
      let query = supabase
        .from('load_plans')
        .select('*')
      
      // If staff is logged in, filter by assigned_to (staff_no)
      if (staff?.staff_no) {
        console.log(`[LoadPlanScreen] Staff logged in: ${displayName} (staff_no: ${staff.staff_no}), filtering by assigned_to...`)
        query = query.eq('assigned_to', staff.staff_no)
      }
      
      query = query
        .order('flight_date', { ascending: false })
        .order('created_at', { ascending: false })

      const { data: loadPlanData, error: fetchError } = await query

      if (fetchError) {
        console.error('[LoadPlanScreen] Supabase error:', fetchError)
        throw new Error(fetchError.message)
      }

      const plans = loadPlanData || []
      setLoadPlans(plans)
      console.log(`[LoadPlanScreen] Loaded ${plans.length} load plans`)
      
      // Show helpful message if staff is logged in but no flights assigned
      if (staff?.staff_no && plans.length === 0) {
        console.log('[LoadPlanScreen] No flights assigned to this staff member')
      }
    } catch (err: any) {
      console.error('[LoadPlanScreen] Error fetching load plans:', err)
      setError(err.message || 'Failed to load data')
      setLoadPlans([])
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  // Fetch items only when row is expanded (lazy loading)
  const fetchLoadPlanItems = async (loadPlanId: string) => {
    // Check if already loaded
    if (loadPlanItems[loadPlanId] && loadPlanItems[loadPlanId].length > 0) {
      console.log('[LoadPlanScreen] Using cached items for:', loadPlanId)
      return
    }

    try {
      setLoadingItems(prev => new Set(prev).add(loadPlanId))

      const supabase = getSupabaseClient()
      if (!supabase) {
        throw new Error('Supabase client not available.')
      }
      
      const { data: items, error: fetchError } = await supabase
        .from('load_plan_items')
        .select('*')
        .eq('load_plan_id', loadPlanId)
        .order('serial_number', { ascending: true })

      if (fetchError) {
        console.error('[LoadPlanScreen] Error fetching items:', fetchError)
        return
      }

      setLoadPlanItems(prev => ({
        ...prev,
        [loadPlanId]: items || []
      }))
    } catch (err: any) {
      console.error('[LoadPlanScreen] Error fetching items:', err)
    } finally {
      setLoadingItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(loadPlanId)
        return newSet
      })
    }
  }

  const toggleRow = (loadPlanId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(loadPlanId)) {
      newExpanded.delete(loadPlanId)
    } else {
      newExpanded.add(loadPlanId)
      fetchLoadPlanItems(loadPlanId)
    }
    setExpandedRows(newExpanded)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '-'
    return timeString.substring(0, 5)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="h-5 w-5 text-gray-700" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">Load Plan</h1>
          </div>
          <button
            onClick={fetchLoadPlans}
            disabled={isRefreshing || loading}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh data"
          >
            <RefreshCw className={`h-5 w-5 text-gray-700 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="p-4 pb-20">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
            <button
              onClick={fetchLoadPlans}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12 bg-white rounded-lg border border-gray-200">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">Loading data...</span>
          </div>
        ) : loadPlans.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-500">No data available</p>
          </div>
        ) : (
          <div className="space-y-2">
            {loadPlans.map((plan) => {
              const isExpanded = expandedRows.has(plan.id)
              const items = loadPlanItems[plan.id] || []
              const isLoadingItems = loadingItems.has(plan.id)

              return (
                <div key={plan.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                  {/* Main Row */}
                  <div
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleRow(plan.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <button className="p-1 hover:bg-gray-200 rounded transition-colors">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-gray-600" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-600" />
                          )}
                        </button>
                        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Flight Number</div>
                            <div className="font-semibold text-gray-900">{plan.flight_number || '-'}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Flight Date</div>
                            <div className="text-sm text-gray-700">{formatDate(plan.flight_date)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Route</div>
                            <div className="text-sm text-gray-700">
                              {plan.route_full || `${plan.route_origin || ''}-${plan.route_destination || ''}` || '-'}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">STD Time</div>
                            <div className="text-sm text-gray-700">{formatTime(plan.std_time)}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="text-gray-500">Aircraft Type: </span>
                        <span className="text-gray-700">{plan.aircraft_type || '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Sector: </span>
                        <span className="text-gray-700">{plan.sector || '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Prepared By: </span>
                        <span className="text-gray-700">{plan.prepared_by || '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Total ULD: </span>
                        <span className="text-gray-700">{plan.total_planned_uld || '-'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Items */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 bg-gray-50">
                      {isLoadingItems ? (
                        <div className="p-8 flex items-center justify-center">
                          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                          <span className="ml-2 text-sm text-gray-500">Loading items...</span>
                        </div>
                      ) : items.length === 0 ? (
                        <div className="p-8 text-center text-sm text-gray-500">
                          No items available
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-gray-100 border-b border-gray-200">
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Serial</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">AWB Number</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Origin/Dest</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Pieces</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Weight</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Volume</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">ULD Allocation</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">SHC</th>
                              </tr>
                            </thead>
                            <tbody>
                              {items.map((item) => (
                                <tr key={item.id} className="border-b border-gray-100 hover:bg-white transition-colors">
                                  <td className="px-4 py-2 text-gray-700">{item.serial_number || '-'}</td>
                                  <td className="px-4 py-2 text-gray-700">{item.awb_number || '-'}</td>
                                  <td className="px-4 py-2 text-gray-700">{item.origin_destination || '-'}</td>
                                  <td className="px-4 py-2 text-gray-700">{item.pieces || '-'}</td>
                                  <td className="px-4 py-2 text-gray-700">
                                    {item.weight ? `${item.weight} kg` : '-'}
                                  </td>
                                  <td className="px-4 py-2 text-gray-700">
                                    {item.volume ? `${item.volume} m³` : '-'}
                                  </td>
                                  <td className="px-4 py-2 text-gray-700 font-medium">
                                    {item.uld_allocation || '-'}
                                  </td>
                                  <td className="px-4 py-2 text-gray-700">{item.special_handling_code || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
