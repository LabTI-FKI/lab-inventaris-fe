"use client"

import { useState, useEffect } from "react"
import type { InventoryItem, SerialNumber, Location, LocationStats } from "@/types/inventory"

export function useInventory() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [serialNumbers, setSerialNumbers] = useState<SerialNumber[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  // Ambil data items dari backend saat mount
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const resItems = await fetch(`${API_URL}/items`);
        const itemsData = await resItems.json();
        setItems(itemsData);

        const resSerials = await fetch(`${API_URL}/serial-numbers`);
        const serialsData = await resSerials.json();
        setSerialNumbers(serialsData);
      } catch (err) {
        setItems([]);
        setSerialNumbers([]);
        console.error('Gagal mengambil data dari backend:', err);
      }
      setIsLoading(false);
    }
    fetchData();
  }, []);

  // Tambah barang ke backend, jika ada quantity, tambahkan serial numbers juga
  const addItem = async (item: Omit<InventoryItem, "id" | "dateAdded" | "lastUpdated">, quantity?: number) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      const newItem = await res.json();
      setItems((prev) => [...prev, newItem]);

      // Tambahkan serial numbers jika quantity > 0
      if (quantity && quantity > 0) {
        for (let i = 0; i < quantity; i++) {
          await addSerialNumber({
            itemId: newItem.id,
            serialNumber: "",
            specs: "",
            status: "good",
            dateAdded: new Date().toISOString(),
          });
        }
      }
      return newItem.id;
    } catch (err) {
      console.error('Gagal menambah barang:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Update barang (butuh endpoint backend PUT /items/:id)
  const updateItem = async (id: string, updates: Partial<InventoryItem>) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const updated = await res.json();
      setItems((prev) => prev.map((item) => item.id === id ? updated : item));
    } catch (err) {
      console.error('Gagal update barang:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Hapus barang (butuh endpoint backend DELETE /items/:id)
  const deleteItem = async (id: string) => {
    setIsLoading(true);
    try {
      await fetch(`${API_URL}/items/${id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error('Gagal hapus barang:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Tambah serial number ke backend
  const addSerialNumber = async (serial: Omit<SerialNumber, "id">) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/serial-numbers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serial),
      });
      const newSerial = await res.json();
      setSerialNumbers((prev) => [...prev, newSerial]);
      return newSerial.id;
    } catch (err) {
      console.error('Gagal menambah serial number:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Update serial number di backend
  const updateSerialNumber = async (id: string, updates: Partial<SerialNumber>) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/serial-numbers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const updated = await res.json();
      setSerialNumbers((prev) => prev.map((serial) => serial.id === id ? updated : serial));
    } catch (err) {
      console.error('Gagal update serial number:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Hapus serial number di backend
  const deleteSerialNumber = async (id: string) => {
    setIsLoading(true);
    try {
      await fetch(`${API_URL}/serial-numbers/${id}`, { method: 'DELETE' });
      setSerialNumbers((prev) => prev.filter((serial) => serial.id !== id));
    } catch (err) {
      console.error('Gagal hapus serial number:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getItemsByLocation = (location: string) => {
    return items.filter((item) => item.location === location)
  }

  const getSerialNumbersByItem = (itemId: string) => {
    return serialNumbers.filter((serial) => serial.itemId === itemId)
  }

  const getItemQuantity = (itemId: string) => {
    return serialNumbers.filter((serial) => serial.itemId === itemId).length
  }

  const getItemStatusCounts = (itemId: string) => {
    const itemSerials = serialNumbers.filter((serial) => serial.itemId === itemId)
    const good = itemSerials.filter((serial) => serial.status === "good").length
    const broken = itemSerials.filter((serial) => serial.status === "broken").length

    return { good, broken }
  }

  const getItemStatus = (itemId: string) => {
    const itemSerials = serialNumbers.filter((serial) => serial.itemId === itemId)
    if (itemSerials.length === 0) return "good" as const
    // If all serials are broken, item is broken. If at least one is good, item is good.
    return itemSerials.every((serial) => serial.status === "broken") ? ("broken" as const) : ("good" as const)
  }

  const getLocationStats = (): LocationStats[] => {
    const locations = ["Ruang Laboran", "Lab FKI", "Lab Jarkom", "Lab SI", "Lab SIC", "Lab RPL"]

    return locations.map((location) => {
      const locationItems = items.filter((item) => item.location === location)
      const itemIds = locationItems.map(item => item.id)
      const serialsInLocation = serialNumbers.filter(sn => itemIds.includes(sn.itemId))

      const totalQuantity = serialsInLocation.length
      const goodCount = serialsInLocation.filter(sn => sn.status === "good").length
      const brokenCount = serialsInLocation.filter(sn => sn.status === "broken").length

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
      if (status === "good") goodCount++
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
    getSerialNumbersByItem,
    getItemQuantity,
    getItemStatusCounts,
    getItemStatus,
    getLocationStats,
    getTotalStats,
  }
}
