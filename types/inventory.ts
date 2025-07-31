export interface SerialNumber {
  id: string
  itemId: string
  serialNumber: string
  specs: string // Back to string but will support multiline
  status: "good" | "broken"
  dateAdded: string
}

export interface InventoryItem {
  id: string
  name: string
  information: string
  location: string
  dateAdded: string
  lastUpdated: string
  jumlah?: number;
}

export interface User {
  username: string
  role: "admin"
}

export interface LocationStats {
  location: string
  total: number
  totalQuantity: number
  good: number
  broken: number
}

export const LOCATIONS = ["Ruang Laboran", "Lab FKI", "Lab Jarkom", "Lab SI", "Lab SIC", "Lab RPL"] as const

export type Location = (typeof LOCATIONS)[number]
