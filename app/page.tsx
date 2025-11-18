"use client"

import { useState, useEffect, useRef } from "react"
import LoginScreen from "@/components/login-screen"
import LandingScreen from "@/components/landing-screen"
import HomeScreen from "@/components/home-screen"
import ExportScreen from "@/components/export-screen"
import ImportDetailScreen from "@/components/import-detail-screen"
import ImportHistoryScreen from "@/components/import-history-screen"
import ExportDetailScreen from "@/components/export-detail-screen"
import ExportHistoryScreen from "@/components/export-history-screen"
import NewULDScreen from "@/components/new-uld-screen"
import DropStatusScreen from "@/components/drop-status-screen"
import InductionStatusScreen from "@/components/induction-status-screen"
import ReconciliationScreen from "@/components/reconciliation-screen"
import LoadPlanScreen from "@/components/load-plan-screen"
import BottomNav from "@/components/bottom-nav"
import { FlightProvider, useFlights } from "@/lib/flight-context"
import { ExportFlightProvider, useExportFlights } from "@/lib/export-flight-context"
import type { Flight, ULD } from "@/lib/flight-data"

function AppContent() {
  const [currentScreen, setCurrentScreen] = useState<
    "login" | "landing" | "import" | "export" | "detail" | "history" | "loadPlan" | "newULD" | "dropStatus" | "inductionStatus" | "reconciliation"
  >("login")
  const [parentScreen, setParentScreen] = useState<"import" | "export">("import")
  const [selectedFlightNumber, setSelectedFlightNumber] = useState<string | null>(null)
  const [selectedULDIndex, setSelectedULDIndex] = useState<number>(0)
  const [isMobile, setIsMobile] = useState(true)
  const [isNavVisible, setIsNavVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [hasVisitedDetail, setHasVisitedDetail] = useState(false)
  const [hasVisitedHistory, setHasVisitedHistory] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const { flights: importFlights, updateULDStatus: updateImportStatus, addMultipleStatusUpdates: addImportMultiple, setUsername } = useFlights()
  const { flights: exportFlights, updateULDStatus: updateExportStatus, addMultipleStatusUpdates: addExportMultiple } = useExportFlights()

  const selectedFlight = selectedFlightNumber
    ? (parentScreen === "export"
        ? exportFlights.find((f) => f.flightNumber === selectedFlightNumber)
        : importFlights.find((f) => f.flightNumber === selectedFlightNumber))
    : null
  const selectedULD = selectedFlight ? selectedFlight.ulds[selectedULDIndex] : null

  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkDevice()
    window.addEventListener("resize", checkDevice)
    return () => window.removeEventListener("resize", checkDevice)
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight

      const isAtBottom = currentScrollY + windowHeight >= documentHeight - 100

      if ((currentScreen === "import" || currentScreen === "export") && isAtBottom) {
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
  }, [lastScrollY, currentScreen])

  const handleFlightSelect = (flight: Flight) => {
    setSelectedFlightNumber(flight.flightNumber)
    setCurrentScreen("detail")
    setHasVisitedDetail(true)
  }

  const handleULDSelect = (uld: ULD) => {
    if (selectedFlight) {
      const uldIndex = selectedFlight.ulds.findIndex((u) => u.uldNumber === uld.uldNumber)
      setSelectedULDIndex(uldIndex)
    }
    setCurrentScreen("history")
    setHasVisitedHistory(true)
  }

  const handleStatusUpdate = (newStatus: number) => {
    if (!selectedFlightNumber) return
    if (parentScreen === "export") {
      updateExportStatus(selectedFlightNumber, selectedULDIndex, newStatus as 1 | 2 | 3 | 4 | 5)
    } else {
      updateImportStatus(selectedFlightNumber, selectedULDIndex, newStatus as 1 | 2 | 3 | 4 | 5)
    }
  }

  const handleMultipleStatusUpdates = (statuses: Array<1 | 2 | 3 | 4 | 5>) => {
    if (!selectedFlightNumber) return
    if (parentScreen === "export") {
      addExportMultiple(selectedFlightNumber, selectedULDIndex, statuses)
    } else {
      addImportMultiple(selectedFlightNumber, selectedULDIndex, statuses)
    }
  }

  const handleLogin = (username: string) => {
    if (!username || username.trim() === "") {
      const randomName = getRandomName()
      setUsername(randomName)
    } else {
      setUsername(username)
    }
    setCurrentScreen("landing")
  }

  const handleNavigate = (screen: "landing" | "import" | "export" | "loadPlan" | "newULD" | "dropStatus" | "inductionStatus" | "reconciliation") => {
    if (screen === "landing") {
      setCurrentScreen("landing")
    } else if (screen === "import") {
      setParentScreen("import")
      setCurrentScreen("import")
    } else if (screen === "export") {
      setParentScreen("export")
      setCurrentScreen("export")
    } else {
      setCurrentScreen(screen)
    }
  }

  const handleBottomNavNavigate = (screen: "home" | "detail" | "history") => {
    if (screen === "home") {
      setCurrentScreen(parentScreen)
    } else if (screen === "detail" && selectedFlightNumber) {
      setCurrentScreen("detail")
    } else if (screen === "history" && selectedULD) {
      setCurrentScreen("history")
    }
  }

  const getBottomNavScreen = (): "home" | "detail" | "history" => {
    if (currentScreen === "import" || currentScreen === "export") return "home"
    if (currentScreen === "detail") return "detail"
    if (currentScreen === "history") return "history"
    return "home"
  }

  const showBottomNav =
    currentScreen !== "login" &&
    currentScreen !== "landing" &&
    currentScreen !== "loadPlan" &&
    currentScreen !== "newULD" &&
    currentScreen !== "dropStatus" &&
    currentScreen !== "inductionStatus" &&
    currentScreen !== "reconciliation"
  const isBottomNavVisible = showBottomNav && isNavVisible

  return (
    <div className="min-h-screen bg-white">
      {currentScreen === "login" ? (
        <LoginScreen onLogin={handleLogin} />
      ) : currentScreen === "landing" ? (
        <LandingScreen
          onImport={() => {
            setParentScreen("import")
            setCurrentScreen("import")
          }}
          onExport={() => {
            setParentScreen("export")
            setCurrentScreen("export")
          }}
        />
      ) : currentScreen === "import" ? (
        <HomeScreen
          onLogout={() => setCurrentScreen("login")}
          onFlightSelect={handleFlightSelect}
          onNavigate={handleNavigate}
        />
      ) : currentScreen === "export" ? (
        <ExportScreen
          onLogout={() => setCurrentScreen("login")}
          onFlightSelect={handleFlightSelect}
          onNavigate={handleNavigate}
        />
      ) : currentScreen === "detail" ? (
        selectedFlight && (
          parentScreen === "import" ? (
            <ImportDetailScreen
              flight={selectedFlight}
              onBack={() => setCurrentScreen(parentScreen)}
              onULDSelect={handleULDSelect}
            />
          ) : (
            <ExportDetailScreen
              flight={selectedFlight}
              onBack={() => setCurrentScreen(parentScreen)}
              onULDSelect={handleULDSelect}
            />
          )
        )
      ) : currentScreen === "loadPlan" ? (
        <LoadPlanScreen onBack={() => setCurrentScreen(parentScreen)} />
      ) : currentScreen === "newULD" ? (
        <NewULDScreen onBack={() => setCurrentScreen(parentScreen)} />
      ) : currentScreen === "dropStatus" ? (
        <DropStatusScreen onBack={() => setCurrentScreen(parentScreen)} />
      ) : currentScreen === "inductionStatus" ? (
        <InductionStatusScreen onBack={() => setCurrentScreen(parentScreen)} />
      ) : currentScreen === "reconciliation" ? (
        <ReconciliationScreen onBack={() => setCurrentScreen(parentScreen)} />
      ) : currentScreen === "history" ? (
        parentScreen === "import" ? (
          selectedULD && (
            <ImportHistoryScreen
              uld={selectedULD}
              onBack={() => setCurrentScreen("detail")}
              onStatusUpdate={handleStatusUpdate}
              onMultipleStatusUpdates={handleMultipleStatusUpdates}
            />
          )
        ) : (
          selectedFlight && <ExportHistoryScreen flight={selectedFlight} onBack={() => setCurrentScreen("detail")} />
        )
      ) : null}

      {showBottomNav && (
        <BottomNav
          currentScreen={getBottomNavScreen()}
          onNavigate={handleBottomNavNavigate}
          isVisible={isBottomNavVisible}
          hasVisitedDetail={hasVisitedDetail}
          hasVisitedHistory={hasVisitedHistory}
        />
      )}
    </div>
  )
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

export default function Page() {
  return (
    <ExportFlightProvider>
      <FlightProvider>
        <AppContent />
      </FlightProvider>
    </ExportFlightProvider>
  )
}
