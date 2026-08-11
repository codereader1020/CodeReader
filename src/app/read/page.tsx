'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Scan, 
  Upload, 
  Camera, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  ShieldAlert, 
  Copy, 
  Check, 
  RefreshCw,
  XCircle,
  FileCode,
  Crop,
  Maximize2
} from 'lucide-react';
import { decodePdf417 } from '@/lib/pdf417/decoder';
import { DecodedBarcode } from '@/lib/pdf417/types';
import { validateEmployeeCredential } from '@/lib/credentials/validation';
import { ValidationResult } from '@/lib/credentials/schema';
import { saveHistoryItem } from '@/lib/history';
import { escapeHtml } from '@/lib/security/sanitization';

export default function ReadPage() {
  const [activeMode, setActiveMode] = useState<'upload' | 'camera'>('upload');

  // File Upload & Cropper State
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [loadedImageElement, setLoadedImageElement] = useState<HTMLImageElement | null>(null);
  const [isDecoding, setIsDecoding] = useState<boolean>(false);

  // Interactive Crop Box State (percentage 0 to 100)
  const [cropBox, setCropBox] = useState<{ x: number; y: number; w: number; h: number }>({
    x: 5,
    y: 10,
    w: 90,
    h: 45, // Default focus on top 45% of card
  });
  const [isCropping, setIsCropping] = useState<boolean>(false);
  const cropContainerRef = useRef<HTMLDivElement | null>(null);
  const isDraggingCropRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ startX: number; startY: number; boxX: number; boxY: number }>({
    startX: 0,
    startY: 0,
    boxX: 0,
    boxY: 0,
  });

  // Camera Scanner State
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Results State
  const [decodedResults, setDecodedResults] = useState<DecodedBarcode[] | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [secretKey, setSecretKey] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Load Image File & Auto Scan
  const processImageFile = async (file: File) => {
    setIsDecoding(true);
    setErrorMsg(null);
    setDecodedResults(null);
    setValidationResult(null);

    const objectUrl = URL.createObjectURL(file);
    setImagePreviewUrl(objectUrl);

    const img = new Image();
    img.onload = async () => {
      setLoadedImageElement(img);
      await attemptDecodeSource(img);
    };
    img.src = objectUrl;
  };

  // Attempt Decoding from HTMLImageElement, Canvas or Cropped ROI
  const attemptDecodeSource = async (
    source: HTMLImageElement | HTMLCanvasElement
  ) => {
    setIsDecoding(true);
    setErrorMsg(null);

    try {
      const results = await decodePdf417(source);
      if (results && results.length > 0) {
        setDecodedResults(results);
        await runCredentialValidation(results[0].text, secretKey);

        saveHistoryItem({
          type: 'decode',
          format: 'pdf417',
          rawPayload: results[0].text,
          title: `Decoded PDF417 (${selectedFile?.name || 'Image'})`,
          subtitle: `${results[0].text.length} characters`,
        });
      }
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error?.message || 'No readable PDF417 barcode found. Try adjusting the crop area over the barcode.');
      setDecodedResults(null);
    } finally {
      setIsDecoding(false);
    }
  };

  // Crop & Decode Selected Region of Uploaded Image
  const decodeCroppedRegion = async () => {
    if (!loadedImageElement) return;

    const canvas = document.createElement('canvas');
    const naturalWidth = loadedImageElement.naturalWidth || loadedImageElement.width;
    const naturalHeight = loadedImageElement.naturalHeight || loadedImageElement.height;

    const realX = Math.max(0, Math.floor((cropBox.x / 100) * naturalWidth));
    const realY = Math.max(0, Math.floor((cropBox.y / 100) * naturalHeight));
    const realW = Math.min(naturalWidth - realX, Math.floor((cropBox.w / 100) * naturalWidth));
    const realH = Math.min(naturalHeight - realY, Math.floor((cropBox.h / 100) * naturalHeight));

    canvas.width = realW;
    canvas.height = realH;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(loadedImageElement, realX, realY, realW, realH, 0, 0, realW, realH);
      await attemptDecodeSource(canvas);
    }
  };

  // Preset Crop Areas
  const setCropPreset = (type: 'top' | 'full' | 'middle') => {
    if (type === 'top') {
      setCropBox({ x: 5, y: 5, w: 90, h: 45 });
    } else if (type === 'middle') {
      setCropBox({ x: 5, y: 25, w: 90, h: 50 });
    } else {
      setCropBox({ x: 0, y: 0, w: 100, h: 100 });
    }
  };

  // Run Credential Validation on decoded raw string
  const runCredentialValidation = async (rawText: string, key?: string) => {
    const res = await validateEmployeeCredential(rawText, key);
    setValidationResult(res);
  };

  // Re-run validation when secretKey changes
  useEffect(() => {
    if (decodedResults && decodedResults.length > 0) {
      runCredentialValidation(decodedResults[0].text, secretKey);
    }
  }, [secretKey, decodedResults]);

  // Handle Drag & Drop File Upload
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      processImageFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      processImageFile(file);
    }
  };

  // Camera Functions & Stream Focus ROI
  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  const startCamera = async (deviceId?: string) => {
    stopCamera();
    setCameraError(null);
    setErrorMsg(null);
    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'environment' },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraActive(true);

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoIn = devices.filter((d) => d.kind === 'videoinput');
      setVideoDevices(videoIn);

      scanCameraFrame();
    } catch (err: unknown) {
      const error = err as Error;
      setCameraError(
        error?.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in your browser settings.'
          : 'Unable to access device camera. Please check camera connection.'
      );
      setIsCameraActive(false);
    }
  };

  const scanCameraFrame = () => {
    if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = requestAnimationFrame(scanCameraFrame);
      return;
    }

    const video = videoRef.current;
    const vW = video.videoWidth;
    const vH = video.videoHeight;

    // Extract both central ROI rectangle AND full frame
    const roiW = Math.floor(vW * 0.85);
    const roiH = Math.floor(vH * 0.45);
    const roiX = Math.floor((vW - roiW) / 2);
    const roiY = Math.floor((vH - roiH) / 2);

    const canvasROI = document.createElement('canvas');
    canvasROI.width = roiW;
    canvasROI.height = roiH;
    const ctx = canvasROI.getContext('2d');

    if (ctx) {
      ctx.drawImage(video, roiX, roiY, roiW, roiH, 0, 0, roiW, roiH);
      decodePdf417(canvasROI)
        .then((results) => {
          if (results && results.length > 0) {
            setDecodedResults(results);
            runCredentialValidation(results[0].text, secretKey);
            stopCamera();

            saveHistoryItem({
              type: 'decode',
              format: 'pdf417',
              rawPayload: results[0].text,
              title: 'Live Camera PDF417 Scan',
              subtitle: `${results[0].text.length} characters`,
            });
          } else {
            animationFrameRef.current = requestAnimationFrame(scanCameraFrame);
          }
        })
        .catch(() => {
          animationFrameRef.current = requestAnimationFrame(scanCameraFrame);
        });
    }
  };

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const copyDecodedText = () => {
    if (!decodedResults || decodedResults.length === 0) return;
    navigator.clipboard.writeText(decodedResults[0].text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getFormattedJson = (text: string) => {
    try {
      return JSON.stringify(JSON.parse(text), null, 2);
    } catch (e) {
      return null;
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
          <Scan className="w-8 h-8 text-blue-400" /> PDF417 Barcode Reader & Scanner
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Decode PDF417 barcodes from uploaded ID images or live video camera streams. Features interactive crop tool and multi-region scanner for high-density Driver&apos;s License IDs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Upload / Camera Controls & Interactive Cropper */}
        <div className="lg:col-span-6 space-y-6">
          {/* Mode Switcher */}
          <div className="glass-panel p-1.5 rounded-2xl border border-gray-800 flex gap-1">
            <button
              onClick={() => {
                stopCamera();
                setActiveMode('upload');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeMode === 'upload'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
              }`}
            >
              <Upload className="w-4 h-4" /> Upload Barcode Image
            </button>
            <button
              onClick={() => {
                setActiveMode('camera');
                startCamera();
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeMode === 'camera'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
              }`}
            >
              <Camera className="w-4 h-4" /> Live Camera Stream
            </button>
          </div>

          {/* Mode A: Drag & Drop File Upload & Interactive Cropper */}
          {activeMode === 'upload' && (
            <div className="space-y-4">
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`glass-panel p-6 rounded-2xl border-2 border-dashed text-center transition-all flex flex-col items-center justify-center min-h-[320px] relative ${
                  dragActive
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-800 hover:border-gray-700 bg-gray-900/40'
                }`}
              >
                {!imagePreviewUrl && (
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/webp, image/bmp"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                )}

                {imagePreviewUrl ? (
                  <div className="space-y-4 w-full flex flex-col items-center">
                    {/* Interactive Cropper View */}
                    <div
                      ref={cropContainerRef}
                      className="relative rounded-xl overflow-hidden border border-gray-800 shadow-xl max-h-[340px] max-w-full bg-black flex items-center justify-center select-none"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imagePreviewUrl}
                        alt="Uploaded Barcode Preview"
                        className="max-h-[340px] object-contain pointer-events-none"
                      />

                      {/* Interactive Bounding Box Overlay */}
                      <div
                        className="absolute border-2 border-blue-400 bg-blue-500/15 shadow-[0_0_20px_rgba(59,130,246,0.4)] flex flex-col justify-between"
                        style={{
                          left: `${cropBox.x}%`,
                          top: `${cropBox.y}%`,
                          width: `${cropBox.w}%`,
                          height: `${cropBox.h}%`,
                        }}
                      >
                        <div className="bg-blue-600/90 text-white text-[9px] font-bold px-2 py-0.5 self-start rounded-br">
                          PDF417 Crop Focus Region
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        onClick={() => setCropPreset('top')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                          cropBox.y === 5 && cropBox.h === 45
                            ? 'bg-blue-600/30 text-blue-300 border-blue-500'
                            : 'bg-gray-900 text-gray-400 border-gray-800'
                        }`}
                      >
                        Focus Top 50% (ID Barcode)
                      </button>
                      <button
                        onClick={() => setCropPreset('middle')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                          cropBox.y === 25 && cropBox.h === 50
                            ? 'bg-blue-600/30 text-blue-300 border-blue-500'
                            : 'bg-gray-900 text-gray-400 border-gray-800'
                        }`}
                      >
                        Focus Middle
                      </button>
                      <button
                        onClick={() => setCropPreset('full')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                          cropBox.w === 100 && cropBox.h === 100
                            ? 'bg-blue-600/30 text-blue-300 border-blue-500'
                            : 'bg-gray-900 text-gray-400 border-gray-800'
                        }`}
                      >
                        Full Card (100%)
                      </button>
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <button
                        onClick={decodeCroppedRegion}
                        className="py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-md shadow-blue-600/30 flex items-center gap-2"
                      >
                        <Crop className="w-4 h-4" /> Scan Focused Crop Box
                      </button>
                      <label className="py-2.5 px-4 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold border border-gray-700 cursor-pointer flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5" /> Change Image
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/webp, image/bmp"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 pointer-events-none">
                    <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto border border-blue-500/20">
                      <Upload className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Drag and drop your ID card image here</p>
                      <p className="text-xs text-gray-400 mt-1">Supports Driver&apos;s License back side, PNG, JPG, WEBP, BMP</p>
                    </div>
                    <button className="px-4 py-2 rounded-xl bg-gray-800 text-xs font-semibold text-gray-200 border border-gray-700">
                      Browse File
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mode B: Live Camera Scanner with ROI Overlay */}
          {activeMode === 'camera' && (
            <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4 text-center">
              {cameraError ? (
                <div className="p-6 rounded-xl bg-red-500/10 border border-red-500/20 text-center space-y-3">
                  <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
                  <p className="text-xs text-red-300">{cameraError}</p>
                  <button
                    onClick={() => startCamera(selectedDeviceId)}
                    className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold"
                  >
                    Retry Camera
                  </button>
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-gray-800">
                  <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />

                  {/* High-Precision Scanning Box Overlay */}
                  {isCameraActive && (
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                      <div className="w-[85%] h-[45%] border-2 border-blue-500 rounded-xl relative shadow-[0_0_30px_rgba(59,130,246,0.6)]">
                        <div className="absolute inset-x-0 h-0.5 bg-blue-400 shadow-[0_0_12px_#60a5fa] animate-pulse top-1/2"></div>
                        <div className="absolute top-2 left-2 bg-blue-600/80 text-white text-[9px] font-bold px-2 py-0.5 rounded">
                          PDF417 Camera ROI Zone
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-white mt-3 bg-black/70 px-3 py-1 rounded-full backdrop-blur-md">
                        Align Driver&apos;s License PDF417 code inside box
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Camera Switcher & Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                {videoDevices.length > 1 && (
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => {
                      setSelectedDeviceId(e.target.value);
                      startCamera(e.target.value);
                    }}
                    className="bg-gray-900 border border-gray-800 text-xs text-gray-300 rounded-xl px-3 py-2"
                  >
                    {videoDevices.map((d, i) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Camera ${i + 1}`}
                      </option>
                    ))}
                  </select>
                )}

                {isCameraActive ? (
                  <button
                    onClick={stopCamera}
                    className="px-4 py-2 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30 text-xs font-semibold hover:bg-red-600/30"
                  >
                    Stop Camera
                  </button>
                ) : (
                  <button
                    onClick={() => startCamera(selectedDeviceId)}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500"
                  >
                    Start Camera
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Decoding Result & Structured Credential Validator */}
        <div className="lg:col-span-6 space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-6 min-h-[420px]">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-blue-400" /> Decoded Payload Inspector
              </span>
              {validationResult && (
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                    validationResult.status === 'AUTHENTICATED'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : validationResult.status === 'VALID'
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                      : validationResult.status === 'EXPIRED'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : 'bg-red-500/10 text-red-400 border-red-500/30'
                  }`}
                >
                  {validationResult.status === 'AUTHENTICATED' && <CheckCircle2 className="w-3 h-3" />}
                  {validationResult.status === 'EXPIRED' && <AlertTriangle className="w-3 h-3" />}
                  {validationResult.status === 'UNAUTHENTICATED' && <ShieldAlert className="w-3 h-3" />}
                  Status: {validationResult.status}
                </span>
              )}
            </div>

            {isDecoding ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
                <p className="text-xs text-gray-400">Scanning image with PDF417 matrix decoder...</p>
              </div>
            ) : errorMsg ? (
              <div className="p-6 rounded-xl bg-red-500/10 border border-red-500/20 text-center space-y-2">
                <XCircle className="w-8 h-8 text-red-400 mx-auto" />
                <h4 className="text-sm font-semibold text-red-300">Decoder Warning</h4>
                <p className="text-xs text-red-400 leading-relaxed">{errorMsg}</p>
                <div className="pt-2 text-[11px] text-gray-400">
                  <span className="font-semibold text-white">Tip for ID Badges:</span> Click &quot;Focus Top 50%&quot; or crop closely around the PDF417 barcode to strip out surrounding text & 1D barcodes.
                </div>
              </div>
            ) : decodedResults && decodedResults.length > 0 ? (
              <div className="space-y-6">
                {/* Result Metadata Banner */}
                <div className="flex items-center justify-between bg-gray-900/60 p-3 rounded-xl border border-gray-800 text-xs">
                  <div>
                    <span className="text-gray-500">Symbology: </span>
                    <span className="font-semibold text-white uppercase">{decodedResults[0].format}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Length: </span>
                    <span className="font-semibold text-white">{decodedResults[0].text.length} chars</span>
                  </div>
                  <button
                    onClick={copyDecodedText}
                    className="text-blue-400 hover:underline flex items-center gap-1 font-medium"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>

                {/* Structured Credential View if matching company credential */}
                {validationResult && validationResult.credential ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-500/20 space-y-3">
                      <div className="flex items-center justify-between border-b border-blue-500/20 pb-2">
                        <span className="text-xs font-bold text-blue-300 uppercase">
                          Company Employee Credential (V{validationResult.credential.version})
                        </span>
                        <span className="text-xs font-mono text-gray-400">
                          {validationResult.credential.employeeId}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="block text-gray-500 text-[10px] uppercase">Full Name</span>
                          <span className="font-semibold text-white">{validationResult.credential.name}</span>
                        </div>
                        <div>
                          <span className="block text-gray-500 text-[10px] uppercase">Company</span>
                          <span className="font-semibold text-white">{validationResult.credential.company || '—'}</span>
                        </div>
                        <div>
                          <span className="block text-gray-500 text-[10px] uppercase">Department</span>
                          <span className="font-semibold text-white">{validationResult.credential.department || '—'}</span>
                        </div>
                        <div>
                          <span className="block text-gray-500 text-[10px] uppercase">Job Title</span>
                          <span className="font-semibold text-white">{validationResult.credential.role || '—'}</span>
                        </div>
                        <div>
                          <span className="block text-gray-500 text-[10px] uppercase">Issue Date</span>
                          <span className="font-semibold text-white">{validationResult.credential.issuedAt || '—'}</span>
                        </div>
                        <div>
                          <span className="block text-gray-500 text-[10px] uppercase">Expiration Date</span>
                          <span
                            className={`font-semibold ${
                              validationResult.status === 'EXPIRED' ? 'text-red-400' : 'text-white'
                            }`}
                          >
                            {validationResult.credential.expiresAt || '—'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Signature Secret Key Verification */}
                    <div className="p-3.5 rounded-xl bg-gray-900/60 border border-gray-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-emerald-400" /> Digital Signature Authentication
                        </span>
                        {validationResult.credential.signature ? (
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            Signed
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-gray-500">Unsigned</span>
                        )}
                      </div>
                      <input
                        type="password"
                        placeholder="Enter secret key to verify HMAC signature..."
                        value={secretKey}
                        onChange={(e) => setSecretKey(e.target.value)}
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                      />
                      {validationResult.reason && (
                        <p className="text-[11px] text-amber-400 leading-snug">{validationResult.reason}</p>
                      )}
                    </div>
                  </div>
                ) : null}

                {/* Raw & Pretty JSON Display */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Raw Decoded Output
                  </label>

                  {getFormattedJson(decodedResults[0].text) ? (
                    <pre className="w-full bg-gray-950 p-4 rounded-xl text-xs font-mono text-emerald-400 overflow-x-auto border border-gray-800 max-h-64">
                      {getFormattedJson(decodedResults[0].text)}
                    </pre>
                  ) : (
                    <div className="w-full bg-gray-950 p-4 rounded-xl text-xs font-mono text-gray-200 overflow-x-auto border border-gray-800 break-words max-h-64 whitespace-pre-wrap">
                      {escapeHtml(decodedResults[0].text)}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500 text-center py-20">
                Upload an image or start camera stream to view decoded barcode output.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
