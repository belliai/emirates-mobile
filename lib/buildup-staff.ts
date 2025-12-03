import { getSupabaseClient } from "@/lib/supabase"

/**
 * BuildupStaff type matching Supabase buildup_staff_list table
 * Schema:
 * - employee_group: text
 * - contract_id: text
 * - shift_pattern: text
 * - staff_no: bigint (primary key)
 * - name: text
 * - job_code: text ("COA" for operators, "CHS" for supervisors)
 */
export type BuildupStaff = {
  employee_group: string | null
  contract_id: string | null
  shift_pattern: string | null
  staff_no: number
  name: string | null
  job_code: string | null
}

/**
 * Parsed staff name with first name and last name separated
 */
export type ParsedStaffName = {
  firstName: string      // e.g., "John Kimani" - the part BEFORE the comma (first to appear in cell)
  lastName: string       // e.g., "Muchiri" - everything AFTER the comma  
  displayName: string    // e.g., "John Kimani" - short display (firstName only)
  fullName: string       // e.g., "John Kimani Muchiri" - for tooltips/search
  searchName: string     // e.g., "john kimani muchiri" - lowercase for search
}

/**
 * Parse the name from "FIRSTNAME, LASTNAME" format (as it appears in the cell)
 * Example: "JOHN KIMANI, MUCHIRI" -> firstName="John", lastName="Kimani Muchiri"
 * Example: "ROOSEVELT, DSOUZA" -> firstName="Roosevelt", lastName="Dsouza"
 */
export function parseStaffName(rawName: string | null): ParsedStaffName {
  if (!rawName) {
    return { firstName: "", lastName: "", displayName: "", fullName: "", searchName: "" }
  }
  
  // Split by comma - format is "FIRSTNAME, LASTNAME"
  // firstName = first word before comma
  // lastName = everything after comma + remaining words before comma
  const parts = rawName.split(",").map(p => p.trim())
  
  if (parts.length >= 2) {
    const beforeComma = parts[0] // Everything before comma
    const afterComma = parts[1] // Everything after comma
    
    // Split before comma into words - first word is firstName, rest goes to lastName
    const beforeCommaWords = beforeComma.split(/\s+/).filter(w => w.length > 0)
    const firstNameRaw = beforeCommaWords[0] || ""
    const remainingBeforeComma = beforeCommaWords.slice(1).join(" ")
    
    // Combine remaining words before comma with after comma for lastName
    const lastNameRaw = [remainingBeforeComma, afterComma].filter(s => s.length > 0).join(" ")
    
    // Capitalize properly (first letter uppercase, rest lowercase for each word)
    const capitalize = (str: string) => 
      str.split(" ").map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(" ")
    
    const firstName = capitalize(firstNameRaw)
    const lastName = capitalize(lastNameRaw)
    const fullName = `${firstName} ${lastName}`.trim()
    
    return {
      firstName,
      lastName,
      displayName: firstName, // Short display is just the first word
      fullName,
      searchName: fullName.toLowerCase()
    }
  }
  
  // If no comma, treat first word as first name, rest as last name
  const words = rawName.split(/\s+/).filter(w => w.length > 0)
  if (words.length > 0) {
    const firstNameRaw = words[0]
    const lastNameRaw = words.slice(1).join(" ")
    const capitalize = (str: string) => 
      str.split(" ").map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(" ")
    
    const firstName = capitalize(firstNameRaw)
    const lastName = capitalize(lastNameRaw)
    const fullName = `${firstName} ${lastName}`.trim()
    
    return {
      firstName,
      lastName,
      displayName: firstName,
      fullName,
      searchName: fullName.toLowerCase()
    }
  }
  
  // Fallback: treat whole thing as first name
  const name = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase()
  return {
    firstName: name,
    lastName: "",
    displayName: name,
    fullName: name,
    searchName: name.toLowerCase()
  }
}

/**
 * Simple helper that returns just the display name (firstName - the part before comma)
 * For backwards compatibility
 */
export function parseStaffDisplayName(fullName: string | null): string {
  return parseStaffName(fullName).displayName
}

/**
 * Check if Supabase is configured
 */
function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL && 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://placeholder.supabase.co" &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== "placeholder-anon-key"
  )
}

/**
 * Find staff by staff_no
 * Used for authentication/login
 */
export async function findStaffByStaffNo(staffNo: number | string): Promise<BuildupStaff | null> {
  try {
    if (!isSupabaseConfigured()) {
      console.log("[BuildupStaff] Supabase not configured")
      return null
    }

    const supabase = getSupabaseClient()
    if (!supabase) {
      console.log("[BuildupStaff] Supabase client not available")
      return null
    }

    const staffNoNum = typeof staffNo === "string" ? parseInt(staffNo, 10) : staffNo

    if (isNaN(staffNoNum)) {
      console.log("[BuildupStaff] Invalid staff_no:", staffNo)
      return null
    }

    const { data: staff, error } = await supabase
      .from("buildup_staff_list")
      .select("*")
      .eq("staff_no", staffNoNum)
      .limit(1)

    if (error) {
      console.error("[BuildupStaff] Error finding staff:", error)
      return null
    }

    if (!staff || staff.length === 0) {
      console.log("[BuildupStaff] No staff found with staff_no:", staffNoNum)
      return null
    }

    console.log("[BuildupStaff] Found staff:", staff[0].name)
    return staff[0] as BuildupStaff
  } catch (error) {
    console.error("[BuildupStaff] Error finding staff by staff_no:", error)
    return null
  }
}

/**
 * Find staff by name (partial match, case insensitive)
 * Useful for matching BUP allocation names like "BRIGHT" to full names
 */
export async function findStaffByName(searchName: string): Promise<BuildupStaff | null> {
  try {
    if (!isSupabaseConfigured()) {
      return null
    }

    const supabase = getSupabaseClient()
    if (!supabase) {
      return null
    }

    // Search using ilike for case-insensitive partial match
    const { data: staff, error } = await supabase
      .from("buildup_staff_list")
      .select("*")
      .ilike("name", `%${searchName}%`)
      .limit(1)

    if (error || !staff || staff.length === 0) {
      return null
    }

    return staff[0] as BuildupStaff
  } catch (error) {
    console.error("[BuildupStaff] Error finding staff by name:", error)
    return null
  }
}

/**
 * Fetch operators/workers (COA job code) from Supabase
 */
export async function getOperators(): Promise<BuildupStaff[]> {
  try {
    if (!isSupabaseConfigured()) {
      console.log("[BuildupStaff] Supabase not configured, returning empty array")
      return []
    }

    const supabase = getSupabaseClient()
    if (!supabase) {
      return []
    }

    const { data: staff, error } = await supabase
      .from("buildup_staff_list")
      .select("*")
      .eq("job_code", "COA")
      .order("name", { ascending: true })

    if (error) {
      console.error("[BuildupStaff] Error fetching operators:", error)
      return []
    }

    if (!staff || staff.length === 0) {
      console.log("[BuildupStaff] No operators found in database")
      return []
    }

    console.log(`[BuildupStaff] Successfully fetched ${staff.length} operators (COA) from Supabase`)
    return staff as BuildupStaff[]
  } catch (error) {
    console.error("[BuildupStaff] Error fetching operators:", error)
    return []
  }
}

/**
 * BUP Allocation type - flight assignment from desktop
 */
export type BUPAllocation = {
  id: string
  carrier: string
  flight_no: string
  etd: string | null
  routing: string | null
  staff: string | null
  mobile: string | null
  ac_type: string | null
  regn_no: string | null
  shift_type: string | null
  period: string | null
  wave: string | null
  date: string | null
  created_at: string | null
  updated_at: string | null
}

/**
 * Get flights assigned to a specific staff member from bup_allocations table
 * This is synced from desktop's Flight Assignment screen
 */
export async function getAssignedFlights(staffDisplayName: string): Promise<BUPAllocation[]> {
  try {
    if (!isSupabaseConfigured()) {
      console.log("[BuildupStaff] Supabase not configured")
      return []
    }

    const supabase = getSupabaseClient()
    if (!supabase) {
      return []
    }

    // Desktop stores staff name with first letter capitalized (e.g., "Harley")
    // Search case-insensitively
    const { data: allocations, error } = await supabase
      .from("bup_allocations")
      .select("*")
      .ilike("staff", staffDisplayName)
      .order("etd", { ascending: true })

    if (error) {
      console.error("[BuildupStaff] Error fetching assigned flights:", error)
      return []
    }

    if (!allocations || allocations.length === 0) {
      console.log(`[BuildupStaff] No flights assigned to ${staffDisplayName}`)
      return []
    }

    console.log(`[BuildupStaff] Found ${allocations.length} flights assigned to ${staffDisplayName}`)
    return allocations as BUPAllocation[]
  } catch (error) {
    console.error("[BuildupStaff] Error fetching assigned flights:", error)
    return []
  }
}

