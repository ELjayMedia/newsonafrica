export function generateBlurDataURL(width: number, height: number): string {
  // Use a smaller, more efficient SVG
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <filter id="b" color-interpolation-filters="sRGB">
        <feGaussianBlur stdDeviation="20"/>
      </filter>
      <rect width="100%" height="100%" fill="#EEEEEE"/>
      <rect width="100%" height="100%" fill="#EEEEEE" filter="url(#b)"/>
    </svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

// Optimized image loading utility
export function getImageProps(src: string, width: number, height: number) {
  return {
    src,
    blurDataURL: generateBlurDataURL(width, height),
    placeholder: 'blur',
    loading: 'lazy',
  };
}

/**
 * Formats an image path to ensure it's properly referenced
 * @param path The image path
 * @returns Properly formatted image path
 */
export function formatImagePath(path: string): string {
  // If the path already starts with http/https, it's an external URL
  if (path.startsWith('http')) {
    return path;
  }

  // Remove any '/public' prefix if it exists
  if (path.startsWith('/public/')) {
    return path.replace('/public', '');
  }

  // Ensure the path starts with a slash
  if (!path.startsWith('/')) {
    return `/${path}`;
  }

  return path;
}

/**
 * Creates a responsive image srcSet for different viewport sizes
 * @param basePath Base path of the image
 * @param sizes Array of sizes to generate
 * @returns Object with srcSet and sizes strings
 */
export function createResponsiveSrcSet(
  basePath: string,
  sizes: number[] = [640, 750, 828, 1080, 1200, 1920],
): { srcSet: string; sizes: string } {
  // Only works for images that support size parameters
  if (!basePath.includes('?') && !basePath.includes('placeholder')) {
    return {
      srcSet: '',
      sizes: '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
    };
  }

  const srcSet = sizes.map((size) => `${basePath}&w=${size} ${size}w`).join(', ');

  return {
    srcSet,
    sizes: '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  };
}

export { lazyLoadComponent, lazyLoadSkeleton } from './lazy-load-client';
