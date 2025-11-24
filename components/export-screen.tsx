"use client"

import { useState, useEffect } from "react"
import { Plane, Clock, MapPin, Package, Calendar, RefreshCw } from "lucide-react"
import { parseLoadPlanFromText } from "@/lib/load-plan-parser"
import type { LoadPlanDetail } from "./load-plan-types"
import MobileLoadPlanModal from "./mobile-load-plan-modal"
import LoadPlanLogsScreen from "./load-plan-logs-screen"
import BottomNav from "./bottom-nav"
import MenuDrawer from "./menu-drawer"

// Load plans markdown content
const LOAD_PLANS_CONTENT = `EMIRATES LOAD PLAN                                                              
EK0544  / 01Mar  ACFT TYPE: 77WER   ACFT REG: A6-ENT      HEADER VERSION: 1     
PAX: DXB/MAA/0/23/251              STD: 02:50                   PREPARED BY: PRINCE
TTL PLN ULD: 06PMC/07AKE           ULD VERSION: 06/26    PREPARED ON: 29-Feb-24 12:44:05            
SECTOR: DXBMAA                                                                  
SER.  AWB NO     ORG/DES  PCS   WGT     VOL  LVOL     SHC      MAN.DESC     PCODE PC THC  BS PI FLTIN ARRDT.TIME QNN/AQNN    WHS SI
001 176-92065120 FRAMAA    31  1640.2  18.9  20.0 PIL-CRT-EAP CONSOLIDATION A AXD P2      SS N EK9903 29Feb0418 13:40/22:31      N 
XX 02PMC XX                                                                                                                                           
002 176-98208961 DXBMAA     1    10.0   0.1   0.1 VAL         GOLD JEWELLERY. VAL P2 NORM NN N                                   N 
XX BULK XX                                                                                                                                            
003 176-93627586 MNLMAA    13  2690.0  18.5  18.5 HEA-CGO     CONSOLIDATION   GCR P1      SS N EK0333 27Feb2334 51:16/           N 
XX 02PMC XX                                                                                                                                           
004 176-99699530 PEKMAA     9   643.0   1.3   1.3 VUN         CONSOLIDATION   GCR P2      SS N EK9307 29Feb0216 19:20/24:33      N 
005 176-95418503 MXPMAA     3   356.0   2.8   2.8 SPX         CONSOLIDATION   GCR P2      SS N EK9918 29Feb0315 19:20/23:35      N 
006 176-92921581 MXPMAA     1   227.0   0.3   0.3 HEA-SPX     CONSOLIDATION   GCR P2      SS N EK9918 29Feb0315 19:20/23:35      N 
007 176-92082874 FRAMAA    15   242.5   1.9   1.9 EAP-SPX     CONSOLIDATION A GCR P1      SS N EK9903 29Feb0418 13:30/22:31      N 
008 176-93270542 FRAMAA    11   145.5   0.9   0.9 EAP         CONSOLIDATION A GCR P1      SS N EK9903 29Feb0418 13:30/22:31      N 
XX 06AKE XX                                                                                                                                           
***** RAMP TRANSFER *****
009 176-92388321 MIAMAA    57  1499.0   8.6   8.6 PES-CRT     SHRIMP          PXS P2 QRT  SS N EK0214 29Feb1915 07:25/           N 
010 176-92388332 MIAMAA    57  1499.0   8.6   8.6 PES-CRT     LIVE SHRIMP     PXS    QRT  SS N EK0214 29Feb1915 07:25/           N 
XX 02PMC XX                                                                                                                                           
011 176-91628773 DARMAA     1    20.0   0.1   0.1 VAL         GOLD            VAL P2 QRT  SS N EK0726 29Feb2145 05:05/           N 
012 176-91629020 DARMAA     1    20.0   0.1   0.1 VAL         GOLD            VAL P2 QRT  SS N EK0726 29Feb2145 05:05/           N 
XX BULK XX                                                                                                                                            
013 176-91073931 KRKMAA     1   363.0   0.6   4.0 SPX-EAP-HEA CONSOLIDATION A AXA P1 QRT  SS N EK0180 29Feb2220 04:30/           N 
XX 01AKE XX                                                                                                                                           
BAGG 10AKE 
COU BULK DHL 300KGS                                                                                                                                                                                                                                                                                                                                                                                
        TOTALS : 201     9,355.20     62.69     67.23  
EMIRATES LOAD PLAN                                                              
EK0205  / 12Oct  ACFT TYPE: 388R    ACFT REG: A6-EOW      HEADER VERSION: 1     
PAX: DXB/MXP                       STD: 09:35               PREPARED BY: S294162
TTL PLN ULD: 05PMC/10AKE           ULD VERSION: 05PMC/26 PREPARED ON: 15-Oct-25 11:29:32            
SECTOR: DXBMXP                                                                  
SER.  AWB NO     ORG/DES  PCS   WGT     VOL  LVOL     SHC      MAN.DESC     PCODE PC THC  BS PI FLTIN ARRDT.TIME QNN/AQNN    WHS SI
001 176-20257333 DXBMXP     6    36.3   0.1   0.1 VAL         CONSOLIDATION   VAL P2 NORM SS N                                   N 
002 176-16505274 BOMJFK     3  1450.0   9.1   9.1 HEA-CRT-EMD CONSOLIDATED AS AXD P2      SS Y EK0509 12Oct0024 13:29/           N 
xx 01PMC xx                                                                                                                                           
003 176-13820240 DXBJFK     1   242.0   0.8   0.8 HEA-SVC-CRT CATERING GOOD   SVC P2 NORM SS N                                   N 
XX  01AKE  XX                                                                                                                                         
004 176-12968620 DACJFK    13   296.4   1.7   1.7             CONSOLIDATION   GCR P2      SS Y EK0585 11Oct0439 29:28/           N 
005 176-15033524 HKGMXP   105  2030.0  12.0  12.0 SPX-SBU     WOMEN S COTTON  GCR P2      SS N EK9789 11Oct1055 17:11/23:11      N 
XX 01PMC 01AKE XX                                                                                                                                     
006 176-10603445 BNEMXP     2    19.4   0.2   0.2 MAL         INTL. MAIL      MAW         SS N EK0435 11Oct0533 28:34/           N 
007 176-10603456 BNEMXP     3    29.9   0.3   0.5 MAL         INTL. MAIL      MAW P2      SS N EK0435 11Oct0533 28:34/           N 
008 176-10609454 MELMXP     1     3.0   0.1   0.1 MAL         INTL. MAIL      MAW P2      SS N EK0407 11Oct0514 28:53/           N 
009 176-10609465 MELMXP    10    90.9   0.8   1.0 MAL         INTL. MAIL      MAW P2      SS N EK0407 11Oct0514 28:53/           N 
010 176-10609476 MELMXP     5    49.1   0.4   0.7 MAL         INTL. MAIL      MAW P2      SS N EK0407 11Oct0514 28:53/           N 
011 176-07700206 PERMXP     1     0.4   0.1   0.1 MAL         INTL. MAIL      MAW P2      SS N EK0421 11Oct0504 29:03/           N 
012 176-07700210 PERMXP     1     1.8   0.1   0.1 MAL         INTL. MAIL      MAW P2      SS N EK0421 11Oct0504 29:03/           N 
013 176-07700221 PERMXP     3     5.2   0.1   0.1 MAL         INTL. MAIL      MAW P2      SS N EK0421 11Oct0504 29:03/           N 
014 176-07700232 PERMXP     1    12.0   0.1   0.1 MAL         INTL. MAIL      MAW P2      SS N EK0421 11Oct0504 29:03/           N 
015 176-07700243 PERMXP     1     0.2   0.1   0.1 MAL         INTL. MAIL      MAW P2      SS N EK0421 11Oct0504 29:03/           N 
016 176-16255713 IKAMXP     3    20.8   0.2   0.2 MAL         INTL. MAIL      MAW         SS N EK0972 11Oct1327 20:39/           N 
017 176-18596454 SYDMXP     5    42.3   0.4   0.7 MAL         INTL. MAIL      MAW P2 QWT  SS N EK0415 11Oct1306 21:00/           N 
018 176-18596465 SYDMXP     1    14.0   0.1   0.1 MAL         INTL. MAIL      MAW P2 QWT  SS N EK0415 11Oct1306 21:00/           N 
019 176-18596476 SYDMXP     1    14.2   0.1   0.1 MAL         INTL. MAIL      MAW P2 QWT  SS N EK0415 11Oct1306 21:00/           N 
XX 01AKE XX                                                                                                                                           
        TOTALS : 166     4,357.90     26.17     27.28                           
SECTOR: DXBJFK                                                                  
SER.  AWB NO     ORG/DES  PCS   WGT     VOL  LVOL     SHC      MAN.DESC     PCODE PC THC  BS PI FLTIN ARRDT.TIME QNN/AQNN    WHS SI
001 176-13926511 CMBJFK     1    14.0   0.1   0.1 CGO         CONSOLIDATION   GCR P1      SS N EK0651 11Oct1311 20:56/           N 
XX   BULK XX                                                                                                                                          
002 176-98261704 DXBJFK     5  2941.0   7.7   7.7 HEA-RMD-EAW CONSOLIDATION   GCR P2 NORM SS Y                                   N 
003 176-19890323 DWCJFK     2    16.5   0.1   0.1 SEA-ECC     CONSOLIDATION A SEA P2      SS N EK7524 09Oct2251 59:16/           N 
004 176-12620576 CMBJFK    10   146.5   0.6   0.6 ECC         CONSOLIDATION   GC R P2      SS N EK0651 10Oct1259 45:08/           N 
005 176-10878556 TUNJFK     4   487.0   3.2   3.2 HEA-ECC     CONSOLIDATION   GCR P2      SS N EK0748 10Oct2243 35:23/           N 
006 176-15838513 SINJFK     4   544.0   4.1   4.1             CONSOLIDATION   GCR P1      SS N EK0353 11Oct0359 30:08/           N 
007 176-16890241 HYDPHL     1   148.0   1.0   1.0 ECC-TSE     CONSOLIDATION   GCR P1      SS N EK0527 11Oct1212 21:55/           N 
008 176-19897102 KTIJFK    60 140.979   1.3   1.3             CONSOLIDATION   GCR P2      SS Y EK0349 11Oct0500 29:07/           N 
XX  02PMC 02AKE XX                                                                                                                                    
009 176-04616581 LHEJFK    45  1320.0   7.9   7.9 COU-XPS-FCE COURIER ON AWB  COU P2 QWT  SS N EK0623 12Oct0605 04:02/           N 
XX 01PMC XX                                                                                                                                           
MXP   13AKE    
JFK   02AKE   
        TOTALS : 132     5,757.98     25.90     25.90`

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

  // Load load plans from markdown on mount
  useEffect(() => {
    try {
      // Parse EK0544 and EK0205
      const plan0544 = parseLoadPlanFromText(LOAD_PLANS_CONTENT, "EK0544")
      const plan0205 = parseLoadPlanFromText(LOAD_PLANS_CONTENT, "EK0205")

      const plans: LoadPlanDetail[] = []
      if (plan0544) plans.push(plan0544)
      if (plan0205) plans.push(plan0205)

      setLoadPlans(plans)
    } catch (error) {
      console.error("Error loading load plans:", error)
    }
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
    setIsRefreshing(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsRefreshing(false)
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
      <MobileLoadPlanModal
        loadPlan={selectedLoadPlan}
        isOpen={true}
        onClose={() => {
          setCurrentView("list")
          setSelectedLoadPlan(null)
        }}
        isFullScreen={true}
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
        <div className="bg-white overflow-hidden">
          {/* Table Rows */}
          <div className="divide-y divide-gray-200">
            {loadPlans.length === 0 ? (
              <div className="px-1.5 py-3 text-center text-gray-500 text-sm">Loading load plans...</div>
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
