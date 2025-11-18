"use client"

import { X, Home, Package, TrendingDown, TrendingUp, GitCompare, Download, Upload, ChevronDown, ChevronUp, FileText } from 'lucide-react'
import { useState } from "react"

interface MenuDrawerProps {
  isOpen: boolean
  onClose: () => void
  onNavigate: (screen: "landing" | "import" | "export" | "loadPlan" | "newULD" | "dropStatus" | "inductionStatus" | "reconciliation") => void
}

export default function MenuDrawer({ isOpen, onClose, onNavigate }: MenuDrawerProps) {
  const [othersExpanded, setOthersExpanded] = useState(false)

  if (!isOpen) return null

  const otherItems = [
    { id: "newULD" as const, label: "New ULD's", icon: Package },
    { id: "dropStatus" as const, label: "Drop Status", icon: TrendingDown },
    { id: "inductionStatus" as const, label: "Induction Status", icon: TrendingUp },
    { id: "reconciliation" as const, label: "Reconciliation", icon: GitCompare },
  ]

  const handleNavigate = (screen: "landing" | "import" | "export" | "loadPlan" | "newULD" | "dropStatus" | "inductionStatus" | "reconciliation") => {
    onNavigate(screen)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="h-5 w-5 text-gray-700" />
          </button>
        </div>

        <div className="py-2">
          {/* Home */}
          <button
            onClick={() => handleNavigate("landing")}
            className="w-full px-4 py-3 text-left text-gray-900 hover:bg-gray-50 transition-colors flex items-center gap-3"
          >
            <Home className="h-5 w-5 text-gray-600" />
            <span>Home</span>
          </button>

          {/* Import */}
          <button
            onClick={() => handleNavigate("import")}
            className="w-full px-4 py-3 text-left text-gray-900 hover:bg-gray-50 transition-colors flex items-center gap-3"
          >
            <Download className="h-5 w-5 text-gray-600" />
            <span>Import</span>
          </button>

          {/* Export */}
          <button
            onClick={() => handleNavigate("export")}
            className="w-full px-4 py-3 text-left text-gray-900 hover:bg-gray-50 transition-colors flex items-center gap-3"
          >
            <Upload className="h-5 w-5 text-gray-600" />
            <span>Export</span>
          </button>

          {/* Load Plan */}
          <button
            onClick={() => handleNavigate("loadPlan")}
            className="w-full px-4 py-3 text-left text-gray-900 hover:bg-gray-50 transition-colors flex items-center gap-3"
          >
            <FileText className="h-5 w-5 text-gray-600" />
            <span>Load Plan</span>
          </button>

          {/* Others - Expandable */}
          <div>
            <button
              onClick={() => setOthersExpanded(!othersExpanded)}
              className="w-full px-4 py-3 text-left text-gray-900 hover:bg-gray-50 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-gray-600" />
                <span>Others</span>
              </div>
              {othersExpanded ? (
                <ChevronUp className="h-5 w-5 text-gray-600" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-600" />
              )}
            </button>

            {othersExpanded && (
              <div className="bg-gray-50">
                {otherItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigate(item.id)}
                      className="w-full px-4 py-2.5 pl-12 text-left text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-3 text-sm"
                    >
                      <Icon className="h-4 w-4 text-gray-500" />
                      <span>{item.label}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
