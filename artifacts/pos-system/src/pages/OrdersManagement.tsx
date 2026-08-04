import { useState, useEffect, useCallback } from 'react';
import { Topbar } from '../components/Topbar';
import { reportsApi, type PaginatedOrders, type ApiOrder } from '../api/client';
import { ThermalReceipt } from '../components/ThermalReceipt';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  RefreshCw,
  Search,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  Banknote,
  CreditCard,
  QrCode,
  Printer,
} from 'lucide-react';

const PAYMENT_ICONS: Record<string, React.ReactNode> = {
  cash: <Banknote size={14} />,
  card: <CreditCard size={14} />,
  qr: <QrCode size={14} />,
};

export default function OrdersManagement() {
  const [data, setData] = useState<PaginatedOrders | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<ApiOrder | null>(null);
  const { toast } = useToast();

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const result = await reportsApi.orders(p, 20);
      setData(result);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.message ?? 'Failed to load orders',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load(page);
  }, [page, load]);

  const orders = data?.orders ?? [];
  const pagination = data?.pagination;

  const filtered = search
    ? orders.filter(o =>
        o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
        o.tableId.toLowerCase().includes(search.toLowerCase())
      )
    : orders;

  return (
    <div className="h-[100dvh] w-full bg-background flex flex-col overflow-hidden text-foreground">
      <Topbar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 px-6 pt-5 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-foreground">Orders Management</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {pagination ? `${pagination.total} total orders` : 'Loading…'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => load(page)}
                className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-muted/50"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mt-4">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by order number or table…"
              className="w-72 h-8 bg-card border border-border rounded-full pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Orders List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && !data ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground gap-2">
              <RefreshCw size={20} className="animate-spin opacity-40" />
              <span className="text-sm">Loading orders…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
              <ShoppingBag size={32} className="opacity-20" />
              <p className="text-sm">No orders found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(order => (
                <div
                  key={order.id}
                  className="border border-border rounded-xl overflow-hidden bg-card"
                >
                  {/* Order header */}
                  <button
                    onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                    className="w-full flex items-center justify-between p-3 hover:bg-muted/20 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        #{order.orderNumber.replace('#', '').slice(-4)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{order.orderNumber}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(order.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span>Table: {order.tableId}</span>
                          <span>•</span>
                          <span className="capitalize">{order.serviceType}</span>
                          <span>•</span>
                          <span className="capitalize flex items-center gap-1">
                            {PAYMENT_ICONS[order.paymentMethod] ?? null}
                            {order.paymentMethod}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-foreground">K {Number(order.total).toFixed(2)}</div>
                      <div className="text-[10px] text-muted-foreground">{order.items.length} items</div>
                    </div>
                  </button>

                  {/* Expanded items */}
                  {expandedOrder === order.id && (
                    <div className="px-3 pb-3 border-t border-border/50">
                      <table className="w-full text-xs mt-2">
                        <thead>
                          <tr className="border-b border-border/30">
                            <th className="text-left py-1.5 pr-2 text-muted-foreground font-semibold">Item</th>
                            <th className="text-right py-1.5 pr-2 text-muted-foreground font-semibold">Qty</th>
                            <th className="text-right py-1.5 text-muted-foreground font-semibold">Price</th>
                            <th className="text-right py-1.5 text-muted-foreground font-semibold">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {order.items.map((item, idx) => (
                            <tr key={idx} className="border-b border-border/20">
                              <td className="py-1.5 pr-2 font-medium text-foreground">{item.name}</td>
                              <td className="py-1.5 pr-2 text-right">{item.qty}</td>
                              <td className="py-1.5 pr-2 text-right">K {Number(item.price).toFixed(2)}</td>
                              <td className="py-1.5 text-right font-bold">K {(Number(item.price) * item.qty).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan={3} className="text-right py-1.5 pr-2 text-xs text-muted-foreground">Subtotal</td>
                            <td className="text-right py-1.5 font-bold">K {Number(order.subtotal).toFixed(2)}</td>
                          </tr>
                          <tr>
                            <td colSpan={3} className="text-right py-1.5 pr-2 text-xs text-muted-foreground">Tax (5%)</td>
                            <td className="text-right py-1.5 font-bold">K {Number(order.tax).toFixed(2)}</td>
                          </tr>
                          <tr className="border-t border-border/30">
                            <td colSpan={3} className="text-right py-1.5 pr-2 text-xs font-bold text-foreground">Total</td>
                            <td className="text-right py-1.5 font-bold text-primary">K {Number(order.total).toFixed(2)}</td>
                          </tr>
                        </tfoot>
                      </table>

                      {/* Print button */}
                      <div className="mt-3 flex justify-end">
                        <button
                          onClick={() => setReceiptOrder(order)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                        >
                          <Printer size={13} />
                          Print Receipt
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex-shrink-0 px-6 py-3 border-t border-border bg-card flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} orders)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={!pagination.hasPrev}
                className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted/50 disabled:opacity-30"
              >
                <ChevronLeft size={13} />
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={!pagination.hasNext}
                className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted/50 disabled:opacity-30"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Receipt dialog */}
      <Dialog open={!!receiptOrder} onOpenChange={open => { if (!open) setReceiptOrder(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Receipt Preview</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center overflow-y-auto max-h-[80vh] py-2">
            {receiptOrder && (
              <ThermalReceipt
                order={receiptOrder}
                onClose={() => setReceiptOrder(null)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
