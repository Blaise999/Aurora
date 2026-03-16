'use client';
import { useState, useCallback, memo } from 'react';
import Image from 'next/image';
import { Play } from 'lucide-react';

const FALLBACK_GRADIENT =
  'linear-gradient(135deg, rgba(14,23,48,0.9) 0%, rgba(11,16,32,0.7) 50%, rgba(139,92,246,0.15) 100%)';

const NFTMedia = memo(function NFTMedia({
  src, alt = 'NFT', className = '', aspect = 'square',
  hasVideo = false, priority = false,
}) {
  const [errored, setErrored] = useState(false);
  const isGradient = src?.startsWith('linear-gradient') || src?.startsWith('radial-gradient');
  const showFallback = !src || errored;

  const isLocal = src?.startsWith('/pictures/') || src?.startsWith('/logo');
  const isRemote = src?.startsWith('http://') || src?.startsWith('https://');
  const useNextImage = !showFallback && !isGradient && (isLocal || isRemote);

  const aspectClasses = {
    square: 'aspect-square', portrait: 'aspect-[3/4]', wide: 'aspect-[4/3]',
  };

  const handleError = useCallback(() => { setErrored(true); }, []);

  return (
    <div className={`relative overflow-hidden bg-surface2 ${aspectClasses[aspect]} ${className}`}>
      {showFallback || isGradient ? (
        <div className="absolute inset-0" style={{ background: isGradient && !showFallback ? src : FALLBACK_GRADIENT }} />
      ) : useNextImage ? (
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          priority={priority}
          onError={handleError}
          unoptimized={src?.endsWith('.svg')}
        />
      ) : (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          onError={handleError}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
        />
      )}
      {hasVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="w-12 h-12 rounded-full glass flex items-center justify-center backdrop-blur-sm">
            <Play size={18} className="text-text ml-0.5" />
          </div>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/30 to-transparent" />
    </div>
  );
});

export default NFTMedia;
