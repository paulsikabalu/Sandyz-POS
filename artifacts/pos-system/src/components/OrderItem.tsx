import { CartItem } from '../store/usePosStore';

type OrderItemProps = {
  item: CartItem;
};

export function OrderItem({ item }: OrderItemProps) {
  const { product, quantity } = item;
  const lineTotal = product.price * quantity;

  return (
    <div
      className="flex items-center gap-2 py-2 w-full"
      data-testid={`order-item-${product.id}`}
    >
      <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop'; }}
        />
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-xs text-foreground truncate">{product.name}</h4>
        <div className="text-[10px] text-muted-foreground mt-0.5">K {Number(product.price).toFixed(2)}</div>
      </div>

      <div className="text-xs font-medium text-muted-foreground px-1">{quantity}x</div>

      <div className="text-xs font-bold text-primary ml-auto flex-shrink-0">
        K {lineTotal.toFixed(2)}
      </div>
    </div>
  );
}
