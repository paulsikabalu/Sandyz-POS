import { useRef, useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
import type { ApiOrder } from '../api/client';

interface ThermalReceiptProps {
  order: ApiOrder;
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  /** When true, triggers window.print() automatically after mount. */
  autoPrint?: boolean;
  /**
   * Called before printing — use this to open the cash drawer first.
   * If it rejects, the error is shown but printing still proceeds.
   */
  onBeforePrint?: () => Promise<void>;
  /**
   * When true, embed ESC/POS cash-drawer kick bytes in the print job
   * (for printers with a drawer connected via the RJ-11 port).
   */
  embedDrawerCmd?: boolean;
  /** Drawer pin for embedded ESC/POS mode (0 = pin 2, 1 = pin 5). */
  drawerPin?: 0 | 1;
  onClose?: () => void;
}

export function ThermalReceipt({
  order,
  storeName = 'SANDYZ Restaurant',
  storeAddress = 'Lusaka, Zambia',
  storePhone = '',
  autoPrint = false,
  onBeforePrint,
  embedDrawerCmd = false,
  drawerPin = 0,
  onClose,
}: ThermalReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [printing, setPrinting] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const autoPrintFired = useRef(false);

  const handlePrint = async () => {
    if (!receiptRef.current) return;
    setPrinting(true);
    setDrawerError(null);

    // ── 1. Open cash drawer (if configured) ─────────────────────────────
    if (onBeforePrint) {
      try {
        await onBeforePrint();
      } catch (err: any) {
        // Surface the error but don't block printing
        setDrawerError(err?.message ?? 'Could not open cash drawer');
      }
    }

    // ── 2. Build print container ─────────────────────────────────────────
    const existing = document.getElementById('thermal-print-root');
    if (existing) existing.remove();

    const printRoot = document.createElement('div');
    printRoot.id = 'thermal-print-root';

    // If the printer has the drawer connected via RJ-11, embed the ESC/POS
    // kick command as the very first bytes so the drawer opens before the
    // paper feed starts.
    if (embedDrawerCmd) {
      const cmdSpan = document.createElement('span');
      cmdSpan.className = 'drawer-cmd';
      // ESC p m t1 t2
      cmdSpan.textContent = `\x1b\x70${String.fromCharCode(drawerPin)}\x19\xfa`;
      printRoot.appendChild(cmdSpan);
    }

    printRoot.appendChild(receiptRef.current.cloneNode(true));
    document.body.appendChild(printRoot);

    window.print();

    setTimeout(() => {
      const el = document.getElementById('thermal-print-root');
      if (el) el.remove();
      setPrinting(false);
    }, 1000);
  };

  // Auto-print once after mount
  useEffect(() => {
    if (!autoPrint || autoPrintFired.current) return;
    autoPrintFired.current = true;
    // Small delay so the dialog finishes rendering
    const id = setTimeout(() => handlePrint(), 300);
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPrint]);

  const date = new Date(order.timestamp);
  const dateStr = date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const paymentLabel: Record<string, string> = {
    cash: 'Cash',
    card: 'Card',
    qr: 'QR / Mobile',
  };

  const isOffline = order.id.startsWith('offline_');

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Cash drawer error (non-blocking) */}
      {drawerError && (
        <div className="w-full text-center text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          ⚠ Cash drawer: {drawerError}
        </div>
      )}

      {/* On-screen preview */}
      <div
        ref={receiptRef}
        className="bg-white text-black font-mono text-[11px] leading-snug shadow-lg border border-gray-200 min-h-[350px]"
        style={{ width: '302px', padding: '16px 12px' }}
        id="receipt-preview"
      >
        {/* ── Header ── */}
        <div className="text-center mb-3">
          <div className="font-bold text-base tracking-widest uppercase">
            {storeName}
          </div>
          {storeAddress && (
            <div className="text-[10px] text-gray-600 mt-0.5">{storeAddress}</div>
          )}
          {storePhone && (
            <div className="text-[10px] text-gray-600">{storePhone}</div>
          )}
        </div>

        <Dashes />

        {/* ── Order metadata ── */}
        <div className="mb-2 space-y-0.5">
          <Row label="Order" value={order.orderNumber} />
          <Row label="Date" value={dateStr} />
          <Row label="Time" value={timeStr} />
          <Row label="Till" value={order.tableId} />
          <Row label="Type" value={capitalize(order.serviceType)} />
          {isOffline && (
            <div className="text-center text-[9px] text-gray-500 italic mt-1">
              (offline — pending sync)
            </div>
          )}
        </div>

        <Dashes />

        {/* ── Items ── */}
        <div className="mb-2">
          <div className="flex justify-between font-bold text-[10px] mb-1 uppercase tracking-wide">
            <span className="flex-1">Item</span>
            <span className="w-7 text-right">Qty</span>
            <span className="w-14 text-right">Price</span>
            <span className="w-14 text-right">Total</span>
          </div>
          {order.items.map((item, i) => (
            <div key={i} className="mb-1">
              <div className="flex justify-between items-start">
                <span
                  className="flex-1 pr-1 leading-tight"
                  style={{ wordBreak: 'break-word' }}
                >
                  {item.name}
                </span>
                <span className="w-7 text-right flex-shrink-0">{item.qty}</span>
                <span className="w-14 text-right flex-shrink-0">
                  {Number(item.price).toFixed(2)}
                </span>
                <span className="w-14 text-right flex-shrink-0 font-semibold">
                  {(Number(item.price) * item.qty).toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>

        <Dashes />

        {/* ── Totals ── */}
        <div className="mb-2 space-y-0.5">
          <Row label="Subtotal" value={`K ${Number(order.subtotal).toFixed(2)}`} />
          <Row label="Tax (5%)" value={`K ${Number(order.tax).toFixed(2)}`} />
        </div>

        <div className="flex justify-between font-bold text-sm border-t border-dashed border-black pt-1 mt-1 mb-2">
          <span>TOTAL</span>
          <span>K {Number(order.total).toFixed(2)}</span>
        </div>

        <Dashes />

        {/* ── Payment ── */}
        <div className="mb-3">
          <Row
            label="Payment"
            value={paymentLabel[order.paymentMethod] ?? capitalize(order.paymentMethod)}
          />
        </div>

        <Dashes />

        {/* ── Footer ── */}
        <div className="text-center mt-2 space-y-1">
          <p className="font-bold text-[10px] tracking-widest uppercase">
            Thank You!
          </p>
          <p className="text-[9px] text-gray-500">Please come again</p>
          <p className="text-[9px] text-gray-400 mt-1">
            {new Date().getFullYear()} © {storeName}
          </p>
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="flex gap-3">
        {onClose && (
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            Close
          </button>
        )}
        <button
          onClick={handlePrint}
          disabled={printing}
          className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          <Printer size={15} />
          {printing ? 'Printing…' : 'Print Receipt'}
        </button>
      </div>
    </div>
  );
}

/* ── Small helpers ─────────────────────────────────────────────────── */

function Dashes() {
  return (
    <div className="border-t border-dashed border-gray-400 my-2" />
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-600">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function capitalize(str: string) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}
