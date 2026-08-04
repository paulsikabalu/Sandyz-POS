export type CashDrawerInterface = 'network' | 'print';

export type CashDrawerSettings = {
  enabled: boolean;
  interface: CashDrawerInterface;
  ip: string;
  port: number;
  pin: 0 | 1;
};

const STORAGE_KEY = 'sandyz_cash_drawer';

const DEFAULTS: CashDrawerSettings = {
  enabled: false,
  interface: 'network',
  ip: '',
  port: 9100,
  pin: 0,
};

export function getCashDrawerSettings(): CashDrawerSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveCashDrawerSettings(settings: CashDrawerSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

/**
 * Open the cash drawer by sending an ESC/POS kick command to the
 * configured network printer via the API server.
 */
export async function openCashDrawer(settings: CashDrawerSettings): Promise<void> {
  if (!settings.enabled) return;

  if (settings.interface === 'network') {
    if (!settings.ip) throw new Error('Cash drawer IP address is not configured');
    const token = localStorage.getItem('sandyz_pos_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/cash-drawer/open', {
      method: 'POST',
      headers,
      body: JSON.stringify({ ip: settings.ip, port: settings.port, pin: settings.pin }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as any).message ?? `Cash drawer open failed (${res.status})`);
    }
  }
  // 'print' mode: the ESC/POS bytes are embedded in the print job by ThermalReceipt
}
