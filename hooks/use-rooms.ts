"use client"

import { useEffect, useState } from "react"
import type { Location } from "@/types/inventory"
import { LOCATIONS } from "@/types/inventory"

export interface Room {
  id: string
  name: string
  description?: string
  hidden?: boolean
  replaces_default?: string | null
  icon?: string
  created_at?: string
  updated_at?: string
}

const STORAGE_KEY = "lab-inventory-rooms"

function readFromStorage(): Room[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as Room[]
  } catch (err) {
    console.error("Failed to read rooms from localStorage", err)
    return []
  }
}

function writeToStorage(rooms: Room[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms))
    try {
      window.dispatchEvent(new Event("lab-inventory-rooms-changed"))
    } catch (e) {
      // ignore
    }
  } catch (err) {
    console.error("Failed to write rooms to localStorage", err)
  }
}

export function useRooms() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const syncRoomsFromBackend = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://lab-inventaris-backend.onrender.com"
      
      // Fetch all rooms (backend initializes defaults on startup)
      const response = await fetch(apiUrl + "/rooms", { 
        signal: AbortSignal.timeout(5000) // 5 second timeout
      })
      if (response.ok) {
        const backendRooms = await response.json()
        setRooms(backendRooms)
        writeToStorage(backendRooms)
      }
    } catch (err) {
      console.error("Failed to fetch rooms from backend:", err)
      // Fallback to localStorage
      const stored = readFromStorage()
      setRooms(stored)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    syncRoomsFromBackend()
    const handler = () => syncRoomsFromBackend()
    try {
      window.addEventListener("lab-inventory-rooms-changed", handler)
    } catch (e) {
      // ignore
    }
    return () => {
      try {
        window.removeEventListener("lab-inventory-rooms-changed", handler)
      } catch (e) {
        // ignore
      }
    }
  }, [])

  const getAll = (): (Room | { id: string; name: Location })[] => {
    // Just return the rooms from database - no need to merge with hardcoded defaults
    // The backend now handles initializing all default rooms
    return rooms
  }

  const create = async (room: Omit<Room, "id" | "created_at" | "updated_at">) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://lab-inventaris-backend.onrender.com"
      const response = await fetch(apiUrl + "/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(room),
      })
      if (!response.ok) throw new Error("Failed to create room on backend")
      const newRoom = await response.json()
      const next = [...rooms, newRoom]
      setRooms(next)
      writeToStorage(next)
      try {
        window.dispatchEvent(new Event("lab-inventory-rooms-changed"))
      } catch (e) {
        // ignore
      }
      return newRoom
    } catch (err) {
      console.error("Failed to create room:", err)
      throw err
    }
  }

  const update = async (id: string, updates: Partial<Room>) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://lab-inventaris-backend.onrender.com"
      const response = await fetch(apiUrl + "/rooms/" + id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      if (!response.ok) throw new Error("Failed to update room on backend")
      const updatedRoom = await response.json()
      const next = rooms.map(r => r.id === id ? updatedRoom : r)
      setRooms(next)
      writeToStorage(next)
      try {
        window.dispatchEvent(new Event("lab-inventory-rooms-changed"))
      } catch (e) {
        // ignore
      }
      return updatedRoom
    } catch (err) {
      console.error("Failed to update room:", err)
      throw err
    }
  }

  const remove = async (id: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://lab-inventaris-backend.onrender.com"
      const response = await fetch(apiUrl + "/rooms/" + id, {
        method: "DELETE"
      })
      if (!response.ok) throw new Error("Failed to delete room on backend")
      const next = rooms.filter(r => r.id !== id)
      setRooms(next)
      writeToStorage(next)
      try {
        window.dispatchEvent(new Event("lab-inventory-rooms-changed"))
      } catch (e) {
        // ignore
      }
      return true
    } catch (err) {
      console.error("Failed to delete room:", err)
      return false
    }
  }

  const findByName = (name: string) => rooms.find(r => r.name === name) || null

  return {
    rooms,
    getAll,
    create,
    update,
    remove,
    findByName,
    isLoading,
  }
}

export default useRooms