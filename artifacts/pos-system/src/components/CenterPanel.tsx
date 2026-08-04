import { useState } from 'react';
import { Search, SlidersHorizontal, RefreshCw, ChevronDown } from 'lucide-react';
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

  // Dynamic sections/subcategories from category management
  const { sections: SECTIONS, sectionCategories: SECTION_CATEGORIES } = useCategories();

  // When section changes, reset subcategory
  const handleSectionClick = (section: string) => {
    setActiveSection(section);
    setActiveCategory(null);
  };

  // Subcategories for the current section
  const subCategories = activeSection === 'All' ? [] : SECTION_CATEGORIES[activeSection] ?? [];

  // Filter products
  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchSection = activeSection === 'All' || p.section === activeSection;
    const matchCat = !activeCategory || p.category === activeCategory;
    return matchSearch && matchSection && matchCat;
  });

  // Group filtered products by section then category
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

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden relative">

      {/* Search bar */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-muted-foreground">
              <Search size={14} />
            </div>
            <input
              type="search"
              data-testid="input-search"
              placeholder="Search products…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-8 bg-card border border-border rounded-full pl-8 pr-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-muted-foreground"
            />
          </div>
          <button onClick={onRefresh} title="Refresh" className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:bg-muted/50 transition-colors">
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

      {/* Subcategory pills — only when a section is selected */}
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
            <Search size={40} className="opacity-20" />
            <p className="text-sm">No products found</p>
          </div>
        ) : useGrouped ? (
          /* Grouped view (All section, no search) */
          <div className="space-y-5">
            {grouped.map(({ section, category, items }) => {
              const sc = SECTION_COLORS[section] ?? SECTION_COLORS['All'];
              return (
                <div key={`${section}-${category}`}>
                  {/* Group header */}
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
          /* Flat grid (filtered view) */
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
