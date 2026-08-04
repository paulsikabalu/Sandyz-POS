import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, SlidersHorizontal, RefreshCw, ChevronDown, Scan } from 'lucide-react';
import { ProductCard } from './ProductCard';
import { ActiveOrdersBar } from './ActiveOrdersBar';
import { Table } from '../store/usePosStore';
import { useCategories } from '../store/useCategoriesStore';
import { ApiProduct } from '../api/client';

type CenterPanelProps = {
  tables: Table[];
  activeTableId: string;
  onSelectTable: (id: string) => void;
  getCartQuantity: (productId: string) => number;
  onAdd: (product: ApiProduct) => void;
  onUpdateQuantity: (productId: string, delta: number) => void;
  products?: ApiProduct[];
  productsLoading: boolean;
  onRefresh: () => void;
};

// Section accent colours
const SECTION_COLORS: Record<string, { pill: string; active: string }> = {
  'All':               { pill: 'bg-primary text-primary-foreground',            active: 'border-primary text-primary bg-primary/5' },
  'Bakery':            { pill: 'bg-amber-500 text-white',                        active: 'border-amber-500 text-amber-700 bg-amber-50' },
  'Fast Food':         { pill: 'bg-orange-500 text-white',                       active: 'border-orange-500 text-orange-700 bg-orange-50' },
  'Snacks & Pastries': { pill: 'bg-yellow-500 text-white',                       active: 'border-yellow-500 text-yellow-700 bg-yellow-50' },
  'Drinks':            { pill: 'bg-sky-500 text-white',                          active: 'border-sky-500 text-sky-700 bg-sky-50' },
};

const CATEGORY_ICONS: Record<string, string> = {
  'Bread': '🍞', 'Shawarma': '🌯', 'Samosa': '🥟', 'Dondos': '🍖',
  'Soft Drinks': '🥤', 'Water': '💧', 'Juices': '🧃', 'Energy Drinks': '⚡',
};

type ScanFeedback = 'added' | 'notfound' | null;

export function CenterPanel({
  tables,
  activeTableId,
  onSelectTable,
  getCartQuantity,
  onAdd,
  onUpdateQuantity,
  products = [],
  productsLoading,
  onRefresh,
}: CenterPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState('All');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [scanFeedback, setScanFeedback] = useState<ScanFeedback>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dynamic sections/subcategories from category management
  const { sections: SECTIONS, sectionCategories: SECTION_CATEGORIES } = useCategories();

  // Auto-focus search on mount so barcode scans go straight to the input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Global keydown: redirect typing to search when no other interactive
  // element is focused — lets cashiers scan without clicking first.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName ?? '';
      const isEditable =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        (document.activeElement as HTMLElement)?.isContentEditable;
      if (!isEditable && e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const showFeedback = useCallback((type: ScanFeedback) => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    setScanFeedback(type);
    feedbackTimer.current = setTimeout(() => setScanFeedback(null), 1200);
  }, []);

  // When section changes, reset subcategory
  const handleSectionClick = (section: string) => {
    setActiveSection(section);
    setActiveCategory(null);
  };

  // Filter products — match on name OR exact product ID (for barcode scans)
  const filtered = products.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      p.name.toLowerCase().includes(q) ||
      (q.length > 0 && p.id.toLowerCase() === q);
    const matchSection = activeSection === 'All' || p.section === activeSection;
    const matchCat = !activeCategory || p.category === activeCategory;
    return matchSearch && matchSection && matchCat;
  });

  /**
   * Handle Enter on the search input.
   * Barcode scanners type the full code and press Enter automatically.
   * If exactly one product matches → add it to cart and clear the query.
   */
  const handleSearchEnter = useCallback(() => {
    if (!searchQuery.trim()) return;

    // Prefer an exact ID match (barcode = product ID)
    const exactId = products.find(
      p => p.id.toLowerCase() === searchQuery.trim().toLowerCase()
    );
    const target = exactId ?? (filtered.length === 1 ? filtered[0] : null);

    if (target) {
      onAdd(target);
      setSearchQuery('');
      showFeedback('added');
    } else if (filtered.length === 0) {
      showFeedback('notfound');
    }
    // If multiple match: keep the results visible so cashier can choose
  }, [searchQuery, products, filtered, onAdd, showFeedback]);

  // Subcategories for the current section
  const subCategories = activeSection === 'All' ? [] : SECTION_CATEGORIES[activeSection] ?? [];

  // Group filtered products by section then category (All view, no search)
  const grouped: { section: string; category: string; items: ApiProduct[] }[] = [];
  if (activeSection === 'All' && !searchQuery) {
    for (const section of SECTIONS.filter(s => s !== 'All')) {
      const cats = SECTION_CATEGORIES[section] ?? [];
      for (const cat of cats) {
        const items = filtered.filter(p => p.section === section && p.category === cat);
        if (items.length) grouped.push({ section, category: cat, items });
      }
    }
  }
  const useGrouped = grouped.length > 0;

  const sectionColors = SECTION_COLORS[activeSection] ?? SECTION_COLORS['All'];

  // Derive search input ring colour from scan feedback
  const inputRing =
    scanFeedback === 'added'
      ? 'ring-2 ring-green-500 border-green-400'
      : scanFeedback === 'notfound'
      ? 'ring-2 ring-red-400 border-red-300'
      : 'focus:ring-2 focus:ring-primary focus:border-transparent';

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden relative">

      {/* Search / barcode bar */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            {/* Icon: scanner beam when feedback active, otherwise magnifier */}
            <div className={`absolute inset-y-0 left-3 flex items-center pointer-events-none transition-colors ${
              scanFeedback === 'added'
                ? 'text-green-500'
                : scanFeedback === 'notfound'
                ? 'text-red-400'
                : 'text-muted-foreground'
            }`}>
              {scanFeedback ? <Scan size={14} /> : <Search size={14} />}
            </div>

            <input
              ref={inputRef}
              type="search"
              data-testid="input-search"
              placeholder="Search or scan barcode…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearchEnter();
                }
              }}
              className={`w-full h-8 bg-card border border-border rounded-full pl-8 pr-3 text-xs font-medium outline-none transition-all placeholder:text-muted-foreground ${inputRing}`}
            />

            {/* Inline feedback label */}
            {scanFeedback && (
              <div className={`absolute inset-y-0 right-3 flex items-center pointer-events-none text-[10px] font-bold ${
                scanFeedback === 'added' ? 'text-green-600' : 'text-red-500'
              }`}>
                {scanFeedback === 'added' ? '✓ Added' : 'Not found'}
              </div>
            )}
          </div>

          <button
            onClick={onRefresh}
            title="Refresh"
            className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            <RefreshCw size={14} className={productsLoading ? 'animate-spin' : ''} />
          </button>
          <button className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:bg-muted/50 transition-colors">
            <SlidersHorizontal size={14} />
          </button>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex-shrink-0 px-4 pb-2 overflow-x-auto scrollbar-hide flex gap-2">
        {SECTIONS.map(section => {
          const isActive = activeSection === section;
          const colors = SECTION_COLORS[section] ?? SECTION_COLORS['All'];
          const count = section === 'All' ? products.length : products.filter(p => p.section === section).length;
          return (
            <button
              key={section}
              onClick={() => handleSectionClick(section)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 h-7 rounded-full text-xs font-semibold transition-all border ${
                isActive
                  ? colors.pill + ' border-transparent shadow-sm'
                  : 'bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
              }`}
            >
              {section}
              <span className={`text-[10px] font-bold px-1 rounded ${isActive ? 'bg-white/20' : 'bg-muted text-muted-foreground'}`}>
                {count}
              </span>
              {section !== 'All' && subCategories.length > 0 && isActive && (
                <ChevronDown size={11} />
              )}
            </button>
          );
        })}
      </div>

      {/* Subcategory pills */}
      {subCategories.length > 0 && (
        <div className="flex-shrink-0 px-4 pb-3 overflow-x-auto scrollbar-hide flex gap-1.5">
          <button
            onClick={() => setActiveCategory(null)}
            className={`flex-shrink-0 flex items-center gap-1 px-2.5 h-6 rounded-full text-[11px] font-semibold transition-all border ${
              !activeCategory
                ? sectionColors.active + ' border-current'
                : 'bg-card border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            All {activeSection}
          </button>
          {subCategories.map(cat => {
            const isActive = activeCategory === cat;
            const count = products.filter(p => p.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 flex items-center gap-1 px-2.5 h-6 rounded-full text-[11px] font-semibold transition-all border ${
                  isActive
                    ? sectionColors.active + ' border-current'
                    : 'bg-card border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>{CATEGORY_ICONS[cat] ?? '🍽️'}</span>
                {cat}
                <span className="text-[10px]">({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Product grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {productsLoading ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
            <RefreshCw size={28} className="animate-spin opacity-30" />
            <p className="text-sm">Loading products…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
            {searchQuery ? (
              <>
                <Scan size={40} className="opacity-20" />
                <p className="text-sm">No product matched <span className="font-mono font-bold">"{searchQuery}"</span></p>
                <p className="text-xs opacity-60">Check the barcode or product name</p>
              </>
            ) : (
              <>
                <Search size={40} className="opacity-20" />
                <p className="text-sm">No products found</p>
              </>
            )}
          </div>
        ) : useGrouped ? (
          /* Grouped view (All section, no search) */
          <div className="space-y-5">
            {grouped.map(({ section, category, items }) => {
              const sc = SECTION_COLORS[section] ?? SECTION_COLORS['All'];
              return (
                <div key={`${section}-${category}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{section}</span>
                    <span className="text-foreground text-xs font-bold">
                      {CATEGORY_ICONS[category] ?? '🍽️'} {category}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sc.pill}`}>{items.length}</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
                    {items.map(product => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        quantity={getCartQuantity(product.id)}
                        onAdd={() => onAdd(product)}
                        onUpdateQuantity={delta => onUpdateQuantity(product.id, delta)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Flat grid (filtered / search view) */
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
            {filtered.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                quantity={getCartQuantity(product.id)}
                onAdd={() => onAdd(product)}
                onUpdateQuantity={delta => onUpdateQuantity(product.id, delta)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom table bar */}
      <ActiveOrdersBar
        tables={tables}
        activeTableId={activeTableId}
        onSelectTable={onSelectTable}
      />
    </div>
  );
}
