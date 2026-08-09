'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Package, ImageIcon } from 'lucide-react';

interface SafeImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  sizes?: string;
  className?: string;
  fallbackIcon?: React.ElementType;
}

export default function SafeImage({
  src,
  alt,
  width,
  height,
  fill,
  sizes,
  className = '',
  fallbackIcon: FallbackIcon = Package,
}: SafeImageProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (hasError || !src) {
    return (
      <div className={`flex items-center justify-center bg-white/5 text-slate-500 w-full h-full ${className}`}>
        <FallbackIcon className="w-5 h-5 text-slate-500" />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      fill={fill}
      sizes={sizes}
      unoptimized={true}
      className={className}
      onError={() => setHasError(true)}
    />
  );
}
