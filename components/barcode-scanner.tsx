import React, { useEffect, useRef, useState } from "react";
import Quagga from "@ericblade/quagga2";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, X } from "lucide-react";

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { serialNumber: string; specs: string; status: "good" | "broken" }) => void;
}

export function BarcodeScanner({ isOpen, onClose, onSave }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scannedCode, setScannedCode] = useState("");
  const [specs, setSpecs] = useState("");
  const [status, setStatus] = useState<"good" | "broken">("good");
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState("");
  const quaggaRef = useRef<typeof Quagga | null>(null);
  const detectedRef = useRef(false);
  const detectionCountRef = useRef(0);

  const startScanning = async () => {
    try {
      setError("");
      detectedRef.current = false;
      detectionCountRef.current = 0;
      
      // Wait for video element to be in DOM
      let attempts = 0;
      let videoElement = videoRef.current;
      while (!videoElement && attempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 50));
        videoElement = videoRef.current;
        attempts++;
      }
      
      if (!videoElement) {
        setError("Video element not found - please try again");
        setIsScanning(false);
        return;
      }

      console.log("Video element found, requesting camera access");

      // Get camera stream and attach to video element
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        videoElement.srcObject = stream;
        console.log("Camera stream attached to video element");
      } catch (permErr) {
        console.error("Camera permission denied:", permErr);
        setError("Izin akses kamera ditolak. Silakan izinkan akses kamera di pengaturan perangkat.");
        setIsScanning(false);
        return;
      }

      // Stop any existing Quagga instance FIRST
      console.log("Cleaning up previous Quagga instance");
      try {
        Quagga.offDetected();
        Quagga.stop();
      } catch (err) {
        console.debug("Pre-cleanup error:", err);
      }
      quaggaRef.current = null;

      console.log("Initializing Quagga with video element");

      // Initialize Quagga with CODE_128 and other 1D formats
      Quagga.init(
        {
          inputStream: {
            name: "Live",
            type: "LiveStream",
            target: videoRef.current!,
            constraints: {
              width: { min: 640 },
              height: { min: 480 },
              facingMode: "environment",
              aspectRatio: { min: 1, max: 2 },
            },
          },
          locator: {
            halfSample: true,
          },
          numOfWorkers: 2,
          frequency: 10,
          decoder: {
            // Prefer Code 39 reader first (your barcodes are Type-39)
            readers: [
              "code_39_reader",
              "code_128_reader",
              "code_93_reader",
              "ean_reader",
              "ean_8_reader",
              "upc_reader",
              "upc_e_reader",
              "codabar_reader",
            ],
            debug: {
              showPattern: false,
              showFrequency: false,
              drawScanline: false,
            },
          },
        },
        (error) => {
          if (error) {
            console.error("Quagga init error:", error);
            setError("Gagal menginisialisasi kamera. " + (error instanceof Error ? error.message : JSON.stringify(error)));
            setIsScanning(false);
            return;
          }

          console.log("Quagga initialized successfully");
          quaggaRef.current = Quagga;
          detectedRef.current = false;

          Quagga.onDetected((result) => {
            if (detectedRef.current) return;

            if (result && result.codeResult && result.codeResult.code) {
              const raw = result.codeResult.code.trim();
              const format = result.codeResult.format;

              detectionCountRef.current++;
              console.log(`Detection #${detectionCountRef.current} - Format: ${format}, Raw: ${raw}`);

              // Normalize Code39: strip leading/trailing '*' used as start/stop sentinels
              const normalized = raw.replace(/^\*+|\*+$/g, "").trim();
              console.log("Normalized code:", normalized);

              // Accept after a couple of consistent detections to avoid false positives
              if (detectionCountRef.current >= 2) {
                console.log("Barcode accepted with code:", normalized);
                detectedRef.current = true;
                setScannedCode(normalized);
                setIsScanning(false);
                stopScanning();
              }
            }
          });

          try {
            Quagga.start();
            console.log("Quagga started successfully");
          } catch (startErr) {
            console.error("Error starting Quagga:", startErr);
            setError("Gagal memulai pemindai. " + (startErr instanceof Error ? startErr.message : ""));
            setIsScanning(false);
          }
        }
      );
    } catch (error) {
      console.error("Failed to start scanning:", error);
      setError("Gagal memulai pemindai barcode. " + (error instanceof Error ? error.message : ""));
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    try {
      if (quaggaRef.current) {
        console.log("Stopping Quagga");
        Quagga.offDetected();
        Quagga.stop();
        quaggaRef.current = null;
        console.log("Quagga stopped and cleaned up");
      }
    } catch (err) {
      console.debug("Stop scanning error:", err);
    }
    // Always attempt to stop the camera stream when stopping scanning
    try {
      stopCameraStream();
    } catch (e) {
      console.debug('Error stopping camera after stopScanning', e);
    }
  };

  // Ensure the camera MediaStream is stopped and released
  const stopCameraStream = () => {
    try {
      const videoEl = videoRef.current;
      if (videoEl && videoEl.srcObject) {
        const stream = videoEl.srcObject as MediaStream;
        // Stop all tracks
        stream.getTracks().forEach((t) => {
          try {
            t.stop();
          } catch (e) {
            console.debug('Error stopping track', e);
          }
        });
        // Release reference from the video element
        videoEl.srcObject = null;
        console.log('Camera MediaStream tracks stopped and srcObject cleared');
      }
    } catch (err) {
      console.debug('stopCameraStream error:', err);
    }
  };

  useEffect(() => {
    if (isScanning) {
      startScanning();
    } else {
      stopScanning();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScanning]);

  // Cleanup when component unmounts to ensure camera is released
  useEffect(() => {
    return () => {
      console.log('BarcodeScanner unmount cleanup: stopping scanner and camera');
      try {
        stopScanning();
      } catch (e) {
        console.debug('Error during stopScanning in unmount cleanup', e);
      }
      try {
        stopCameraStream();
      } catch (e) {
        console.debug('Error during stopCameraStream in unmount cleanup', e);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = () => {
    console.log("Closing barcode scanner");
    stopScanning();
    setScannedCode("");
    setSpecs("");
    setStatus("good");
    setIsScanning(false);
    setError("");
    onClose();
  };

  const handleSave = () => {
    if (!scannedCode.trim()) {
      setError("Masukkan atau scan kode inventaris");
      return;
    }

    onSave({
      serialNumber: scannedCode,
      specs,
      status,
    });

    handleClose();
  };

  return (
    <>
      {/* Main Form Dialog */}
      <Dialog open={isOpen && !isScanning} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Tambah Kode Inventaris</DialogTitle>
            <DialogDescription>Masukkan kode inventaris baru</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Kode Inventaris dengan Tombol Scan */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="manual-code">Kode Inventaris *</Label>
                <Button 
                  onClick={() => setIsScanning(true)} 
                  size="sm" 
                  variant="outline"
                  type="button"
                >
                  <Camera className="h-3 w-3 mr-1" />
                  Scan
                </Button>
              </div>
              <Input
                id="manual-code"
                value={scannedCode}
                onChange={(e) => setScannedCode(e.target.value)}
                placeholder="Ketik atau klik Scan untuk scan"
                autoFocus
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            {/* Spesifikasi */}
            <div className="space-y-2">
              <Label htmlFor="specs">Spesifikasi</Label>
              <Textarea
                id="specs"
                value={specs}
                onChange={(e) => setSpecs(e.target.value)}
                placeholder="Contoh: Laptop Dell, Monitor 24 inch, dll"
                rows={3}
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(value: "good" | "broken") => setStatus(value)}>
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
            <Button variant="outline" onClick={handleClose} type="button">
              Batal
            </Button>
            <Button onClick={handleSave} type="button">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scan Popup - Separate Dialog */}
      <Dialog open={isScanning} onOpenChange={(open) => {
        if (!open) {
          setIsScanning(false);
          stopScanning();
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Scan Barcode</DialogTitle>
            <DialogDescription>Arahkan kamera ke barcode untuk scan</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            <div className="relative">
              {/* Simple quick-guide shown when scanning to help users get consistent reads */}
              <div className="mb-3 text-sm text-left text-blue-800 rounded-md border border-blue-200 bg-blue-50 p-3">
                <div className="font-semibold mb-1">Petunjuk cepat:</div>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Pastikan pencahayaan cukup</li>
                  <li>Jaga jarak ~10–30 cm dan arahkan barcode horizontal</li>
                  <li>Hindari pantulan atau gerakan cepat</li>
                </ul>
              </div>
              <video 
                ref={videoRef} 
                className="w-full rounded-lg border bg-black"
                style={{ 
                  height: "400px",
                  display: "block",
                  objectFit: "cover"
                }}
                autoPlay
                playsInline
                muted
              />
              <canvas
                ref={canvasRef}
                style={{
                  display: "none",
                }}
              />
              <Button
                onClick={() => {
                  setIsScanning(false);
                  stopScanning();
                }}
                className="absolute top-2 right-2"
                size="icon"
                variant="destructive"
                type="button"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-gray-600 text-center">
              Posisikan barcode di tengah layar
            </p>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsScanning(false);
                stopScanning();
              }}
              type="button"
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
