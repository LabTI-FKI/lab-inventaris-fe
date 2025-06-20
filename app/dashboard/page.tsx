"use client"

import React, { useEffect, useState } from "react"
import { useInventory } from "@/hooks/use-inventory"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Package, CheckCircle, AlertTriangle, MapPin, TrendingUp, Shield, User, Barcode, FlaskConical, Cpu, Network, Book, Joystick, Server } from "lucide-react"
import Link from "next/link"

export default function DashboardPage() {
  const { getLocationStats, getTotalStats, isLoading, serialNumbers } = useInventory()
  const { isAdmin, user } = useAuth()

  const totalStats = getTotalStats()
  const locationStats = getLocationStats()

  // Hitung jumlah barang yang memiliki minimal satu nomor seri
  const itemsWithSerial = new Set(serialNumbers.map(sn => sn.itemId))
  const itemsWithSerialCount = itemsWithSerial.size

  const locationIconMap: Record<string, React.ElementType> = {
    "Ruang Laboran": FlaskConical,
    "Lab FKI": Cpu,
    "Lab Jarkom": Network,
    "Lab SI": Book,
    "Lab SIC": Joystick,
    "Lab RPL": Server,
  }

  // Placeholder images
  const goodImages = [
    "https://source.unsplash.com/400x200/?lab,success",
    "https://source.unsplash.com/400x200/?equipment,clean",
    "https://source.unsplash.com/400x200/?science,ok"
  ]
  const brokenImages = [
    "https://source.unsplash.com/400x200/?lab,broken",
    "https://source.unsplash.com/400x200/?equipment,broken",
    "https://source.unsplash.com/400x200/?science,problem"
  ]
  const [goodIndex, setGoodIndex] = useState(0)
  const [brokenIndex, setBrokenIndex] = useState(0)
  useEffect(() => {
    const goodTimer = setInterval(() => setGoodIndex(i => (i + 1) % goodImages.length), 10000)
    const brokenTimer = setInterval(() => setBrokenIndex(i => (i + 1) % brokenImages.length), 10000)
    return () => {
      clearInterval(goodTimer)
      clearInterval(brokenTimer)
    }
  }, [])

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
  }, [])

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
          {user ? (
            <span
              className={`text-sm font-semibold px-3 py-1 rounded border transition-colors
                ${isAdmin
                  ? 'text-green-700 border-green-200 bg-transparent'
                  : 'text-orange-700 border-orange-200 bg-transparent'}
              `}
            >
              Login sebagai {isAdmin ? 'Admin' : 'Pengunjung'}
            </span>
          ) : (
            <span className="text-sm font-semibold px-3 py-1 rounded border border-gray-200 bg-transparent text-gray-500">Belum login</span>
          )}
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
            <img
              src={statusImages[statusIndex].src}
              alt={statusImages[statusIndex].label}
              className="rounded w-full h-32 md:h-40 lg:h-48 object-contain md:object-cover mb-2 transition-all"
            />
            <div className="text-xs text-center text-muted-foreground mb-2">{statusImages[statusIndex].label}</div>
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
                  {React.createElement(locationIconMap[stat.location] || MapPin, { className: "h-4 w-4 text-primary" })}
                  <div>
                    <p className="font-medium">{stat.location}</p>
                    <p className="text-sm text-muted-foreground">
                      {stat.total} barang • {stat.totalQuantity} jumlah total
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-600 border-green-200">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {stat.good} Baik
                  </Badge>
                  <Badge variant="outline" className="text-red-600 border-red-200">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {stat.broken} Rusak
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
