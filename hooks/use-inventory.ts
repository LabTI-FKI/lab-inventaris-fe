"use client"

import { useState, useEffect, useCallback } from "react"
import type { InventoryItem, SerialNumber, Location, LocationStats } from "@/types/inventory"
interface ItemWithDates extends InventoryItem {
  created_at: string;
  updated_at: string;
}
import useRooms from "@/hooks/use-rooms"
import * as XLSX from 'xlsx'

export function useInventory() {
  // include rooms so we can compute stats for dynamic rooms created client-side
  const { getAll: getAllRooms } = useRooms()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [serialNumbers, setSerialNumbers] = useState<SerialNumber[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [roomsVersion, setRoomsVersion] = useState(0)
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://lab-inventaris-backend.onrender.com';

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

  // Listen for rooms changes (localStorage) so we can update derived stats
  useEffect(() => {
    const handler = () => setRoomsVersion(v => v + 1)
    try {
      window.addEventListener("lab-inventory-rooms-changed", handler)
    } catch (e) {
      // ignore (server-side or missing window)
    }
    return () => {
      try { window.removeEventListener("lab-inventory-rooms-changed", handler) } catch (e) {}
    }
  }, [])

  // ADD THIS NEW FUNCTION - Refresh items and serial numbers from backend
  const refreshItems = useCallback(async () => {
    try {
      const resItems = await fetch(`${API_URL}/items`);
      const itemsData = await resItems.json();
      setItems(itemsData);

      const resSerials = await fetch(`${API_URL}/serial-numbers`);
      const serialsData = await resSerials.json();
      setSerialNumbers(serialsData);
    } catch (err) {
      console.error('Gagal refresh data:', err);
    }
  }, [API_URL]);

  // Tambah barang ke backend. Backend akan otomatis menambahkan serial number sesuai quantity
  const addItem = async (item: Omit<InventoryItem, "id" | "dateAdded" | "lastUpdated">, quantity?: number) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, quantity: quantity || 1 }), // Send quantity=1 if not specified
      });
      const newItem = await res.json();

      // Refresh items to get updated counts immediately
      await refreshItems();
      
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
    try {
      // Validate that serialNumber is not empty
      if (!serial.serialNumber || !serial.serialNumber.trim()) {
        throw new Error('Kode inventaris harus diisi');
      }

      // Check if serial number already exists with proper field name mapping
      const existingSerials = await getSerialNumbersFromServer(serial.itemId);
      const isDuplicate = existingSerials.some((s: any) => {
        // Handle both possible field names from different API responses
        const existingCode = (s.serialNumber || s.kode_inventaris || '').trim();
        const newCode = (serial.serialNumber || '').trim();
        return existingCode === newCode;
      });
      
      if (isDuplicate) {
        throw new Error('Kode inventaris sudah terdaftar');
      }

      const res = await fetch(`${API_URL}/serial-numbers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serial),
      });
      
      if (!res.ok) {
        throw new Error('Gagal menambah serial number');
      }

      const newSerial = await res.json();
      setSerialNumbers((prev) => [...prev, newSerial]);
      
      // Don't call refreshItems here - let the caller decide when to refresh
      return newSerial.id;
    } catch (err) {
      console.error('Gagal menambah serial number:', err);
      throw err; // Re-throw to handle in the UI
    }
  };

  // Update serial number di backend
  const updateSerialNumber = async (id: string, updates: Partial<SerialNumber>) => {
    try {
      const res = await fetch(`${API_URL}/serial-numbers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const updated = await res.json();
      setSerialNumbers((prev) => prev.map((serial) => serial.id === id ? updated : serial));
      
      // CRITICAL: Refresh items to get updated counts (jumlah, baik, rusak)
      await refreshItems();
    } catch (err) {
      console.error('Gagal update serial number:', err);
    }
  };

  // Hapus serial number di backend
  const deleteSerialNumber = async (id: string) => {
    try {
      await fetch(`${API_URL}/serial-numbers/${id}`, { method: 'DELETE' });
      setSerialNumbers((prev) => prev.filter((serial) => serial.id !== id));
      
      // CRITICAL: Refresh items to get updated counts (jumlah, baik, rusak)
      await refreshItems();
    } catch (err) {
      console.error('Gagal hapus serial number:', err);
    }
  };

  const getItemsByLocation = (location: string) => {
    return items.filter((item) => item.location === location)
  }


  const getSerialNumbersFromServer = async (itemId: string) => {
  try {
    const res = await fetch(`${API_URL}/items/${itemId}/serial-numbers`);
    if (!res.ok) throw new Error('Failed to fetch serial numbers');
    return await res.json();
  } catch (err) {
    console.error('Error fetching serials from server:', err);
    return [];
  }
};



  const getItemStatus = (itemId: string) => {
    const itemSerials = serialNumbers.filter((serial) => serial.itemId === itemId)
    if (itemSerials.length === 0) return "good" as const
    // If all serials are broken, item is broken. If at least one is good, item is good.
    return itemSerials.every((serial) => serial.status === "broken") ? ("broken" as const) : ("good" as const)
  }

  const getLocationStats = (): LocationStats[] => {
    // Merge default locations with any saved rooms created client-side
    const savedRooms = getAllRooms()
    const savedNames = savedRooms.map(r => (r as any).name)
    const defaultLocations = ["Ruang Laboran", "Lab FKI", "Lab Jarkom", "Lab SI", "Lab SIC", "Lab RPL"]
    const locations = Array.from(new Set([...defaultLocations, ...savedNames]))

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

  const exportToExcel = async () => {
    try {
      // Ensure we have the latest items and serial numbers before exporting
      await refreshItems();
      // Fetch fresh items directly so we work with the latest data immediately
      const resFreshItems = await fetch(`${API_URL}/items`)
      const freshItems = await resFreshItems.json()

      // Get all items with their serial numbers
      const allItemsData = await Promise.all(
        freshItems.map(async (item: any) => {
          const itemSerials = await getSerialNumbersFromServer(item.id);
          return itemSerials.map((serial: any) => ({
            'Nama Barang': item.name,
            'Informasi': item.information || '',
            'Lokasi': item.location,
            'Kode Inventaris': serial.serialNumber || '',
            'Spesifikasi': serial.specs || '',
            'Status': serial.status || 'good',
            'Tanggal Ditambahkan': new Date().toLocaleDateString('id-ID'),
          }));
        })
      );

      // Flatten and group by location
      const flattenedData = allItemsData.flat();
      const groupedByLocation = flattenedData.reduce((acc: Record<string, any[]>, item) => {
        const location = item['Lokasi'];
        if (!acc[location]) {
          acc[location] = [];
        }
        // Create a copy of the item without the Lokasi field for the location-specific sheets
        const { Lokasi, ...itemWithoutLocation } = item;
        acc[location].push(itemWithoutLocation);
        return acc;
      }, {});

      // Ensure newly added rooms (client-side) are included even when they have no items
      try {
        const savedRooms = getAllRooms()
        const savedNames = savedRooms.map((r: any) => r.name)
        const defaultLocations = ["Ruang Laboran", "Lab FKI", "Lab Jarkom", "Lab SI", "Lab SIC", "Lab RPL"]
        const allLocations = Array.from(new Set([...defaultLocations, ...savedNames]))
        allLocations.forEach(loc => {
          if (!groupedByLocation[loc]) groupedByLocation[loc] = []
        })
      } catch (e) {
        // if getAllRooms fails (server-side or other), ignore — export will include only locations present in data
        console.warn('Could not include saved rooms in export:', e)
      }

      // Create workbook
      const wb = XLSX.utils.book_new();
      wb.Props = {
        Title: "Inventaris Lab TI",
        Subject: "Daftar Inventaris Laboratorium",
        Author: "Lab TI UMS",
        CreatedDate: new Date()
      };

      // Simple function to set up basic column widths
      const setColumnWidths = (ws: XLSX.WorkSheet, numColumns: number) => {
        ws['!cols'] = Array(numColumns).fill({ wch: 25 }); // Set all columns to width 25
      };

      // Helper to convert 0-based column index to Excel letter (0 -> A)
      const colIdxToLetter = (idx: number) => {
        let s = ''
        let n = idx + 1
        while (n > 0) {
          const rem = (n - 1) % 26
          s = String.fromCharCode(65 + rem) + s
          n = Math.floor((n - 1) / 26)
        }
        return s
      }

      // Create summary sheet with all items
      const allInventoryHeaders = [
        'Nama Barang', 'Informasi', 'Lokasi', 'Kode Inventaris', 
        'Spesifikasi', 'Status', 'Tanggal Ditambahkan'
      ];
      
      // Create summary worksheet with title and headers
      const summaryWs = XLSX.utils.aoa_to_sheet([
        ['DAFTAR INVENTARIS UNIVERSITAS MUHAMMADIYAH SURAKARTA'], // Title
        ['Laboratorium dan Ruang Perkuliahan'], // Subtitle
        [], // Empty row for spacing
        allInventoryHeaders // Headers
      ]);      // Add data starting from row 5 (after title, subtitle, empty row, and headers)
      XLSX.utils.sheet_add_json(summaryWs, flattenedData, { 
        origin: 'A5', 
        skipHeader: true 
      });

      // Set column widths
      setColumnWidths(summaryWs, 7); // 7 columns for summary sheet

      // Style summary header row (row 4) and enable autofilter
      try {
        const headerRowIndex = 4 // 1-based row index where headers are placed (A4..G4)
        for (let c = 0; c < 7; c++) {
          const cellAddr = `${colIdxToLetter(c)}${headerRowIndex}`
          const cell = summaryWs[cellAddr]
          if (cell) {
            cell.s = cell.s || {}
            cell.s.font = { ...(cell.s.font || {}), bold: true }
          }
        }
        const lastRow = 4 + flattenedData.length
        summaryWs['!autofilter'] = { ref: `A4:G${Math.max(4, lastRow)}` }
      } catch (e) {
        // ignore styling errors in environments where styles are not supported
        console.warn('Could not apply styles to summary sheet', e)
      }

      // Merge cells for title and subtitle
      summaryWs['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }, // Title
        { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } }  // Subtitle
      ];

      // Add summary sheet to workbook
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Daftar Inventaris');      // Create a sheet for each location
      Object.entries(groupedByLocation).forEach(([location, locationData]) => {
        const locationHeaders = [
          'Nama Barang', 'Informasi', 'Kode Inventaris', 
          'Spesifikasi', 'Status', 'Tanggal Ditambahkan'
        ];
        
        // Create location worksheet with title
        const ws = XLSX.utils.aoa_to_sheet([
          [`INVENTARIS ${location.toUpperCase()}`], // Title
          ['Universitas Muhammadiyah Surakarta'], // Subtitle
          [], // Empty row for spacing
          locationHeaders // Headers
        ]);
        
        // Add data starting from row 5
        XLSX.utils.sheet_add_json(ws, locationData, {
          origin: 'A5',
          skipHeader: true
        });
        
        // Set column widths
        setColumnWidths(ws, 6); // 6 columns for location sheets

        // Merge cells for title and subtitle
        ws['!merges'] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }, // Title
          { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } }  // Subtitle
        ];

        // Style header row (row 4) and enable autofilter
        try {
          const headerRowIndex = 4 // headers placed at A4..F4
          for (let c = 0; c < 6; c++) {
            const cellAddr = `${colIdxToLetter(c)}${headerRowIndex}`
            const cell = ws[cellAddr]
            if (cell) {
              cell.s = cell.s || {}
              cell.s.font = { ...(cell.s.font || {}), bold: true }
            }
          }

          const dataRows = locationData.length
          const lastDataRow = 4 + dataRows
          // Set autofilter covering header + data rows (if any)
          ws['!autofilter'] = { ref: `A4:F${Math.max(4, lastDataRow)}` }

          // Add TOTAL row below data showing count of Kode Inventaris (column C)
          const totalRowIndex = lastDataRow + 2
          const totalLabelCell = `A${totalRowIndex}`
          ws[totalLabelCell] = { v: 'TOTAL', t: 's', s: { font: { bold: true } } }
          const totalFormulaCell = `C${totalRowIndex}`
          // If there is data, count entries in C5:C{lastDataRow}; otherwise set 0
          if (dataRows > 0) {
            ws[totalFormulaCell] = { f: `COUNTA(C5:C${lastDataRow})`, t: 'n', s: { font: { bold: true } } }
          } else {
            ws[totalFormulaCell] = { v: 0, t: 'n', s: { font: { bold: true } } }
          }
        } catch (e) {
          console.warn('Could not apply styles/totals to location sheet', e)
        }
        
        // Sanitize sheet name
        const sheetName = location.replace(/[*?:\\\/\[\]]/g, ' ').substring(0, 31);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      });

  // Generate Excel file with timestamped filename
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  XLSX.writeFile(wb, `Inventaris Lab TI - ${today}.xlsx`);
      
      return true;
    } catch (err) {
      console.error('Gagal export ke Excel:', err);
      return false;
    }
  };

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
    refreshItems,
    exportToExcel, // Add the export function
  }
}