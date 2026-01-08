"use client"

import React, { useEffect, useState, useRef, useCallback, useMemo } from "react"
import Image from "next/image"
import { useInventory } from "@/hooks/use-inventory"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, MapPin, TrendingUp, Barcode, Building, Cpu, Network, Computer, Joystick, Braces, FileSpreadsheet, Users, Wrench, Coffee } from "lucide-react"
import { Button } from "@/components/ui/button"
import useRooms, { Room } from "@/hooks/use-rooms"

  const ICON_COMPONENTS: Record<string, React.ElementType> = { Building, Cpu, Network, Computer, Joystick, Braces, Users, Wrench, Coffee }

  type ImageEntry = { src: string; label: string }

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

  // Gambar placeholder lokal (memoized so the reference is stable for hooks)
  const statusImages = useMemo<{ src: string; label: string }[]>(
    () => [
      { src: "/status/status-1.jpg", label: "status-1.jpg" },
      { src: "/status/status-2.jpg", label: "status-2.jpg" },
      { src: "/status/status-3.jpg", label: "status-3.jpg" },
      { src: "/status/status-4.jpg", label: "status-4.jpg" },
      { src: "/status/status-5.jpg", label: "status-5.jpg" },
      { src: "/status/status-6.jpg", label: "status-6.jpg" },
      { src: "/status/status-7.jpg", label: "status-7.jpg" },
      { src: "/status/status-8.jpg", label: "status-8.jpg" },
      { src: "/status/status-9.jpg", label: "status-9.jpg" },
      { src: "/status/status-10.jpg", label: "status-10.jpg" },
    ],
    []
  );
  const [statusIndex, setStatusIndex] = useState(0)
  const [prevStatusIndex, setPrevStatusIndex] = useState<number | null>(null);
  // Carousel timer and touch support
  const carouselTimerRef = useRef<number | null>(null);
  const statusIndexRef = useRef<number>(0);
  const transitionTimeoutRef = useRef<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);
  
  const statusSrcKey = useMemo(() => statusImages.map((s: ImageEntry) => s.src).join("|"), [statusImages]);
  const clearCarouselTimer = useCallback(() => {
    if (carouselTimerRef.current !== null) {
      clearInterval(carouselTimerRef.current);
      carouselTimerRef.current = null;
    }
  }, []);

  const changeImage = useCallback((nextIndex: number) => {
    // Prevent no-op
    if (nextIndex === statusIndexRef.current) return;

    // clear any pending transition cleanup
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }

    setPrevStatusIndex(statusIndexRef.current);
    setIsTransitioning(true);
    setStatusIndex(nextIndex);
    statusIndexRef.current = nextIndex;

    // After transition duration, remove prev image
    transitionTimeoutRef.current = window.setTimeout(() => {
      setPrevStatusIndex(null);
      setIsTransitioning(false);
      transitionTimeoutRef.current = null;
    }, 700) as unknown as number;
  }, []);

  const startCarouselTimer = useCallback((delay = 5000) => {
    clearCarouselTimer();
    carouselTimerRef.current = window.setInterval(() => {
      const next = (statusIndexRef.current + 1) % statusImages.length;
      // use changeImage helper to handle prev/current and transition
      changeImage(next);
    }, delay) as unknown as number;
  }, [clearCarouselTimer, changeImage, statusImages.length]);
  
  useEffect(() => {
    // Start 5s auto-advance
    startCarouselTimer(5000);
    return () => clearCarouselTimer();
  }, [startCarouselTimer, clearCarouselTimer]);

  // Ensure timeouts/intervals are cleared on unmount
  useEffect(() => {
    return () => {
      clearCarouselTimer();
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
        transitionTimeoutRef.current = null;
      }
    };
  }, [clearCarouselTimer]);
  
    const goNext = () => {
      const next = (statusIndexRef.current + 1) % statusImages.length;
      changeImage(next);
      startCarouselTimer();
    };
  
    const goPrev = () => {
      const prev = (statusIndexRef.current - 1 + statusImages.length) % statusImages.length;
      changeImage(prev);
      startCarouselTimer();
    };
  
  // changeImage is defined above using useCallback
  
    // Preload images to reduce lag when switching
    useEffect(() => {
      (async () => {
          try {
            const srcs = statusSrcKey ? statusSrcKey.split("|") : [];
            await Promise.all(
              srcs.map((src: string) =>
                new Promise<void>((resolve) => {
                  const i = new window.Image();
                  i.src = src;
                  i.onload = () => resolve();
                  i.onerror = () => resolve();
                })
              )
            );
          } catch {
            // ignore preload errors
          }
        })();
      }, [statusSrcKey]);
  
    const handleTouchStart = (e: React.TouchEvent) => {
      touchEndXRef.current = null;
      touchStartXRef.current = e.touches[0].clientX;
    };
  
    const handleTouchMove = (e: React.TouchEvent) => {
      touchEndXRef.current = e.touches[0].clientX;
    };
  
    const handleTouchEnd = () => {
      const start = touchStartXRef.current;
      const end = touchEndXRef.current;
      if (start == null || end == null) return;
      const dx = end - start;
      const threshold = 50; // px required to count as swipe
      if (Math.abs(dx) > threshold) {
        if (dx > 0) {
          goPrev();
        } else {
          goNext();
        }
      }
      touchStartXRef.current = null;
      touchEndXRef.current = null;
    };

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
            <div
              className="relative rounded overflow-hidden w-full h-32 md:h-40 lg:h-48 mb-2 touch-pan-y"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* Previous image for smooth crossfade (if exists) */}
              {prevStatusIndex !== null && (
                <div className="absolute inset-0">
                  <Image
                    key={`prev-${prevStatusIndex}`}
                    src={statusImages[prevStatusIndex].src}
                    alt={statusImages[prevStatusIndex].label}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                    className={`object-cover w-full h-full transition-opacity duration-700 ease-in-out ${isTransitioning ? 'opacity-100' : 'opacity-0'}`}
                  />
                </div>
              )}

              {/* Current image */}
              <div className="absolute inset-0">
                <Image
                  key={`cur-${statusIndex}`}
                  src={statusImages[statusIndex].src}
                  alt={statusImages[statusIndex].label}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                  className={`object-cover w-full h-full transition-opacity duration-700 ease-in-out ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
                />
              </div>

              {/* Controls (optional) */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goPrev(); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 text-white rounded-full p-1"
                aria-label="Previous"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goNext(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 text-white rounded-full p-1"
                aria-label="Next"
              >
                ›
              </button>
            </div>
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
