"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useAuth } from "@/contexts/auth-context";
import { useInventory } from "@/hooks/use-inventory";
import type { InventoryItem, SerialNumber } from "@/types/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Package, CheckCircle, AlertTriangle, Search, Shield, Barcode } from "lucide-react";

export default function LocationClient({ decodedLocation }: { decodedLocation: string }) {
  const { isAdmin } = useAuth();
  const {
    getItemsByLocation,
    addItem,
    updateItem,
    deleteItem,
    addSerialNumber,
    updateSerialNumber,
    deleteSerialNumber,
    isLoading,
  } = useInventory();

  const [searchTerm, setSearchTerm] = useState("");
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [isAddSerialDialogOpen, setIsAddSerialDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editingSerial, setEditingSerial] = useState<SerialNumber | null>(null);
  const [serialNumbers, setSerialNumbers] = useState<SerialNumber[]>([]);
  

  const [itemFormData, setItemFormData] = useState({
    name: "",
    information: "",
    location: decodedLocation,
    quantity: 1,
  });

  const [serialFormData, setSerialFormData] = useState({
    serialNumber: "",
    specs: "",
    status: "good" as "good" | "broken",
  });

  const [showAllSpecs, setShowAllSpecs] = useState<{ [id: string]: boolean }>({});
  const handleToggleSpecs = useCallback(
    (id: string) => {
      setShowAllSpecs((prev) => ({ ...prev, [id]: !prev[id] }));
    },
    []
  );

  const itemsByLocation = getItemsByLocation(decodedLocation);

  const filteredItems = itemsByLocation.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.information.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetItemForm = () => {
    setItemFormData({
      name: "",
      information: "",
      location: decodedLocation,
      quantity: 1,
    });
    setEditingItem(null);
  };

  const resetSerialForm = () => {
    setSerialFormData({
      serialNumber: "",
      specs: "",
      status: "good",
    });
    setEditingSerial(null);
  };

  const handleItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingItem) {
      updateItem(editingItem.id, {
        name: itemFormData.name,
        information: itemFormData.information,
        location: itemFormData.location,
      });
    } else {
      addItem(
        {
          name: itemFormData.name,
          information: itemFormData.information,
          location: itemFormData.location,
        },
        itemFormData.quantity
      );
    }

    resetItemForm();
    setIsAddItemDialogOpen(false);
  };

const handleSerialSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!selectedItem) return;

  if (editingSerial) {
    await updateSerialNumber(editingSerial.id, serialFormData);
  } else {
    await addSerialNumber({
      ...serialFormData,
      itemId: selectedItem.id,
      dateAdded: new Date().toISOString(),
    });
  }

  await fetchTotalQuantity(decodedLocation); 
  await fetchSerialNumbers(selectedItem.id); // ⬅ Refresh serials
  resetSerialForm();
  setIsAddSerialDialogOpen(false);
};


  const handleEditItem = (item: InventoryItem) => {
    setItemFormData({
      name: item.name,
      information: item.information,
      location: item.location,
      quantity: item.jumlah ?? 1,
    });
    setEditingItem(item);
    setIsAddItemDialogOpen(true);
  };

  const handleEditSerial = (serial: SerialNumber) => {
    setSerialFormData({
      serialNumber: serial.serialNumber,
      specs: serial.specs,
      status: serial.status,
    });
    setEditingSerial(serial);
    setIsAddSerialDialogOpen(true);
  };

  const handleDeleteItem = (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus item ini dan semua kode inventarisnya?")) {
      deleteItem(id);
      if (selectedItem?.id === id) {
        setSelectedItem(null);
      }
    }
  };

  const handleDeleteSerial = async (id: string) => {
    if (!selectedItem) return;
    if (confirm("Apakah Anda yakin ingin menghapus Kode Inventaris ini?")) {
      await deleteSerialNumber(id);
      await fetchSerialNumbers(selectedItem.id); // ⬅ Refresh serials
    }
    await fetchTotalQuantity(decodedLocation); 
  };


  const handleSelectItem = (item: InventoryItem) => {
    const isSame = selectedItem?.id === item.id;
    setSelectedItem(isSame ? null : item);
    if (!isSame) {
      fetchSerialNumbers(item.id);
    }
  };


const fetchSerialNumbers = async (itemId: string) => {
  try {
    const response = await fetch(`https://lab-inventaris-backend.onrender.com/items/${itemId}/serial-numbers`);
    const data = await response.json();
    console.log("Fetched serial numbers:", data);
    setSerialNumbers(data);
  } catch (error) {
    console.error("Failed to fetch serial numbers:", error);
  }
};




  // const totalQuantity = itemsByLocation.reduce((sum, item) => sum + (item.jumlah ?? 0), 0);
  const [totalQuantity, setTotalQuantity] = useState<number>(0);



  // Gambar placeholder lokal
  const statusImages = [
    { src: "/status/status-1.jpg", label: "status-1.jpg" },
    { src: "/status/status-2.jpg", label: "status-2.jpg" },
    { src: "/status/status-3.jpg", label: "status-3.jpg" },
  ];
  const [statusIndex, setStatusIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setStatusIndex((i) => (i + 1) % statusImages.length), 10000);
    return () => clearInterval(timer);
  }, [statusImages.length]);

  const fetchTotalQuantity = async (location: string) => {
  try {
    const res = await fetch(`https://lab-inventaris-backend.onrender.com/inventory-count/by-location?location=${encodeURIComponent(location)}`);
    const data = await res.json();
    setTotalQuantity(data.total || 0);
  } catch (err) {
    console.error("Error fetching total quantity:", err);
    setTotalQuantity(0);
  }
};
useEffect(() => {
  if (decodedLocation) {
    fetchTotalQuantity(decodedLocation);
  }
}, [decodedLocation]);



  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Memuat inventaris...</p>
        </div>
      </div>
    );
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
                      placeholder="e.g., Komputer, Proyektor, dsb"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="information">Informasi</Label>
                    <Input
                      id="information"
                      value={itemFormData.information}
                      onChange={(e) => setItemFormData({ ...itemFormData, information: e.target.value })}
                      placeholder="e.g., Merk, tipe, dsb"
                      required
                    />
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Barang</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{itemsByLocation.length}</div>
            <p className="text-xs text-muted-foreground">{totalQuantity} jumlah total</p>
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
                const quantity = item.jumlah ?? 0;
                const statusCounts = {
                  good: item.baik ?? 0,
                  broken: item.rusak ?? 0,
                };


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
                    <TableCell className="text-right">
                      {isAdmin && (
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" size="icon" onClick={() => handleEditItem(item)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" onClick={() => handleDeleteItem(item.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {selectedItem && (
        <div className="space-y-4 border-t pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Barcode className="h-5 w-5" />
                Kode Inventaris untuk {selectedItem.name}
              </h2>
              <p className="text-muted-foreground">
                {selectedItem.jumlah ?? 0} kode inventaris terdaftar
              </p>
            </div>
            {isAdmin && (
              <Dialog open={isAddSerialDialogOpen} onOpenChange={setIsAddSerialDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetSerialForm} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Kode Inventaris
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>{editingSerial ? "Edit Kode Inventaris" : "Tambah Kode Inventaris"}</DialogTitle>
                    <DialogDescription>
                      {editingSerial ? "Perbarui rincian kode inventaris" : "Tambah kode inventaris baru"}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSerialSubmit}>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="serialNumber">Kode Inventaris</Label>
                        <Input
                          id="serialNumber"
                          value={serialFormData.serialNumber}
                          onChange={(e) => setSerialFormData({ ...serialFormData, serialNumber: e.target.value })}
                          placeholder="e.g., *00000001*"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="specs">Spesifikasi</Label>
                        <Textarea
                          id="specs"
                          value={serialFormData.specs}
                          onChange={(e) => setSerialFormData({ ...serialFormData, specs: e.target.value })}
                          placeholder="e.g., detail spesifikasi"
                        />
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
                      <Button type="submit">{editingSerial ? "Perbarui Kode Inventaris" : "Tambah Kode Inventaris"}</Button>
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
                  <TableHead className="w-[200px]">Kode Inventaris</TableHead>
                  <TableHead>Spesifikasi</TableHead>
                  <TableHead className="w-[120px] text-center">Status</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {serialNumbers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      Tidak ada Kode Inventaris terdaftar untuk item ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  serialNumbers.map((serial, idx) => {
                    const specsLines = serial.specs ? serial.specs.split("\n") : [];
                    const isExpanded = showAllSpecs[serial.id] || false;
                    const displayedLines = isExpanded ? specsLines : specsLines.slice(0, 2);
                    return (
                      <TableRow key={serial.id}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>{serial.serialNumber}</TableCell>
                        <TableCell style={{ whiteSpace: 'pre-line' }}>
                          {displayedLines.map((line, i) => (
                            <span key={i}>
                              {line}
                              {i !== displayedLines.length - 1 && <br />}
                            </span>
                          ))}
                          {specsLines.length > 2 && (
                            <>
                              {!isExpanded && <span>... </span>}
                              <button
                                type="button"
                                onClick={() => handleToggleSpecs(serial.id)}
                                className="text-blue-600 hover:underline ml-1 text-xs"
                              >
                                {isExpanded ? "Sembunyikan" : "Selengkapnya"}
                              </button>
                            </>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={
                              serial.status === "good"
                                ? "text-green-600 border-green-200 text-xs"
                                : "text-red-600 border-red-200 text-xs"
                            }
                          >
                            {serial.status === "good" ? (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" /> Baik
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="h-3 w-3 mr-1" /> Rusak
                              </>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {isAdmin && (
                            <div className="flex gap-2 justify-end">
                              <Button variant="outline" size="icon" onClick={() => handleEditSerial(serial)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="icon" onClick={() => handleDeleteSerial(serial.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
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
  );
} 