import { useState, useEffect, useCallback } from 'react';
import {
    Banknote,
    CreditCard,
    QrCode,
    Delete,
    X,
    Check,
    ShieldCheck,
} from 'lucide-react';
import { CartItem, Table } from '../store/usePosStore';
import { Dialog, DialogContent } from './ui/dialog';
import { cn } from '@/lib/utils';

type CheckoutProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    table: Table | undefined;
    cart: CartItem[];
    subtotal: number;
    tax: number;
    total: number;
    onPlaceOrder: (paymentMethod: string) => void;
    isPlacing?: boolean;
};

type PaymentMethod = 'cash' | 'card' | 'qr';

const PAYMENT_METHODS: { id: PaymentMethod; icon: typeof Banknote; label: string }[] = [
    { id: 'cash', icon: Banknote, label: 'Cash' },
    { id: 'card', icon: CreditCard, label: 'Card' },
    { id: 'qr', icon: QrCode, label: 'QR Code' },
];

// Quick cash amounts for the "exact / round up" convenience
const QUICK_AMOUNTS = [20, 50, 100, 200, 500];

export function Checkout({
    open,
    onOpenChange,
    table,
    cart,
    subtotal,
    tax,
    total,
    onPlaceOrder,
    isPlacing,
}: CheckoutProps) {
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
    const [cashReceived, setCashReceived] = useState('');

    // Reset when the dialog opens
    useEffect(() => {
        if (open) {
            setCashReceived('');
            setPaymentMethod('cash');
        }
    }, [open]);

    const cashValue = parseFloat(cashReceived) || 0;
    const change = cashValue - total;
    const isShort = cashValue > 0 && cashValue < total;
    const canPay = paymentMethod !== 'cash' ? cart.length > 0 : cashValue >= total;

    const handleKey = useCallback((key: string) => {
        setCashReceived(prev => {
            // decimal point handling
            if (key === '.') {
                if (prev.includes('.')) return prev; // only one decimal point
                return prev === '' ? '0.' : prev + '.';
            }
            // prevent too many decimals
            if (prev.includes('.')) {
                const decimals = prev.split('.')[1] ?? '';
                if (decimals.length >= 2) return prev;
            }
            // avoid leading zeros
            if (prev === '0') return key;
            return (prev + key).slice(0, 9);
        });
    }, []);

    const handleBackspace = useCallback(() => {
        setCashReceived(prev => prev.slice(0, -1));
    }, []);

    const handleClear = useCallback(() => {
        setCashReceived('');
    }, []);

    const handleSetQuick = (amount: number) => {
        setCashReceived(String(amount));
    };

    const handlePay = () => {
        if (!canPay || isPlacing) return;
        onPlaceOrder(paymentMethod);
        onOpenChange(false);
    };

    const handleCancel = () => {
        if (isPlacing) return;
        onOpenChange(false);
    };

    const keypadKeys = [
        '1', '2', '3',
        '4', '5', '6',
        '7', '8', '9',
        '.', '0', 'del',
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden" showCloseButton={false}>
                <div className="flex h-[85vh] max-h-[800px]">
                    {/* ── Left: Order summary ─────────────────────────────── */}
                    <div className="flex-1 flex flex-col min-w-0 border-r border-border bg-card">
                        {/* Header */}
                        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-foreground">Checkout</h2>
                                <p className="text-xs text-muted-foreground font-medium mt-0.5">
                                    {table ? `Till ${table.number}` : 'Till'} · {cart.length} item{cart.length !== 1 ? 's' : ''}
                                </p>
</div>
                            <button
                                onClick={handleCancel}
                                className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:bg-muted/50 transition-colors"
                                aria-label="Close"
                            >
                                <X size={15} />
                            </button>
                        </div>

                        {/* Items */}
                        <div className="flex-1 overflow-y-auto px-5 py-3">
                            {cart.map(item => (
                                <div
                                    key={item.product.id}
                                    className="flex items-center gap-3 py-2.5 border-b border-border/50"
                                >
                                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                                        <img
                                            src={item.product.image}
                                            alt={item.product.name}
                                            className="w-full h-full object-cover"
                                            onError={e => {
                                                (e.target as HTMLImageElement).src =
                                                    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop';
                                            }}
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-xs text-foreground truncate">
                                            {item.product.name}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">
                                            K {Number(item.product.price).toFixed(2)} × {item.quantity}
                                        </p>
                                    </div>
                                    <div className="text-xs font-bold text-foreground flex-shrink-0">
                                        K {(item.product.price * item.quantity).toFixed(2)}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Totals */}
                        <div className="px-5 py-4 border-t border-border bg-card space-y-2">
                            <div className="flex justify-between text-xs text-muted-foreground font-medium">
                                <span>Sub Total</span>
                                <span className="text-foreground">K {subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground font-medium">
                                <span>Tax (5%)</span>
                                <span className="text-foreground">K {tax.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-border border-dashed text-base font-bold text-foreground">
                                <span>Total</span>
                                <span className="text-primary">K {total.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* ── Right: Payment + Keyboard ───────────────────────── */}
                    <div className="w-[340px] flex flex-col bg-background">
                        {/* Payment method */}
                        <div className="px-3 pt-2">
                            <div className="flex gap-1.5">
                                {PAYMENT_METHODS.map(method => {
                                    const Icon = method.icon;
                                    const active = paymentMethod === method.id;
                                    return (
                                        <button
                                            key={method.id}
                                            onClick={() => setPaymentMethod(method.id)}
                                            className={cn(
                                                'flex-1 h-11 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all',
                                                active
                                                    ? 'border-primary bg-sidebar-active text-primary ring-1 ring-primary/20'
                                                    : 'border-card-border bg-card text-muted-foreground hover:bg-muted/30 hover:border-border'
                                            )}
                                        >
                                            <Icon size={16} />
                                            <span className="text-[9px] font-semibold leading-none">
                                                {method.label}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Cash received display */}
                        <div className="px-4 pt-3">
                            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                Cash Received
                            </label>
                            <div className="mt-1 h-11 rounded-xl border border-border bg-card px-3 flex items-center justify-between">
                                <span className="text-muted-foreground font-bold text-xs">K</span>
                                <span className="text-xl font-extrabold text-foreground tabular-nums">
                                    {cashReceived === '' ? '0.00' : cashReceived}
                                </span>
                            </div>
                        </div>

                        {/* Quick amounts */}
                        <div className="px-4 pt-2 flex gap-1.5">
                            {QUICK_AMOUNTS.map(amount => (
                                <button
                                    key={amount}
                                    onClick={() => handleSetQuick(amount)}
                                    className="flex-1 h-7 rounded-lg border border-border bg-card text-[10px] font-bold text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
                                >
                                    K{amount}
                                </button>
                            ))}
                        </div>

                        {/* Change / shortfall */}
                        <div className="px-4 pt-2">
                            {paymentMethod === 'cash' ? (
                                <div
                                    className={cn(
                                        'flex items-center justify-between rounded-xl px-3 py-2 border',
                                        isShort
                                            ? 'bg-red-50 border-red-200 text-red-700'
                                            : change >= 0 && cashValue > 0
                                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                                : 'bg-muted/40 border border-border text-muted-foreground'
                                    )}
                                >
                                    <span className="text-[11px] font-semibold">
                                        {cashValue > 0 && isShort ? 'Insufficient' : 'Change'}
                                    </span>
                                    <span className="text-base font-extrabold tabular-nums">
                                        K {cashValue > 0 && !isShort ? change.toFixed(2) : '0.00'}
                                    </span>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center gap-2 rounded-xl px-3 py-2 bg-muted/40 border border-border text-muted-foreground">
                                    <ShieldCheck size={14} />
                                    <span className="text-[11px] font-semibold">
                                        Refer to payment terminal
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Keyboard */}
                        <div className="px-4 pt-2 pb-3">
                            <div className="grid grid-cols-3 gap-1.5">
                                {keypadKeys.map(key => {
                                    const isDel = key === 'del';
                                    const isDot = key === '.';
                                    return (
                                        <button
                                            key={key}
                                            onClick={() => (isDel ? handleBackspace() : handleKey(key))}
                                            className={cn(
                                                'h-11 rounded-lg text-lg font-bold transition-all active:scale-95 select-none',
                                                isDel
                                                    ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                                                    : isDot
                                                        ? 'bg-card border border-border text-foreground hover:bg-muted/40'
                                                        : 'bg-card border border-border text-foreground hover:bg-muted/40'
                                            )}
                                        >
                                            {key === 'del' ? <Delete size={18} className="mx-auto" /> : key}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Clear */}
                            <button
                                onClick={handleClear}
                                className="mt-1.5 w-full h-8 rounded-lg border border-border bg-card text-muted-foreground text-[11px] font-bold hover:bg-muted/40 transition-colors"
                            >
                                Clear
                            </button>
                        </div>

                        {/* Actions */}
                        <div className="px-4 pb-3 flex gap-2 border-t border-border bg-background sticky bottom-0">
                            <button
                                onClick={handleCancel}
                                disabled={isPlacing}
                                className="flex-1 h-11 rounded-xl border border-border bg-card text-foreground font-bold text-xs hover:bg-muted/40 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlePay}
                                disabled={!canPay || isPlacing}
                                className="flex-[1.4] h-11 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                            >
                                <Check size={15} />
                                {isPlacing ? 'Processing…' : `Pay K ${total.toFixed(2)}`}
                            </button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
