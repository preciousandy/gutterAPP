export function formatNaira(amount: number | null | undefined, decimals = 0): string {
  if (amount == null || Number.isNaN(amount)) return '₦—';
  return `₦${amount.toLocaleString('en-NG', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function formatNairaCompact(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) return '₦—';
  if (Math.abs(amount) >= 1_000_000) {
    return `₦${(amount / 1_000_000).toLocaleString('en-NG', { maximumFractionDigits: 2 })}M`;
  }
  if (Math.abs(amount) >= 1_000) {
    return `₦${(amount / 1_000).toLocaleString('en-NG', { maximumFractionDigits: 0 })}k`;
  }
  return formatNaira(amount);
}

export function formatUsd(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) return '$—';
  return `$${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatCrypto(amount: number | null | undefined, maxDecimals = 6): string {
  if (amount == null || Number.isNaN(amount)) return '—';
  return amount.toLocaleString('en-US', { maximumFractionDigits: maxDecimals });
}

export function formatSigned(amount: number, currency: 'NGN' | 'USD' = 'NGN'): string {
  const abs = currency === 'NGN' ? formatNaira(Math.abs(amount)) : formatUsd(Math.abs(amount));
  return `${amount < 0 ? '−' : '+'}${abs}`;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function dayGroupLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Earlier';
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (same(d, today)) return 'Today';
  if (same(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long' });
}

/** mm:ss countdown between now and an ISO timestamp (never negative). */
export function countdownTo(iso: string, now: number = Date.now()): string {
  const remaining = Math.max(0, Math.floor((new Date(iso).getTime() - now) / 1000));
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function initials(...names: (string | null | undefined)[]): string {
  return names
    .filter(Boolean)
    .map((n) => (n as string).trim()[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
