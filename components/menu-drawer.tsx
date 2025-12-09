"use client"

import { X, FileText, Shield } from 'lucide-react'

interface MenuDrawerProps {
  isOpen: boolean
  onClose: () => void
  onNavigate: (screen: "landing" | "import" | "export" | "loadPlan" | "newULD" | "dropStatus" | "inductionStatus" | "reconciliation" | "screening") => void
}

export default function MenuDrawer({ isOpen, onClose, onNavigate }: MenuDrawerProps) {
  if (!isOpen) return null

  const handleNavigate = (screen: "landing" | "import" | "export" | "loadPlan" | "newULD" | "dropStatus" | "inductionStatus" | "reconciliation" | "screening") => {
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
          {/* Load Plans */}
          <button
            onClick={() => handleNavigate("export")}
            className="w-full px-4 py-3 text-left text-gray-900 hover:bg-gray-50 transition-colors flex items-center gap-3"
          >
            <FileText className="h-5 w-5 text-gray-600" />
            <span>Load Plans</span>
          </button>

          {/* Screening */}
          <button
            onClick={() => handleNavigate("screening")}
            className="w-full px-4 py-3 text-left text-gray-900 hover:bg-gray-50 transition-colors flex items-center gap-3"
          >
            <Shield className="h-5 w-5 text-gray-600" />
            <span>Screening</span>
          </button>
        </div>
      </div>
    </div>
  )
}
