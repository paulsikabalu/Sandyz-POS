import { useState } from 'react';
import { Pencil, Banknote, CreditCard, QrCode } from 'lucide-react';
import { Table, CartItem } from '../store/usePosStore';
import { OrderItem } from './OrderItem';
import { Checkout } from './Checkout';
import { motion, AnimatePresence } from 'framer-motion';

type OrderPanelProps = {
  table: Table | undefined;
  cart: CartItem[];
  serviceType: 'dine-in' | 'takeaway' | 'delivery';
  setServiceType: (
    type: 'dine-in' | 'takeaway' | 'delivery'
  ) => void;
  subtotal: number;
  tax: number;
  total: number;
  onPlaceOrder: (paymentMethod: string) => void;
  isPlacing?: boolean;
};

export function OrderPanel({
  table,
  cart,
  serviceType,
  setServiceType,
  subtotal,
  tax,
  total,
  onPlaceOrder,
  isPlacing,
}: OrderPanelProps) {
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  if (!table) return null;

  const handleOpenCheckout = () => {
    if (cart.length === 0) return;
    setCheckoutOpen(true);
  };

  return (
    <aside className="w-[280px] h-full bg-card border-l border-card-border flex flex-col flex-shrink-0 shadow-[-4px_0_24px_-16px_rgba(0,0,0,0.1)] z-10">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex justify-between items-start border-b border-border border-dashed">
        <div>
          <h2 className="text-base font-bold text-foreground">
            Till {table.number}
          </h2>
          <p className="text-muted-foreground text-xs font-medium mt-0.5">
            {cart.length} item{cart.length !== 1 ? 's' : ''}
          </p>
        </div>

        <button className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-muted/80 transition-colors">
          <Pencil size={13} />
        </button>
      </div>

      {/* Service Type Tabs */}
      <div className="px-4 py-3">
        <div className="flex bg-muted/50 p-1 rounded-xl">
          {[
            { id: 'dine-in', label: 'Dine In' },
            { id: 'takeaway', label: 'Take Away' },
            { id: 'delivery', label: 'Delivery' },
          ].map((type) => (
            <button
              key={type.id}
              onClick={() =>
                setServiceType(
                  type.id as 'dine-in' | 'takeaway' | 'delivery'
                )
              }
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                serviceType === type.id
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Order Items List */}
      <div className="flex-1 overflow-y-auto px-4 py-1">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 space-y-2">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Banknote size={20} />
            </div>
            <p className="text-xs">Cart is empty</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            <AnimatePresence initial={false}>
              {cart.map((item) => (
                <motion.div
                  key={item.product.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{
                    opacity: 0,
                    x: -20,
                    transition: { duration: 0.2 },
                  }}
                >
                  <OrderItem item={item} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Totals & Payment */}
      <div className="px-4 pt-3 pb-4 border-t border-border bg-card">
        {/* Totals */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-xs text-muted-foreground font-medium">
            <span>Sub Total</span>
            <span className="text-foreground">
              K {subtotal.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between text-xs text-muted-foreground font-medium border-b border-border border-dashed pb-2">
            <span>Tax (5%)</span>
            <span className="text-foreground">
              K {tax.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between text-sm font-bold text-foreground">
            <span>Total</span>
            <span className="text-primary">
              K {total.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Checkout Button */}
        <button
          data-testid="button-checkout"
          onClick={handleOpenCheckout}
          disabled={cart.length === 0 || isPlacing}
          className="w-full h-11 bg-primary text-primary-foreground font-bold text-sm rounded-xl shadow-sm shadow-primary/20 hover:opacity-95 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPlacing ? 'Placing…' : 'Checkout'}
        </button>
      </div>

      {/* Checkout modal with virtual keyboard */}
      <Checkout
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        table={table}
        cart={cart}
        subtotal={subtotal}
        tax={tax}
        total={total}
        onPlaceOrder={onPlaceOrder}
        isPlacing={isPlacing}
      />
    </aside>
  );
}
