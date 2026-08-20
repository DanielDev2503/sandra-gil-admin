'use client';

import { useState } from 'react';
import SafeImage from './SafeImage';
import { Camera, Trash2, Upload, Loader2, ImageIcon, AlertCircle } from 'lucide-react';

const MAX_SIZE_BYTES = 3 * 1024 * 1024; // 3MB
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/jpg'];

interface ImageUploadProps {
  label: string;
  imageUrl?: string;
  isUploading?: boolean;
  onUpload: (file: File) => void;
  onDelete?: () => void;
  onError?: (message: string) => void;
  isPrimary?: boolean;
}

export default function ImageUpload({
  label,
  imageUrl,
  isUploading = false,
  onUpload,
  onDelete,
  onError,
  isPrimary = false,
}: ImageUploadProps) {
  const [localError, setLocalError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input to allow selecting the same file again if needed
    e.target.value = '';

    const fileType = (file.type || '').toLowerCase();
    if (!ALLOWED_MIME_TYPES.includes(fileType)) {
      const msg = `Formato no válido (${fileType || 'desconocido'}). Solo se aceptan imágenes WebP, PNG y JPG.`;
      setLocalError(msg);
      onError?.(msg);
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      const msg = `La imagen supera el límite de 3MB (${sizeMb} MB).`;
      setLocalError(msg);
      onError?.(msg);
      return;
    }

    onUpload(file);
  };

  return (
    <div className="relative group space-y-1">
      <label className="cursor-pointer block">
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/jpg"
          className="hidden"
          onChange={handleFileChange}
        />

        {imageUrl ? (
          <div className="relative aspect-square rounded-xl overflow-hidden border border-white/10 bg-white/5">
            <SafeImage
              src={imageUrl}
              alt={label}
              fill
              sizes="(max-width: 768px) 100vw, 25vw"
              className="object-cover"
              fallbackIcon={ImageIcon}
            />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
              <span
                className="p-2.5 bg-white/15 hover:bg-white/25 rounded-xl text-white transition-all backdrop-blur-sm"
                title="Reemplazar imagen"
              >
                <Camera className="w-4 h-4" />
              </span>
              {onDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="p-2.5 bg-red-500/20 hover:bg-red-500/40 rounded-xl text-red-300 transition-all backdrop-blur-sm"
                  title="Eliminar imagen"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <span
              className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-sm ${
                isPrimary
                  ? 'bg-[#e8b86d]/80 text-[#1a1a2e]'
                  : 'bg-white/20 text-white/80'
              }`}
            >
              {label}
            </span>
          </div>
        ) : (
          <div
            className={`aspect-square w-full rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all duration-200 ${
              isPrimary
                ? 'border-[#e8b86d]/30 hover:border-[#e8b86d]/60 hover:bg-[#e8b86d]/5'
                : 'border-white/10 hover:border-white/25 hover:bg-white/5'
            } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin text-[#e8b86d]" />
                <span className="text-xs text-slate-400">Subiendo...</span>
              </>
            ) : (
              <>
                {isPrimary ? (
                  <Camera className="w-6 h-6 text-[#e8b86d]/60" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-slate-600" />
                )}
                <span
                  className={`text-xs font-medium ${
                    isPrimary ? 'text-[#e8b86d]/60' : 'text-slate-600'
                  }`}
                >
                  {label}
                </span>
                <Upload className="w-3.5 h-3.5 text-slate-600" />
              </>
            )}
          </div>
        )}
      </label>

      {localError && (
        <div className="flex items-center gap-1.5 text-[11px] text-rose-400 font-medium px-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{localError}</span>
        </div>
      )}

      {isUploading && imageUrl && (
        <div className="absolute inset-0 bg-black/70 rounded-xl flex items-center justify-center pointer-events-none">
          <Loader2 className="w-6 h-6 animate-spin text-[#e8b86d]" />
        </div>
      )}
    </div>
  );
}
