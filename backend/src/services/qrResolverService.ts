interface QrResolverInput {
  qrMode: string;
  manualQrUrl: string | null;
  csvQrUrl: string | null;
  productSlug: string;
  clientUrl: string;
}

function normalizeClientUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

export function resolveQrUrl(input: QrResolverInput): string {
  const mode = (input.qrMode || 'auto').toLowerCase();
  if (mode === 'none') return '';

  const autoUrl = `${normalizeClientUrl(input.clientUrl)}/${input.productSlug}`;

  if (mode === 'manual' && input.manualQrUrl?.trim()) {
    return input.manualQrUrl.trim();
  }

  if (mode === 'csv' && input.csvQrUrl?.trim()) {
    return input.csvQrUrl.trim();
  }

  return autoUrl;
}

