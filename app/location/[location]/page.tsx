"use client"

import type React from "react"
import Image from "next/image"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useInventory } from "@/hooks/use-inventory"
import type { InventoryItem, SerialNumber } from "@/types/inventory"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Edit, Trash2, Package, CheckCircle, AlertTriangle, Search, Shield, Barcode } from "lucide-react"

export default function LocationPage({ params }: { params: { location: string } }) {
  const decodedLocation: string = decodeURIComponent(params.location)
  const { isAdmin } = useAuth()
  const {
    getItemsByLocation,
    addItem,
    updateItem,
    deleteItem,
    addSerialNumber,
    updateSerialNumber,
    deleteSerialNumber,
    getSerialNumbersByItem,
    getItemQuantity,
    getItemStatusCounts,
    isLoading,
  } = useInventory()

  const [searchTerm, setSearchTerm] = useState("")
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false)
  const [isAddSerialDialogOpen, setIsAddSerialDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [editingSerial, setEditingSerial] = useState<SerialNumber | null>(null)

  const [itemFormData, setItemFormData] = useState({
    name: "",
    information: "",
    location: decodedLocation,
    quantity: 1,
  })

  const [serialFormData, setSerialFormData] = useState({
    serialNumber: "",
    specs: "",
    status: "good" as "good" | "broken",
  })

  const [expandedSpecs, setExpandedSpecs] = useState<{[id: string]: boolean}>({})

  const items = getItemsByLocation(decodedLocation)

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.information.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const resetItemForm = () => {
    setItemFormData({
      name: "",
      information: "",
      location: decodedLocation,
      quantity: 1,
    })
    setEditingItem(null)
  }

  const resetSerialForm = () => {
    setSerialFormData({
      serialNumber: "",
      specs: "",
      status: "good",
    })
    setEditingSerial(null)
  }

  const handleItemSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (editingItem) {
      updateItem(editingItem.id, {
        name: itemFormData.name,
        information: itemFormData.information,
        location: itemFormData.location,
      })
    } else {
      addItem(
        {
          name: itemFormData.name,
          information: itemFormData.information,
          location: itemFormData.location,
        },
        itemFormData.quantity,
      )
    }

    resetItemForm()
    setIsAddItemDialogOpen(false)
  }

  const handleSerialSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedItem) return

    if (editingSerial) {
      updateSerialNumber(editingSerial.id, serialFormData)
    } else {
      addSerialNumber({
        ...serialFormData,
        itemId: selectedItem.id,
        dateAdded: new Date().toISOString(),
      })
    }

    resetSerialForm()
    setIsAddSerialDialogOpen(false)
  }

  const handleEditItem = (item: InventoryItem) => {
    setItemFormData({
      name: item.name,
      information: item.information,
      location: item.location,
      quantity: getItemQuantity(item.id),
    })
    setEditingItem(item)
    setIsAddItemDialogOpen(true)
  }

  const handleEditSerial = (serial: SerialNumber) => {
    setSerialFormData({
      serialNumber: serial.serialNumber,
      specs: serial.specs,
      status: serial.status,
    })
    setEditingSerial(serial)
    setIsAddSerialDialogOpen(true)
  }

  const handleDeleteItem = (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus item ini dan semua serial numbersnya?")) {
      deleteItem(id)
      if (selectedItem?.id === id) {
        setSelectedItem(null)
      }
    }
  }

  const handleDeleteSerial = (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus serial number ini?")) {
      deleteSerialNumber(id)
    }
  }

  const handleSelectItem = (item: InventoryItem) => {
    setSelectedItem(item === selectedItem ? null : item)
  }

  const totalQuantity = items.reduce((sum, item) => sum + getItemQuantity(item.id), 0)

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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Memuat inventaris...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{decodedLocation}</h1>
          <p className="text-muted-foreground">
            {isAdmin ? "Kelola inventaris barang untuk ruangan ini" : "Lihat inventaris barang untuk ruangan ini"}
          </p>
        </div>
        {isAdmin && (
          <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetItemForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{editingItem ? "Edit Item" : "Add New Item"}</DialogTitle>
                <DialogDescription>
                  {editingItem ? "Update the item details below." : "Add a new item to the inventory."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleItemSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Nama Barang</Label>
                    <Input
                      id="name"
                      value={itemFormData.name}
                      onChange={(e) => setItemFormData({ ...itemFormData, name: e.target.value })}
                      placeholder="e.g., Microscope"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="information">Informasi</Label>
                    <Input
                      id="information"
                      value={itemFormData.information}
                      onChange={(e) => setItemFormData({ ...itemFormData, information: e.target.value })}
                      placeholder="e.g., Optical Equipment"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="quantity">Jumlah</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={itemFormData.quantity}
                      onChange={(e) =>
                        setItemFormData({ ...itemFormData, quantity: Number.parseInt(e.target.value) || 1 })
                      }
                      required
                      disabled={!!editingItem}
                    />
                    {editingItem ? (
                      <p className="text-xs text-muted-foreground">
                        Jumlah tidak dapat diubah saat mengedit. Tambahkan/hapus nomor serial instead.
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Nomor serial kosong akan dibuat secara otomatis
                      </p>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">{editingItem ? "Update Item" : "Add Item"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Barang</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{items.length}</div>
            <p className="text-xs text-muted-foreground">{totalQuantity} jumlah total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jumlah</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalQuantity}</div>
            <p className="text-xs text-muted-foreground">Semua barang dikombinasikan</p>
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
            <div className="text-xs text-center text-muted-foreground mb-2">{statusImages[statusIndex].label}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari berdasarkan nama atau informasi..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Items Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#e0e3f5]">
              <TableHead className="w-[300px]">Nama</TableHead>
              <TableHead>Informasi</TableHead>
              <TableHead className="w-[100px] text-center">Jumlah</TableHead>
              <TableHead className="w-[180px] text-center">Status</TableHead>
              <TableHead className="w-[150px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  {searchTerm ? "Tidak ada barang yang sesuai dengan kriteria pencarian Anda." : "Tidak ada barang yang ditemukan di ruangan ini."}
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => {
                const quantity = getItemQuantity(item.id)
                const statusCounts = getItemStatusCounts(item.id)

                return (
                  <TableRow
                    key={item.id}
                    className={selectedItem?.id === item.id ? "bg-muted/50" : ""}
                    onClick={() => handleSelectItem(item)}
                  >
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.information}</TableCell>
                    <TableCell className="text-center">{quantity}</TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-1">
                        <Badge variant="outline" className="text-green-600 border-green-200 text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {statusCounts.good} Baik
                        </Badge>
                        <Badge variant="outline" className="text-red-600 border-red-200 text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {statusCounts.broken} Rusak
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        {isAdmin && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditItem(item)
                              }}
                            >
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteItem(item.id)
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Hapus</span>
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Serial Numbers Section */}
      {selectedItem && (
        <div className="space-y-4 border-t pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Barcode className="h-5 w-5" />
                Nomor Seri untuk {selectedItem.name}
              </h2>
              <p className="text-muted-foreground">
                {getSerialNumbersByItem(selectedItem.id).length} nomor serial terdaftar
              </p>
            </div>
            {isAdmin && (
              <Dialog open={isAddSerialDialogOpen} onOpenChange={setIsAddSerialDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetSerialForm} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Nomor Seri
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>{editingSerial ? "Edit Serial Number" : "Add New Serial Number"}</DialogTitle>
                    <DialogDescription>
                      {editingSerial
                        ? "Update the serial number details below."
                        : "Add a new serial number for this item."}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSerialSubmit}>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="serialNumber">Nomor Seri</Label>
                        <Input
                          id="serialNumber"
                          value={serialFormData.serialNumber}
                          onChange={(e) => setSerialFormData({ ...serialFormData, serialNumber: e.target.value })}
                          placeholder="e.g., SN-12345"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="specs">Spesifikasi</Label>
                        <Textarea
                          id="specs"
                          value={serialFormData.specs}
                          onChange={(e) => setSerialFormData({ ...serialFormData, specs: e.target.value })}
                          placeholder="Enter specifications, press Enter for new line&#10;e.g.:&#10;40x magnification&#10;LED light&#10;Digital display"
                          rows={4}
                          className="resize-none"
                        />
                        <p className="text-xs text-muted-foreground">
                          Tekan Enter untuk membuat baris baru untuk spesifikasi
                        </p>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="status">Status</Label>
                        <Select
                          value={serialFormData.status}
                          onValueChange={(value: "good" | "broken") =>
                            setSerialFormData({ ...serialFormData, status: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="good">Baik</SelectItem>
                            <SelectItem value="broken">Rusak</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit">{editingSerial ? "Update Serial Number" : "Add Serial Number"}</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Serial Numbers Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#e0e3f5]">
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead className="w-[200px]">Nomor Seri</TableHead>
                  <TableHead>Spesifikasi</TableHead>
                  <TableHead className="w-[120px] text-center">Status</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getSerialNumbersByItem(selectedItem.id).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      Tidak ada nomor serial terdaftar untuk item ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  getSerialNumbersByItem(selectedItem.id).map((serial, index) => (
                    <TableRow key={serial.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{serial.serialNumber || "—"}</TableCell>
                      <TableCell>
                        {serial.specs ? (
                          <div>
                            <div
                              className={`whitespace-pre-line text-sm transition-all duration-200 ${expandedSpecs[serial.id] ? '' : 'max-h-[2.4em] overflow-hidden'}`}
                              style={{lineHeight: '1.2em'}}
                            >
                              {serial.specs}
                            </div>
                            {serial.specs.split('\n').length > 2 && (
                              <button
                                className="text-xs text-primary underline mt-1"
                                onClick={() => setExpandedSpecs(prev => ({...prev, [serial.id]: !prev[serial.id]}))}
                                type="button"
                              >
                                {expandedSpecs[serial.id] ? 'Sembunyikan' : 'Lihat semua'}
                              </button>
                            )}
                          </div>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center">
                          <Badge
                            variant={serial.status === "good" ? "default" : "destructive"}
                            className={
                              serial.status === "good" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                            }
                          >
                            {serial.status === "good" ? (
                              <CheckCircle className="h-3 w-3 mr-1" />
                            ) : (
                              <AlertTriangle className="h-3 w-3 mr-1" />
                            )}
                            {serial.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {isAdmin && (
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEditSerial(serial)}>
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600"
                              onClick={() => handleDeleteSerial(serial.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Hapus</span>
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {filteredItems.length === 0 && !searchTerm && isAdmin && (
        <div className="text-center py-10">
          <Button onClick={() => setIsAddItemDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah Barang Pertama
          </Button>
        </div>
      )}

      {!isAdmin && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="flex items-center gap-3 p-4">
            <Shield className="h-5 w-5 text-blue-600" />
            <div>
              <p className="font-medium text-blue-900">Mode Pengunjung</p>
              <p className="text-sm text-blue-700">
                Anda melihat dalam mode baca saja. Login sebagai admin untuk mengelola inventaris.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
