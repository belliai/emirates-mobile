import { getSupabaseClient } from "@/lib/supabase"
import type { LoadPlanDetail } from "@/components/load-plan-types"

// Simple LoadPlan type for list view
export type LoadPlan = {
  flight: string
  date: string
  acftType: string
  acftReg: string
  pax: string
  std: string
  ttlPlnUld: string
  adjustedTtlPlnUld?: string // TTL PLN ULD minus COUR/MAIL/RAMP TRANSFER exclusions
  uldVersion: string
}


/**
 * Format date from YYYY-MM-DD to DDMMM format (e.g., "2024-10-12" -> "12Oct")
 */
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

/**
 * Format time from HH:MM:SS to HH:MM
 */
function formatTime(timeStr: string | null): string {
  if (!timeStr) return ""
  return timeStr.substring(0, 5)
}

/**
 * Format datetime to display format (for prepared_on)
 */
function formatDateTime(dateTimeStr: string | null): string {
  if (!dateTimeStr) return ""
  
  try {
    const date = new Date(dateTimeStr)
    const day = date.getDate()
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const month = monthNames[date.getMonth()]
    const year = date.getFullYear().toString().substring(2)
    const hours = date.getHours().toString().padStart(2, "0")
    const minutes = date.getMinutes().toString().padStart(2, "0")
    const seconds = date.getSeconds().toString().padStart(2, "0")
    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`
  } catch {
    return dateTimeStr
  }
}

/**
 * Format arrival date time to display format
 */
function formatArrivalDateTime(dateTimeStr: string | null): string {
  if (!dateTimeStr) return ""
  
  try {
    const date = new Date(dateTimeStr)
    const day = date.getDate().toString().padStart(2, "0")
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const month = monthNames[date.getMonth()]
    const year = date.getFullYear().toString()
    const hours = date.getHours().toString().padStart(2, "0")
    const minutes = date.getMinutes().toString().padStart(2, "0")
    return `${day}${month}${year} ${hours}:${minutes}/`
  } catch {
    return dateTimeStr
  }
}

/**
 * Fetch load plans list from Supabase (fast - only list data, no items)
 */
export async function getLoadPlansFromSupabase(): Promise<LoadPlan[]> {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) {
      console.log("[LoadPlans] Supabase not configured, returning empty array")
      return []
    }

    // Fetch load plans only - no items
    const { data: loadPlans, error } = await supabase
      .from("load_plans")
      .select("*")
      .order("flight_date", { ascending: false })
      .order("flight_number", { ascending: true })

    if (error) {
      console.error("[LoadPlans] Error fetching load plans:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      return []
    }

    if (!loadPlans || loadPlans.length === 0) {
      console.log("[LoadPlans] No load plans found in database")
      return []
    }

    // Transform to simple LoadPlan format for list view
    const transformed: LoadPlan[] = loadPlans.map((plan: any) => {
      let pax = ""
      if (plan.route_full) {
        pax = plan.route_full
      } else if (plan.route_origin && plan.route_destination) {
        pax = `${plan.route_origin}/${plan.route_destination}`
      }
      
      return {
        flight: plan.flight_number || "",
        date: formatDateForDisplay(plan.flight_date),
        acftType: plan.aircraft_type || "",
        acftReg: plan.aircraft_registration || "",
        pax,
        std: formatTime(plan.std_time),
        uldVersion: plan.uld_version || "",
        ttlPlnUld: plan.total_planned_uld || "",
        adjustedTtlPlnUld: plan.adjusted_ttl_pln_uld || undefined,
      }
    })

    console.log(`[LoadPlans] Successfully fetched ${transformed.length} load plans from Supabase`)
    return transformed
  } catch (error) {
    console.error("[LoadPlans] Error fetching load plans:", error)
    return []
  }
}


/**
 * Fetch load plan detail from Supabase (fetches items only when needed)
 */
export async function getLoadPlanDetailFromSupabase(flightNumber: string): Promise<LoadPlanDetail | null> {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) {
      console.log("[LoadPlans] Supabase not configured, returning null")
      return null
    }

    // Fetch load plan first
    const { data: loadPlan, error: loadPlanError } = await supabase
      .from("load_plans")
      .select("*")
      .eq("flight_number", flightNumber)
      .order("flight_date", { ascending: false })
      .limit(1)
      .single()

    if (loadPlanError || !loadPlan) {
      console.error("[LoadPlans] Error fetching load plan detail:", {
        code: loadPlanError?.code,
        message: loadPlanError?.message
      })
      return null
    }

    // Fetch load plan items
    // Order by additional_data DESC (additional_data = true first/red on top), then by serial_number
    const { data: items, error: itemsError } = await supabase
      .from("load_plan_items")
      .select("*")
      .eq("load_plan_id", loadPlan.id)
      .order("additional_data", { ascending: false }) // DESC: additional_data = true first (red on top)
      .order("serial_number", { ascending: true })

    if (itemsError) {
      console.error("[LoadPlans] Error fetching load plan items:", {
        code: itemsError.code,
        message: itemsError.message
      })
      return null
    }

    // Group items by sector and ULD
    const sortedItems = items || []
    const sectorMap = new Map<string, Map<string, Map<boolean, any[]>>>()
    
    sortedItems.forEach((item: any) => {
      const sector = item.sector || "NULL_SECTOR"
      const uld = item.uld_allocation || ""
      const isRampTransfer = item.is_ramp_transfer === true || item.is_ramp_transfer === 1
      
      if (!sectorMap.has(sector)) {
        sectorMap.set(sector, new Map())
      }
      
      const uldMap = sectorMap.get(sector)!
      if (!uldMap.has(uld)) {
        uldMap.set(uld, new Map())
      }
      
      const rampTransferMap = uldMap.get(uld)!
      if (!rampTransferMap.has(isRampTransfer)) {
        rampTransferMap.set(isRampTransfer, [])
      }
      
      rampTransferMap.get(isRampTransfer)!.push(item)
    })
    
    // Handle null sectors
    if (sectorMap.has("NULL_SECTOR")) {
      const nullSectorItems = sectorMap.get("NULL_SECTOR")!
      sectorMap.delete("NULL_SECTOR")
      const headerSector = loadPlan.sector || "UNKNOWN"
      if (!sectorMap.has(headerSector)) {
        sectorMap.set(headerSector, nullSectorItems)
      } else {
        const existingSector = sectorMap.get(headerSector)!
        nullSectorItems.forEach((uldMap, uld) => {
          if (!existingSector.has(uld)) {
            existingSector.set(uld, new Map())
          }
          const existingRampMap = existingSector.get(uld)!
          uldMap.forEach((items, isRamp) => {
            if (!existingRampMap.has(isRamp)) {
              existingRampMap.set(isRamp, [])
            }
            existingRampMap.get(isRamp)!.push(...items)
          })
        })
      }
    }

    // Transform to LoadPlanDetail format
    const sectors: any[] = []
    
    Array.from(sectorMap.entries()).forEach(([sectorName, sectorUldMap]) => {
      const sectorRegularItems: any[] = []
      const sectorRampTransferItems: any[] = []
      
      Array.from(sectorUldMap.entries()).forEach(([, rampTransferMap]) => {
        Array.from(rampTransferMap.entries()).forEach(([isRamp, items]) => {
          if (isRamp) {
            sectorRampTransferItems.push(...items)
          } else {
            sectorRegularItems.push(...items)
          }
        })
      })
      
      // Sort items by additional_data DESC (red on top), then by serial_number ASC
      const sortByAdditionalDataThenSerial = (a: any, b: any) => {
        const aAdditional = a.additional_data === true
        const bAdditional = b.additional_data === true
        // FIRST PRIORITY: additional_data DESC (true first/red on top)
        if (aAdditional !== bAdditional) {
          return bAdditional ? 1 : -1
        }
        // SECOND PRIORITY: serial_number ASC
        return (parseInt(a.serial_number) || 0) - (parseInt(b.serial_number) || 0)
      }
      
      sectorRegularItems.sort(sortByAdditionalDataThenSerial)
      sectorRampTransferItems.sort(sortByAdditionalDataThenSerial)
      
      // Create ULD sections
      const createUldSections = (items: any[], isRampTransfer: boolean) => {
        const uldMap = new Map<string, any[]>()
        items.forEach((item: any) => {
          const uld = item.uld_allocation || ""
          if (!uldMap.has(uld)) {
            uldMap.set(uld, [])
          }
          uldMap.get(uld)!.push(item)
        })
        
        // Sort function: additional_data DESC (red on top), then serial_number ASC
        const sortFn = (a: any, b: any) => {
          const aAdditional = a.additional_data === true
          const bAdditional = b.additional_data === true
          if (aAdditional !== bAdditional) {
            return bAdditional ? 1 : -1
          }
          return (parseInt(a.serial_number) || 0) - (parseInt(b.serial_number) || 0)
        }
        
        return Array.from(uldMap.entries())
          .map(([uld, awbs]) => ({
            uld,
            awbs: awbs.sort(sortFn)
          }))
          .sort((a, b) => {
            // Sort ULD sections: sections with additional_data items first, then by first serial_number
            if (a.awbs.length > 0 && b.awbs.length > 0) {
              const aFirstAdditional = a.awbs[0].additional_data === true
              const bFirstAdditional = b.awbs[0].additional_data === true
              if (aFirstAdditional !== bFirstAdditional) {
                return bFirstAdditional ? 1 : -1
              }
            }
            const aFirst = a.awbs.length > 0 ? (parseInt(a.awbs[0].serial_number) || 0) : 0
            const bFirst = b.awbs.length > 0 ? (parseInt(b.awbs[0].serial_number) || 0) : 0
            return aFirst - bFirst
          })
          .map(({ uld, awbs }) => ({
            uld: uld || "",
            awbs: awbs.map((item: any) => ({
              ser: item.serial_number?.toString().padStart(3, "0") || "",
              awbNo: (item.awb_number || "").replace(/\s+/g, ""),
              orgDes: item.origin_destination || "",
              pcs: item.pieces?.toString() || "",
              wgt: item.weight?.toString() || "",
              vol: item.volume?.toString() || "",
              lvol: item.load_volume?.toString() || "",
              shc: item.special_handling_code || "",
              manDesc: item.manual_description || "",
              pcode: item.product_code_pc || "",
              pc: "",
              thc: item.total_handling_charge ? item.total_handling_charge.toString() : "",
              bs: item.booking_status || "",
              pi: item.priority_indicator || "",
              fltin: item.flight_in || "",
              arrdtTime: item.arrival_date_time ? formatArrivalDateTime(item.arrival_date_time) : "",
              qnnAqnn: item.quantity_aqnn || "",
              whs: item.warehouse_code || "",
              si: item.special_instructions || "",
              remarks: item.special_notes || undefined,
              additional_data: item.additional_data === true || item.additional_data === 1, // Flag for red styling
            })),
            isRampTransfer,
          }))
      }
      
      const regularUldSections = createUldSections(sectorRegularItems, false)
      const rampTransferUldSections = createUldSections(sectorRampTransferItems, true)
      
      // Calculate totals
      const sectorAllItems = [...sectorRegularItems, ...sectorRampTransferItems]
      const sectorTotals = {
        pcs: sectorAllItems.reduce((sum, item: any) => sum + (parseFloat(item.pieces) || 0), 0).toString(),
        wgt: sectorAllItems.reduce((sum, item: any) => sum + (parseFloat(item.weight) || 0), 0).toFixed(2),
        vol: sectorAllItems.reduce((sum, item: any) => sum + (parseFloat(item.volume) || 0), 0).toFixed(2),
        lvol: sectorAllItems.reduce((sum, item: any) => sum + (parseFloat(item.load_volume) || 0), 0).toFixed(2),
      }
      
      sectors.push({
        sector: sectorName,
        uldSections: [...regularUldSections, ...rampTransferUldSections],
        totals: sectorTotals,
      })
    })

    const detail: LoadPlanDetail = {
      flight: loadPlan.flight_number || "",
      date: formatDateForDisplay(loadPlan.flight_date),
      acftType: loadPlan.aircraft_type || "",
      acftReg: loadPlan.aircraft_registration || "",
      headerVersion: loadPlan.header_version?.toString() || "1",
      pax: loadPlan.route_full || (loadPlan.route_origin && loadPlan.route_destination ? `${loadPlan.route_origin}/${loadPlan.route_destination}` : ""),
      std: formatTime(loadPlan.std_time),
      preparedBy: loadPlan.prepared_by || "",
      ttlPlnUld: loadPlan.total_planned_uld || "",
      adjustedTtlPlnUld: loadPlan.adjusted_ttl_pln_uld || undefined,
      uldVersion: loadPlan.uld_version || "",
      preparedOn: formatDateTime(loadPlan.prepared_on),
      sectors,
    }

    console.log(`[LoadPlans] Successfully fetched load plan detail for ${flightNumber}`)
    return detail
  } catch (error) {
    console.error("[LoadPlans] Error fetching load plan detail:", error)
    return null
  }
}

