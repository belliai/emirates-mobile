"use client"

import { useState, useEffect } from 'react'
import { ArrowLeft, Loader2, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'

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

const STORAGE_KEY_LOAD_PLANS = 'emirates_load_plans'
const STORAGE_KEY_LOAD_PLAN_ITEMS = 'emirates_load_plan_items'
const STORAGE_KEY_LAST_FETCH = 'emirates_load_plans_last_fetch'
const CACHE_DURATION = 5 * 60 * 1000 // 5 menit dalam milliseconds

export default function LoadPlanScreen({ onBack }: LoadPlanScreenProps) {
  const [loadPlans, setLoadPlans] = useState<LoadPlan[]>([])
  const [loadPlanItems, setLoadPlanItems] = useState<Record<string, LoadPlanItem[]>>({})
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set())
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Load data dari localStorage saat component mount
  useEffect(() => {
    const cachedPlans = loadFromCache()
    if (cachedPlans && cachedPlans.length > 0) {
      // Ada cache, load dari cache dulu, kemudian refresh di background
      setLoading(false)
      if (shouldRefreshCache()) {
        fetchLoadPlanData(false) // Refresh di background
      }
    } else {
      // Tidak ada cache, fetch langsung
      fetchLoadPlanData(false)
    }
  }, [])

  const loadFromCache = (): LoadPlan[] | null => {
    try {
      // Load load plans dari cache
      const cachedPlans = localStorage.getItem(STORAGE_KEY_LOAD_PLANS)
      if (cachedPlans) {
        const parsed = JSON.parse(cachedPlans) as LoadPlan[]
        setLoadPlans(parsed)
        console.log('Loaded load plans from cache:', parsed.length, 'items')
      }

      // Load load plan items dari cache
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
      
      // Try with explicit schema name
      const { data: loadPlanData, error: fetchError } = await supabase
        .schema('public')
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

        // Handle specific error for table not found
        if (fetchError.code === 'PGRST116' || 
            fetchError.message?.includes('does not exist') ||
            fetchError.message?.includes('schema cache')) {
          // Jika error tapi ada cache, tetap gunakan cache
          if (loadPlans.length > 0) {
            console.log('Using cached data due to error')
            setError(`Tidak dapat memuat data terbaru. Menampilkan data dari cache.\n\nError: ${fetchError.message}`)
            setLoading(false)
            setIsRefreshing(false)
            return
          }
          
          throw new Error(
            `Tabel load_plans tidak ditemukan.\n\n` +
            `Error: ${fetchError.message}\n` +
            `Code: ${fetchError.code}\n\n` +
            `Pastikan:\n` +
            `1. Tabel load_plans sudah dibuat di schema public\n` +
            `2. Nama tabel benar: load_plans (dengan 's' di akhir)\n` +
            `3. Refresh schema cache di Supabase Dashboard > Settings > API\n` +
            `4. Restart dev server setelah membuat tabel`
          )
        }
        throw fetchError
      }

      const plans = loadPlanData || []
      setLoadPlans(plans)
      // Save to cache dengan items yang sudah ada
      setLoadPlanItems(prev => {
        saveToCache(plans, prev)
        return prev
      })
    } catch (err: any) {
      console.error('Error fetching load plan data:', err)
      
      // Jika error tapi ada cache, tetap gunakan cache
      if (loadPlans.length > 0) {
        console.log('Using cached data due to error')
        setError(`Tidak dapat memuat data terbaru. Menampilkan data dari cache.\n\nError: ${err.message}`)
        setLoading(false)
        setIsRefreshing(false)
        return
      }
      
      const errorMessage = err.message || 'Gagal memuat data dari Supabase'
      setError(errorMessage)
      setLoadPlans([])
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  const fetchLoadPlanItems = async (loadPlanId: string) => {
    // Cek cache dulu
    const cachedItems = loadPlanItems[loadPlanId]
    if (cachedItems && cachedItems.length > 0) {
      console.log('Using cached items for load plan:', loadPlanId)
      return
    }

    try {
      setLoadingItems(prev => new Set(prev).add(loadPlanId))

      const { data: items, error: fetchError } = await supabase
        .schema('public')
        .from('load_plan_items')
        .select('*')
        .eq('load_plan_id', loadPlanId)
        .order('serial_number', { ascending: true })

      if (fetchError) {
        console.error('Error fetching load plan items:', fetchError)
        // Handle specific error for table not found
        if (fetchError.code === 'PGRST116' || fetchError.message?.includes('does not exist')) {
          console.error('Tabel load_plan_items tidak ditemukan')
          return
        }
        throw fetchError
      }

      const newItems = items || []
      setLoadPlanItems(prev => {
        const updated = {
          ...prev,
          [loadPlanId]: newItems
        }
        // Save to cache
        saveToCache(loadPlans, updated)
        return updated
      })
    } catch (err: any) {
      console.error('Error fetching load plan items:', err)
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
      return new Date(dateString).toLocaleDateString('id-ID', {
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
    return timeString.substring(0, 5) // Format HH:MM
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
            onClick={(e) => {
              e.preventDefault()
              fetchLoadPlanData(false)
            }}
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
              onClick={(e) => {
                e.preventDefault()
                fetchLoadPlanData(false)
              }}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            >
              Coba lagi
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12 bg-white rounded-lg border border-gray-200">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">Memuat data...</span>
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
                          <span className="ml-2 text-sm text-gray-500">Memuat items...</span>
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
