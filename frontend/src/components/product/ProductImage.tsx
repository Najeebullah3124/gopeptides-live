import { useState } from 'react';
import { Vial } from './Vial';
import { productImage, resolveImageUrl } from '@/utils/helpers';
import type { Product } from '@/types/product';

interface ProductImageProps {
  product: Pick<Product, 'images' | 'name' | 'categoryId'>;
  className?: string;
  size?: number;
  src?: string;
}

function colorFor(name: string): string {
  const colors = ['#5CC0BE', '#7BD3D1', '#4FAFAD', '#A8E6E4'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i)) % colors.length;
  return colors[h];
}

export function ProductImage({ product, className = '', size = 200, src }: ProductImageProps) {
  const url = src ? resolveImageUrl(src) : productImage(product as Product);
  const [errored, setErrored] = useState(false);
  const [prevUrl, setPrevUrl] = useState<string | null>(url);

  if (url !== prevUrl) {
    setPrevUrl(url);
    setErrored(false);
  }

  if (url && !errored) {
    return (
      <img
        src={url}
        alt={product.name}
        loading="lazy"
        decoding="async"
        width={size}
        height={size}
        onError={() => setErrored(true)}
        className={`w-full h-full object-contain ${className}`}
      />
    );
  }
  return (
    <div className={`flex items-center justify-center w-full h-full ${className}`}>
      <Vial color={colorFor(product.name)} size={size} />
    </div>
  );
}
