import { motion } from 'framer-motion';
import { Minus, Plus, AlertTriangle } from 'lucide-react';
import { ApiProduct } from '../api/client';

type ProductCardProps = {
  product: ApiProduct;
  quantity: number;
  onAdd: () => void;
  onUpdateQuantity: (delta: number) => void;
};

export function ProductCard({ product, quantity, onAdd, onUpdateQuantity }: ProductCardProps) {
  const isOutOfStock = product.stock === 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;
  const atMax = quantity >= product.stock;

  return (
    <motion.div
      whileHover={{ y: -1 }}
      className={`bg-card border border-card-border rounded-2xl p-2 flex flex-col h-full shadow-sm ${isOutOfStock ? 'opacity-60' : ''}`}
      data-testid={`product-${product.id}`}
    >
      {/* Image container */}
      <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-muted mb-2">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop'; }}
        />
        {/* Stock badge */}
        <div className={`absolute top-1.5 right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm
          ${isOutOfStock ? 'bg-destructive text-white' : isLowStock ? 'bg-amber-500 text-white' : 'bg-black/40 text-white'}`}>
          {isOutOfStock ? 'Out' : `${product.stock} left`}
        </div>
      </div>

      <div className="flex-1 flex flex-col px-0.5">
        {/* Name */}
        <h3 className="font-bold text-foreground text-xs line-clamp-2 leading-tight mb-0.5">
          {product.name}
        </h3>

        {/* Low stock warning */}
        {isLowStock && (
          <div className="flex items-center gap-0.5 text-amber-600 text-[9px] font-medium mb-0.5">
            <AlertTriangle size={9} />
            Low stock
          </div>
        )}

        {/* Price */}
        <div className="text-primary font-bold text-xs mb-2">
          K {Number(product.price).toFixed(2)}
        </div>

        {/* Actions */}
        <div className="mt-auto">
          {isOutOfStock ? (
            <div className="w-full h-7 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive text-[10px] font-semibold flex items-center justify-center">
              Out of Stock
            </div>
          ) : quantity > 0 ? (
            <div className="flex items-center justify-between bg-sidebar-active rounded-lg px-1 h-7 border border-primary/20">
              <button
                data-testid={`btn-minus-${product.id}`}
                onClick={() => onUpdateQuantity(-1)}
                className="w-5 h-5 rounded-full flex items-center justify-center text-primary hover:bg-primary/10 transition-colors"
              >
                <Minus size={11} />
              </button>
              <span className="font-bold text-primary text-xs w-4 text-center">{quantity}</span>
              <button
                data-testid={`btn-plus-${product.id}`}
                onClick={() => onUpdateQuantity(1)}
                disabled={atMax}
                className="w-5 h-5 rounded-full flex items-center justify-center bg-primary text-primary-foreground shadow-sm hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                <Plus size={11} />
              </button>
            </div>
          ) : (
            <motion.button
              whileTap={{ scale: 0.95 }}
              data-testid={`btn-add-${product.id}`}
              onClick={onAdd}
              className="w-full h-7 rounded-lg border border-primary/30 text-primary font-semibold text-xs hover:bg-primary/5 transition-colors"
            >
              Add to Order
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
