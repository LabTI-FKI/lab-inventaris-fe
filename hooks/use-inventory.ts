"use client"

import { useState, useEffect } from "react"
import type { InventoryItem, SerialNumber, LocationStats } from "@/types/inventory"

export function useInventory() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [serialNumbers, setSerialNumbers] = useState<SerialNumber[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://lab-inventaris-backend.onrender.com'

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      try {
        const resItems = await fetch(`${API_URL}/items`)
        const itemsData = await resItems.json()
        setItems(itemsData)

        const resSerials = await fetch(`${API_URL}/serial-numbers`)
        const serialsData = await resSerials.json()
        setSerialNumbers(serialsData)
      } catch (err) {
        setItems([])
        setSerialNumbers([])
        console.error('Gagal mengambil data dari backend:', err)
      }
      setIsLoading(false)
    }
    fetchData()
  }, [])

  const addItem = async (item: Omit<InventoryItem, "id" | "dateAdded" | "lastUpdated">, quantity?: number) => {
    setIsLoading(true)
    try {
      const res = await fetch(`${API_URL}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      })
      const newItem = await res.json()
      setItems((prev) => [...prev, newItem])

      if (quantity && quantity > 0) {
        for (let i = 0; i < quantity; i++) {
          await addSerialNumber({
            itemId: newItem.id,
            serialNumber: "",
            specs: "",
            status: "Baik", // <- pastikan konsisten
            dateAdded: new Date().toISOString(),
          })
        }
      }

      return newItem.id
    } catch (err) {
      console.error('Gagal menambah barang:', err)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const updateItem = async (id: string, updates: Partial<InventoryItem>) => {
    setIsLoading(true)
    try {
      const res = await fetch(`${API_URL}/items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const updated = await res.json()
      setItems((prev) => prev.map((item) => item.id === id ? updated : item))
    } catch (err) {
      console.error('Gagal update barang:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const deleteItem = async (id: string) => {
    setIsLoading(true)
    try {
      await fetch(`${API_URL}/items/${id}`, { method: 'DELETE' })
      setItems((prev) => prev.filter((item) => item.id !== id))
    } catch (err) {
      console.error('Gagal hapus barang:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const addSerialNumber = async (serial: Omit<SerialNumber, "id">) => {
    setIsLoading(true)
    try {
      const res = await fetch(`${API_URL}/serial-numbers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serial),
      })
      const newSerial = await res.json()
      setSerialNumbers((prev) => [...prev, newSerial])
      return newSerial.id
    } catch (err) {
      console.error('Gagal menambah serial number:', err)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const updateSerialNumber = async (id: string, updates: Partial<SerialNumber>) => {
    setIsLoading(true)
    try {
      const res = await fetch(`${API_URL}/serial-numbers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const updated = await res.json()
      setSerialNumbers((prev) => prev.map((serial) => serial.id === id ? updated : serial))
    } catch (err) {
      console.error('Gagal update serial number:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const deleteSerialNumber = async (id: string) => {
    setIsLoading(true)
    try {
      await fetch(`${API_URL}/serial-numbers/${id}`, { method: 'DELETE' })
      setSerialNumbers((prev) => prev.filter((serial) => serial.id !== id))
    } catch (err) {
      console.error('Gagal hapus serial number:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const getItemsByLocation = (location: string) => {
    return items.filter((item) => item.location === location)
  }

  const getSerialNumbersFromServer = async (itemId: string) => {
    try {
      const res = await fetch(`${API_URL}/items/${itemId}/serial-numbers`)
      if (!res.ok) throw new Error('Failed to fetch serial numbers')
      return await res.json()
    } catch (err) {
      console.error('Error fetching serials from server:', err)
      return []
    }
  }

  const getItemStatus = (itemId: string) => {
    const itemSerials = serialNumbers.filter((serial) => serial.itemId === itemId)
    if (itemSerials.length === 0) return "Baik" as const
    return itemSerials.every((serial) => serial.status === "Rusak") ? "Rusak" as const : "Baik" as const
  }

  const getLocationStats = (): LocationStats[] => {
    const locations = ["Ruang Laboran", "Lab FKI", "Lab Jarkom", "Lab SI", "Lab SIC", "Lab RPL"]

    return locations.map((location) => {
      const locationItems = items.filter((item) => item.location === location)
      const itemIds = locationItems.map(item => item.id)
      const serialsInLocation = serialNumbers.filter(sn => itemIds.includes(sn.itemId))

      const totalQuantity = serialsInLocation.length
      const goodCount = serialsInLocation.filter(sn => sn.status === "Baik").length
      const brokenCount = serialsInLocation.filter(sn => sn.status === "Rusak").length

      return {
        location,
        total: locationItems.length,
        totalQuantity,
        good: goodCount,
        broken: brokenCount,
      }
    })
  }

  const getTotalStats = () => {
    let goodCount = 0
    let brokenCount = 0

    items.forEach((item) => {
      const status = getItemStatus(item.id)
      if (status === "Baik") goodCount++
      else brokenCount++
    })

    return {
      total: items.length,
      totalQuantity: serialNumbers.length,
      good: goodCount,
      broken: brokenCount,
      locations: new Set(items.map((item) => item.location)).size,
    }
  }

  return {
    items,
    serialNumbers,
    isLoading,
    addItem,
    updateItem,
    deleteItem,
    addSerialNumber,
    updateSerialNumber,
    deleteSerialNumber,
    getItemsByLocation,
    getItemStatus,
    getLocationStats,
    getTotalStats,
  }
}
