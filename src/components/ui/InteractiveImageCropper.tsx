'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Crop, RefreshCw, Check } from 'lucide-react';

interface InteractiveImageCropperProps {
  imageSrc: string;
  onCropConfirm: (croppedCanvas: HTMLCanvasElement) => void;
  onFullScan: () => void;
}

export const InteractiveImageCropper: React.FC<InteractiveImageCropperProps> = ({
  imageSrc,
  onCropConfirm,
  onFullScan,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Normalized Crop Box in Percentages (0 to 100)
  const [crop, setCrop] = useState<{ x: number; y: number; w: number; h: number }>({
    x: 2,
    y: 5,
    w: 96,
    h: 40, // Default top 40% focus for ID barcodes
  });

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragMode, setDragMode] = useState<'move' | 'nw' | 'ne' | 'sw' | 'se' | 'draw' | null>(null);
  const dragStartPos = useRef<{ mouseX: number; mouseY: number; cropX: number; cropY: number; cropW: number; cropH: number }>({
    mouseX: 0,
    mouseY: 0,
    cropX: 0,
    cropY: 0,
    cropW: 0,
    cropH: 0,
  });

  // Calculate mouse position relative to container in percentages (0-100)
  const getContainerRelativePos = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return { px: 0, py: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const px = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const py = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    return { px, py };
  }, []);

  const handleMouseDown = (e: React.MouseEvent, mode: 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'draw') => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragMode(mode);

    const { px, py } = getContainerRelativePos(e.clientX, e.clientY);
    dragStartPos.current = {
      mouseX: px,
      mouseY: py,
      cropX: crop.x,
      cropY: crop.y,
      cropW: crop.w,
      cropH: crop.h,
    };

    if (mode === 'draw') {
      setCrop({ x: px, y: py, w: 2, h: 2 });
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !dragMode) return;
    const { px, py } = getContainerRelativePos(e.clientX, e.clientY);
    const { mouseX, mouseY, cropX, cropY, cropW, cropH } = dragStartPos.current;

    const dx = px - mouseX;
    const dy = py - mouseY;

    if (dragMode === 'draw') {
      const newX = Math.min(mouseX, px);
      const newY = Math.min(mouseY, py);
      const newW = Math.max(2, Math.abs(px - mouseX));
      const newH = Math.max(2, Math.abs(py - mouseY));
      setCrop({ x: newX, y: newY, w: newW, h: newH });
    } else if (dragMode === 'move') {
      const newX = Math.max(0, Math.min(100 - cropW, cropX + dx));
      const newY = Math.max(0, Math.min(100 - cropH, cropY + dy));
      setCrop({ x: newX, y: newY, w: cropW, h: cropH });
    } else if (dragMode === 'se') {
      const newW = Math.max(5, Math.min(100 - cropX, cropW + dx));
      const newH = Math.max(5, Math.min(100 - cropY, cropH + dy));
      setCrop({ ...crop, w: newW, h: newH });
    } else if (dragMode === 'nw') {
      const newX = Math.max(0, Math.min(cropX + cropW - 5, cropX + dx));
      const newY = Math.max(0, Math.min(cropY + cropH - 5, cropY + dy));
      const newW = cropX + cropW - newX;
      const newH = cropY + cropH - newY;
      setCrop({ x: newX, y: newY, w: newW, h: newH });
    }
  }, [isDragging, dragMode, getContainerRelativePos, crop]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragMode(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Execute Crop & Confirm
  const executeCrop = () => {
    if (!imageRef.current) return;
    const img = imageRef.current;
    const naturalW = img.naturalWidth || img.width;
    const naturalH = img.naturalHeight || img.height;

    const rx = Math.floor((crop.x / 100) * naturalW);
    const ry = Math.floor((crop.y / 100) * naturalH);
    const rw = Math.floor((crop.w / 100) * naturalW);
    const rh = Math.floor((crop.h / 100) * naturalH);

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, rw);
    canvas.height = Math.max(1, rh);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, rx, ry, rw, rh, 0, 0, rw, rh);
      onCropConfirm(canvas);
    }
  };

  return (
    <div className="space-y-4 w-full flex flex-col items-center">
      {/* Interactive Canvas Container */}
      <div
        ref={containerRef}
        onMouseDown={(e) => {
          if ((e.target as HTMLElement).dataset.handle !== 'true') {
            handleMouseDown(e, 'draw');
          }
        }}
        className="relative rounded-xl overflow-hidden border border-gray-800 shadow-2xl max-h-[380px] max-w-full bg-black flex items-center justify-center select-none cursor-crosshair"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imageRef}
          src={imageSrc}
          alt="Cropper Source"
          className="max-h-[380px] object-contain pointer-events-none"
        />

        {/* Dim Overlay around Crop Rectangle */}
        <div className="absolute inset-0 bg-black/50 pointer-events-none"></div>

        {/* Active Draggable Crop Rectangle */}
        <div
          onMouseDown={(e) => handleMouseDown(e, 'move')}
          className="absolute border-2 border-blue-400 bg-transparent shadow-[0_0_25px_rgba(59,130,246,0.6)] cursor-move flex flex-col justify-between"
          style={{
            left: `${crop.x}%`,
            top: `${crop.y}%`,
            width: `${crop.w}%`,
            height: `${crop.h}%`,
          }}
        >
          {/* Inner Clear Area */}
          <div className="absolute inset-0 bg-blue-500/10 pointer-events-none"></div>

          {/* Label Badge */}
          <div className="bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 self-start rounded-br z-10 shadow">
            Drag handles or drag box to fit PDF417
          </div>

          {/* Drag Resize Handles */}
          <div
            data-handle="true"
            onMouseDown={(e) => handleMouseDown(e, 'nw')}
            className="absolute -top-2 -left-2 w-4 h-4 rounded-full bg-blue-400 border-2 border-white shadow cursor-nwse-resize z-20"
          ></div>
          <div
            data-handle="true"
            onMouseDown={(e) => handleMouseDown(e, 'se')}
            className="absolute -bottom-2 -right-2 w-4 h-4 rounded-full bg-blue-400 border-2 border-white shadow cursor-nwse-resize z-20"
          ></div>
        </div>
      </div>

      {/* Preset Quick Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={() => setCrop({ x: 2, y: 5, w: 96, h: 40 })}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-900 border border-gray-800 text-gray-300 hover:text-white"
        >
          Preset: Top 40% (ID Barcode)
        </button>
        <button
          onClick={() => setCrop({ x: 2, y: 25, w: 96, h: 50 })}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-900 border border-gray-800 text-gray-300 hover:text-white"
        >
          Preset: Middle 50%
        </button>
        <button
          onClick={() => setCrop({ x: 0, y: 0, w: 100, h: 100 })}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-900 border border-gray-800 text-gray-300 hover:text-white"
        >
          Preset: Full 100%
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={executeCrop}
          className="py-2.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2"
        >
          <Crop className="w-4 h-4" /> Scan Custom Crop Box
        </button>
        <button
          onClick={onFullScan}
          className="py-2.5 px-4 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold border border-gray-700 transition-all flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5 text-blue-400" /> Auto Scan Full Image
        </button>
      </div>
    </div>
  );
};
