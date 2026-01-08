"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Image from "next/image";
import { useAuth } from "@/contexts/auth-context";
import { useInventory } from "@/hooks/use-inventory";
import type { InventoryItem, SerialNumber } from "@/types/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Plus, Edit2, Trash2, Package, CheckCircle, AlertTriangle, Search, Shield, Barcode } from "lucide-react";
import { BarcodeScanner } from "@/components/barcode-scanner";

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
    refreshItems,
    isLoading,
  } = useInventory();

  const [searchTerm, setSearchTerm] = useState("");
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isEditSerialDialogOpen, setIsEditSerialDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editingSerial, setEditingSerial] = useState<SerialNumber | null>(null);
  const [serialNumbers, setSerialNumbers] = useState<SerialNumber[]>([]);

  const [serialFormData, setSerialFormData] = useState({
    serialNumber: "",
    specs: "",
    status: "good" as "good" | "broken",
  });

  const [itemFormData, setItemFormData] = useState({
    name: "",
    information: "",
    location: decodedLocation,
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
    });
    setEditingItem(null);
  };

  const resetSerialForm = () => {
    setSerialFormData({ serialNumber: "", specs: "", status: "good" });
    setEditingSerial(null);
  };

  const handleBarcodeScanned = async (data: { serialNumber: string; specs: string; status: "good" | "broken" }) => {
    if (!selectedItem) return;

    // Validate that kode_inventaris is not empty
    if (!data.serialNumber.trim()) {
      alert('Kode Inventaris tidak boleh kosong');
      return;
    }

    try {
      await addSerialNumber({
        ...data,
        itemId: selectedItem.id,
        dateAdded: new Date().toISOString(),
      });

      // Refresh data in background after dialog closes
      await Promise.all([
        refreshItems(),
        fetchSerialNumbers(selectedItem.id)
      ]);

      // Update selectedItem with fresh data from refreshed items
      const updatedItem = itemsByLocation.find(item => item.id === selectedItem.id);
      if (updatedItem) {
        setSelectedItem(updatedItem);
      }
    } catch (error) {
      console.error('Error in handleBarcodeScanned:', error);
      alert('Gagal menyimpan kode inventaris');
    }
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
      addItem({
        name: itemFormData.name,
        information: itemFormData.information,
        location: itemFormData.location,
      });
    }

    resetItemForm();
    setIsAddItemDialogOpen(false);
  };

  const handleEditItem = (item: InventoryItem) => {
    setItemFormData({
      name: item.name,
      information: item.information,
      location: item.location,
    });
    setEditingItem(item);
    setIsAddItemDialogOpen(true);
  };

  const handleEditSerial = (serial: SerialNumber) => {
    setSerialFormData({
      serialNumber: serial.serialNumber,
      specs: serial.specs || "",
      status: serial.status || "good",
    });
    setEditingSerial(serial);
    setIsEditSerialDialogOpen(true);
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
      try {
        await deleteSerialNumber(id);
        
        // Refresh all data in parallel
        await Promise.all([
          refreshItems(),
          fetchSerialNumbers(selectedItem.id)
        ]);
      } catch (error) {
        console.error('Error in handleDeleteSerial:', error);
      }
    }
  };

  const handleSerialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !editingSerial) return;

    // Validate
    if (!serialFormData.serialNumber.trim()) {
      alert('Kode Inventaris tidak boleh kosong');
      return;
    }

    try {
      await updateSerialNumber(editingSerial.id, {
        serialNumber: serialFormData.serialNumber,
        specs: serialFormData.specs,
        status: serialFormData.status,
      });

      // Refresh data
      await Promise.all([
        refreshItems(),
        fetchSerialNumbers(selectedItem.id),
      ]);

      const updatedItem = itemsByLocation.find(item => item.id === selectedItem.id);
      if (updatedItem) setSelectedItem(updatedItem);

      setIsEditSerialDialogOpen(false);
      resetSerialForm();
    } catch (error) {
      console.error('Error updating serial:', error);
      alert('Gagal memperbarui kode inventaris');
    }
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

  // Calculate totalQuantity from items instead of separate API call
  // Ensure jumlah is treated as a number to avoid string concatenation
  const totalQuantity = itemsByLocation.reduce((sum, item) => sum + Number(item.jumlah ?? 0), 0);

  // Gambar placeholder lokal (memoized so the reference is stable for hooks)
  const statusImages = useMemo(
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
  const [statusIndex, setStatusIndex] = useState(0);
  const [prevStatusIndex, setPrevStatusIndex] = useState<number | null>(null);
  // Carousel timer and touch support
  const carouselTimerRef = useRef<number | null>(null);
  const statusIndexRef = useRef<number>(0);
  const transitionTimeoutRef = useRef<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);

  const statusSrcKey = useMemo(() => statusImages.map((s) => s.src).join("|"), [statusImages]);

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
        await Promise.all(
          statusImages.map((img) =>
            new Promise<void>((resolve) => {
              const i = new window.Image();
              i.src = img.src;
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
                Tambah Barang
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{editingItem ? "Edit Barang" : "Tambah Barang Baru"}</DialogTitle>
                <DialogDescription>
                  {editingItem ? "Perbarui detail item ini." : "Tambah Barang baru di laboratorium."}
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
                  <Button type="submit">{editingItem ? "Simpan" : "Tambah Barang"}</Button>
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
            <div
              className="relative w-full h-32 md:h-40 lg:h-48 overflow-hidden rounded mb-2 touch-pan-y"
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
                    sizes="(max-width: 768px) 100vw, 400px"
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
                  sizes="(max-width: 768px) 100vw, 400px"
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
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" onClick={() => handleDeleteItem(item.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
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
              <>
                <Button onClick={() => { resetSerialForm(); setIsScannerOpen(true); }} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Kode Inventaris
                </Button>

                {/* Edit Serial Dialog */}
                <Dialog open={isEditSerialDialogOpen} onOpenChange={setIsEditSerialDialogOpen}>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>{editingSerial ? "Edit Kode Inventaris" : "Edit Kode Inventaris"}</DialogTitle>
                      <DialogDescription>Perbarui rincian kode inventaris</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSerialSubmit}>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="serialNumber">Kode Inventaris</Label>
                          <Input
                            id="serialNumber"
                            value={serialFormData.serialNumber}
                            onChange={(e) => setSerialFormData({ ...serialFormData, serialNumber: e.target.value })}
                            placeholder="e.g., 00000083"
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
                            onValueChange={(value: "good" | "broken") => setSerialFormData({ ...serialFormData, status: value })}
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
                        <Button variant="outline" type="button" onClick={() => { setIsEditSerialDialogOpen(false); resetSerialForm(); }}>Batal</Button>
                        <Button type="submit">Perbarui Kode Inventaris</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </>
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
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="icon" onClick={() => handleDeleteSerial(serial.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
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

      {/* Barcode Scanner Modal */}
      {selectedItem && (
        <BarcodeScanner
          isOpen={isScannerOpen}
          onClose={() => {
            setIsScannerOpen(false);
          }}
          onSave={handleBarcodeScanned}
        />
      )}
    </div>
  );
}
