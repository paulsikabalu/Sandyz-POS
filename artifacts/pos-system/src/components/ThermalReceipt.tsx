import { useRef } from 'react';
import { Printer } from 'lucide-react';
import type { ApiOrder } from '../api/client';

interface ThermalReceiptProps {
  order: ApiOrder;
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  onClose?: () => void;
}

export function ThermalReceipt({
  order,
  storeName = 'SANDYZ Restaurant',
  storeAddress = 'Lusaka, Zambia',
  storePhone = '',
  onClose,
}: ThermalReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    // Clone the receipt node into a hidden print container
    if (!receiptRef.current) return;

    // Remove any existing print container
    const existing = document.getElementById('thermal-print-root');
    if (existing) existing.remove();

    const printRoot = document.createElement('div');
    printRoot.id = 'thermal-print-root';
    printRoot.appendChild(receiptRef.current.cloneNode(true));
    document.body.appendChild(printRoot);

    window.print();

    // Clean up after print dialog closes
    setTimeout(() => {
      const el = document.getElementById('thermal-print-root');
      if (el) el.remove();
    }, 1000);
  };

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
    <div className="flex flex-col items-center gap-4 ">
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
          className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Printer size={15} />
          Print Receipt
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
