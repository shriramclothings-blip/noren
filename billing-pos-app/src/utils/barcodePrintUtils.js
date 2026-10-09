import { generateSizeBarcode } from './variantUtils';

export const buildSizeWiseBarcodeItems = (products = [], variants = []) => {
  const productMap = new Map(products.map((product) => [product.id, product]));

  return variants
    .map((variant) => {
      const product = productMap.get(variant.productId);
      if (!product) return null;

      return {
        id: `variant-${variant.id}`,
        productId: variant.productId,
        variantId: variant.id,
        name: `${product.name} (${variant.label})`,
        productName: product.name,
        sizeLabel: variant.label,
        barcode: variant.barcode || generateSizeBarcode(product.barcode || product.sku || product.id, variant.label || variant.name || '') || product.barcode,
        sku: variant.sku || product.sku,
        price: variant.price ?? product.price ?? 0,
        costPrice: variant.costPrice ?? product.costPrice ?? 0,
        stock: variant.stock ?? 0,
      };
    })
    .filter(Boolean);
};
