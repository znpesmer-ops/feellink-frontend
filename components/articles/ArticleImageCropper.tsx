'use client'

import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { Area } from 'react-easy-crop'
import getCroppedImg from '@/utils/cropImage'

interface ArticleImageCropperProps {
  image: string
  onCropDone: (croppedBlob: Blob) => void
  onCancel: () => void
}

export default function ArticleImageCropper({ image, onCropDone, onCancel }: ArticleImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const aspect = 16 / 8 // 2:1 (16:8) zorunlu oran

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleCropDone = async () => {
    if (!croppedAreaPixels) {
      return
    }

    setIsProcessing(true)
    try {
      const croppedBlob = await getCroppedImg(image, croppedAreaPixels)
      onCropDone(croppedBlob)
    } catch (error) {
      console.error('Crop error:', error)
      alert('Görsel kırpılırken bir hata oluştu')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
      <div className="bg-[#0d0d10] dark:bg-gray-900 rounded-xl w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-white">Kapak Görselini Kırp</h2>
          <p className="text-sm text-gray-400 mt-1">16:8 (2:1) oranında kırpın</p>
        </div>

        {/* Cropper Container */}
        <div className="flex-1 relative bg-black">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            cropShape="rect"
            showGrid={true}
          />
        </div>

        {/* Controls */}
        <div className="px-6 py-4 border-t border-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-400">Zoom</span>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-32 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-brand-orange"
            />
            <span className="text-sm text-gray-400">{Math.round(zoom * 100)}%</span>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onCancel}
              disabled={isProcessing}
              className="px-5 py-2.5 rounded-lg bg-gray-700 dark:bg-gray-800 text-white hover:bg-gray-600 dark:hover:bg-gray-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              İptal
            </button>
            <button
              onClick={handleCropDone}
              disabled={isProcessing || !croppedAreaPixels}
              className="px-5 py-2.5 rounded-lg bg-brand-orange hover:bg-[#e67a00] text-white transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'İşleniyor...' : 'Kaydet'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

