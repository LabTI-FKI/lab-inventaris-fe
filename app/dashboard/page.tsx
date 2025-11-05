"use client"

import React, { useEffect, useState } from "react"
import Image from "next/image"
import { useInventory } from "@/hooks/use-inventory"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, MapPin, TrendingUp, Barcode, Building, Cpu, Network, Computer, Joystick, Braces, FileSpreadsheet, Users, Wrench, Coffee } from "lucide-react"
import { Button } from "@/components/ui/button"
import useRooms, { Room } from "@/hooks/use-rooms"

const ICON_COMPONENTS: Record<string, React.ElementType> = { Building, Cpu, Network, Computer, Joystick, Braces, Users, Wrench, Coffee }

export default function DashboardPage() {
  const { getLocationStats, getTotalStats, isLoading, serialNumbers, exportToExcel } = useInventory()
  const { isAdmin, user } = useAuth()
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportToExcel()
    } catch (error) {
      console.error('Failed to export:', error)
    } finally {
      setExporting(false)
    }
  }

  const totalStats = getTotalStats()
  const locationStats = getLocationStats()

  // Hitung jumlah barang yang memiliki minimal satu nomor seri
  const itemsWithSerialCount = serialNumbers.length

  const locationIconMap: Record<string, React.ElementType> = {
    "Ruang Laboran": Building,
    "Lab FKI": Cpu,
    "Lab Jarkom": Network,
    "Lab SI": Computer,
    "Lab SIC": Joystick,
    "Lab RPL": Braces,
  }

  const { getAll: getAllRooms } = useRooms()
  const mergedRooms = getAllRooms()

  const isSavedRoom = (obj: unknown): obj is Room => {
    return typeof obj === "object" && obj !== null && "id" in obj && "name" in obj
  }

  const getIconForLocation = (location: string) => {
    const saved = (mergedRooms.filter(isSavedRoom) as Room[]).find(r => r.name === location)
    if (saved && saved.icon && ICON_COMPONENTS[saved.icon]) {
      return ICON_COMPONENTS[saved.icon]
    }
    return locationIconMap[location] || MapPin
  }

  // Gambar placeholder lokal
  const statusImages = [
    { src: "/status/status-1.jpg", label: "status-1.jpg" },
    { src: "/status/status-2.jpg", label: "status-2.jpg" },
    { src: "/status/status-3.jpg", label: "status-3.jpg" },
  ]
  const [statusIndex, setStatusIndex] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setStatusIndex(i => (i + 1) % statusImages.length), 10000)
    return () => clearInterval(timer)
  }, [statusImages.length])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Memuat dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 px-4 py-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-3xl font-bold mb-1">Dashboard</h1>
          <p className="text-muted-foreground mb-4">Ringkasan inventaris laboratorium di semua lokasi</p>
        </div>
        <div>
          <div className="flex gap-3 items-center">
            <Button 
              onClick={handleExport} 
              disabled={exporting || isLoading}
              className="flex items-center gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              {exporting ? 'Mengekspor...' : 'Export ke Excel'}
            </Button>
            {user ? (
              <span
                className={`text-sm font-semibold px-3 py-1 rounded border transition-colors
                  ${isAdmin
                    ? 'text-green-700 border-green-200 bg-transparent'
                    : 'text-orange-700 border-orange-200 bg-transparent'}
                `}
              >
                {isAdmin ? 'Admin' : 'Pengunjung'}
              </span>
            ) : (
              <span className="text-sm font-semibold px-3 py-1 rounded border border-gray-200 bg-transparent text-gray-500">Pengunjung</span>
            )}
          </div>
        </div>
      </div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Barang</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold">{totalStats.total}</div>
            <p className="text-xs text-muted-foreground">{totalStats.totalQuantity} jumlah total</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nomor Seri</CardTitle>
            <Barcode className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-primary">{itemsWithSerialCount}</div>
            <p className="text-xs text-muted-foreground">Barang memiliki nomor seri</p>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Galeri Foto</CardTitle>
          </CardHeader>
          <CardContent>
            <Image
              src={statusImages[statusIndex].src}
              alt={statusImages[statusIndex].label}
              width={400}
              height={200}
              className="rounded w-full h-32 md:h-40 lg:h-48 object-contain md:object-cover mb-2 transition-all"
            />            
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Statistik Ruangan
          </CardTitle>
          <CardDescription>Rincian inventaris berdasarkan ruangan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {locationStats.map((stat) => (
              <div key={stat.location} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {React.createElement(getIconForLocation(stat.location), { className: "h-4 w-4 text-primary" })}
                  <div>
                    <p className="font-medium">{stat.location}</p>
                    <p className="text-sm text-muted-foreground">
                      {stat.total} barang •
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
