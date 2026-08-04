import { useState, useEffect } from 'react';
import { usePosStore, DEMO_TABLES } from '../store/usePosStore';
import { Topbar } from '../components/Topbar';
import { CenterPanel } from '../components/CenterPanel';
import { OrderPanel } from '../components/OrderPanel';
import { ThermalReceipt } from '../components/ThermalReceipt';
import { SyncFailurePanel } from '../components/SyncFailurePanel';
import { useToast } from '@/hooks/use-toast';
import { WifiOff, RefreshCw, CloudOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ApiOrder } from '../api/client';
import { getCashDrawerSettings, openCashDrawer } from '../lib/cashDrawer';
import { useSyncStatus } from '../lib/sync';

export default function Pos() {
  const {
    products,
    productsLoading,
    loadProducts,
    tables,
    activeTableId,
    setActiveTableId,
    serviceType,
    setServiceType,
    getCart,
    addToCart,
    updateQuantity,
    completeOrder,
    subtotal,
    tax,
    total,
    isOnline,
  } = usePosStore();

  const {
    status: syncStatus,
    failedMutations,
    retryMutation,
    discardMutation,
    retryAll,
    discardAll,
  } = useSyncStatus();

  const [isPlacing, setIsPlacing] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState<ApiOrder | null>(null);
  const { toast } = useToast();
  const [showSyncToast, setShowSyncToast] = useState(false);

  const activeTable = DEMO_TABLES.find(t => t.id === activeTableId);
  const activeCart = getCart(activeTableId);

  const getCartQuantity = (productId: string) => {
    const item = activeCart.find(i => i.product.id === productId);
    return item ? item.quantity : 0;
  };

  const handleAdd = (product: any) => addToCart(activeTableId, product);

  const handleUpdateQuantity = (productId: string, delta: number) => {
    updateQuantity(activeTableId, productId, delta);
  };

  const handlePlaceOrder = async (paymentMethod: string) => {
    setIsPlacing(true);
    try {
      const order = await completeOrder(activeTableId, paymentMethod);
      if (order) {
        const isOfflineOrder = order.id.startsWith('offline_');
        setReceiptOrder(order);
        toast({
          title: isOfflineOrder ? '📦 Order Queued!' : '✅ Order Placed!',
          description: isOfflineOrder
            ? `Order saved offline — will sync when network is available`
            : `Order ${order.orderNumber} placed — K ${Number(order.total).toFixed(2)}`,
          duration: 4000,
        });
      }
    } catch (err: any) {
      toast({
        title: 'Order Failed',
        description: err?.message ?? 'Could not place order',
        variant: 'destructive',
        duration: 4000,
      });
    } finally {
      setIsPlacing(false);
    }
  };

  /** Open cash drawer before printing receipt (cash payments only). */
  const handleBeforePrint = async () => {
    if (!receiptOrder || receiptOrder.paymentMethod !== 'cash') return;
    const drawerSettings = getCashDrawerSettings();
    if (!drawerSettings.enabled) return;
    await openCashDrawer(drawerSettings);
  };

  // Show a brief toast when background sync starts
  useEffect(() => {
    if (syncStatus === 'syncing' && !showSyncToast) {
      setShowSyncToast(true);
      toast({ title: '🔄 Syncing…', description: 'Background sync in progress', duration: 2000 });
    }
    if (syncStatus === 'idle' && showSyncToast) {
      setShowSyncToast(false);
    }
  }, [syncStatus, showSyncToast, toast]);

  const drawerSettings = receiptOrder ? getCashDrawerSettings() : null;
  const isCashPayment = receiptOrder?.paymentMethod === 'cash';

  return (
    <div className="h-[100dvh] w-full bg-background flex flex-col overflow-hidden text-foreground selection:bg-primary/30">
      <Topbar />

      <div className="flex-1 flex overflow-hidden">
        <CenterPanel
          tables={tables}
          activeTableId={activeTableId}
          onSelectTable={setActiveTableId}
          getCartQuantity={getCartQuantity}
          onAdd={handleAdd}
          onUpdateQuantity={handleUpdateQuantity}
          products={products}
          productsLoading={productsLoading}
          onRefresh={loadProducts}
        />
        <OrderPanel
          table={activeTable}
          cart={activeCart}
          serviceType={serviceType}
          setServiceType={setServiceType}
          subtotal={subtotal}
          tax={tax}
          total={total}
          onPlaceOrder={handlePlaceOrder}
          isPlacing={isPlacing}
        />
      </div>

      {/* ── Sync status banners ── */}
      {!isOnline && (
        <div className="flex-shrink-0 flex items-center gap-2 px-4 py-1.5 bg-amber-50 border-t border-amber-200 text-amber-700 text-xs font-medium">
          <WifiOff size={13} />
          <span>You are offline — data will sync when connection is restored</span>
        </div>
      )}
      {syncStatus === 'syncing' && isOnline && (
        <div className="flex-shrink-0 flex items-center gap-2 px-4 py-1.5 bg-blue-50 border-t border-blue-200 text-blue-700 text-xs font-medium">
          <RefreshCw size={13} className="animate-spin" />
          <span>Syncing data in background…</span>
        </div>
      )}
      {syncStatus === 'error' && isOnline && failedMutations.length === 0 && (
        <div className="flex-shrink-0 flex items-center gap-2 px-4 py-1.5 bg-red-50 border-t border-red-200 text-red-700 text-xs font-medium">
          <CloudOff size={13} />
          <span>Sync failed — will retry automatically</span>
        </div>
      )}

      {/* ── Failed mutations panel ── */}
      <SyncFailurePanel
        mutations={failedMutations}
        onRetry={retryMutation}
        onDiscard={discardMutation}
        onRetryAll={retryAll}
        onDiscardAll={discardAll}
      />

      {/* ── Receipt dialog ── */}
      <Dialog open={!!receiptOrder} onOpenChange={open => { if (!open) setReceiptOrder(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Receipt</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center overflow-y-auto max-h-[80vh] py-2">
            {receiptOrder && (
              <ThermalReceipt
                key={receiptOrder.id}
                order={receiptOrder}
                autoPrint
                onBeforePrint={
                  isCashPayment && drawerSettings?.enabled && drawerSettings.interface === 'network'
                    ? handleBeforePrint
                    : undefined
                }
                embedDrawerCmd={
                  isCashPayment && !!drawerSettings?.enabled && drawerSettings.interface === 'print'
                }
                drawerPin={drawerSettings?.pin ?? 0}
                onClose={() => setReceiptOrder(null)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
