import { useState, useEffect, useCallback } from 'react';
import { Plus, Package, AlertTriangle, Search, RefreshCw, Check, Pencil, Trash2, X, Tags } from 'lucide-react';
import { useLocation } from 'wouter';
import { Topbar } from '../components/Topbar';
import { productsApi, ApiProduct } from '../api/client';
import { useToast } from '@/hooks/use-toast';
import { useCategories } from '../store/useCategoriesStore';

// ─── Add Stock Dialog ────────────────────────────────────────────────────────

type AddStockDialogProps = {
  product: ApiProduct;
  onClose: () => void;
  onSave: (qty: number) => Promise<void>;
};

function AddStockDialog({ product, onClose, onSave }: AddStockDialogProps) {
  const [qty, setQty] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const n = Number(qty);
    if (!n || n <= 0) return;
    setSaving(true);
    await onSave(n);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-base">Add Stock</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
            <X size={14} />
          </button>
        </div>
        <p className="text-xs font-semibold text-foreground mb-0.5">{product.name}</p>
        <p className="text-xs text-muted-foreground mb-4">
          Current: <span className="font-bold text-foreground">{product.stock} {product.unit}</span>
        </p>
        <label className="text-xs font-semibold text-foreground block mb-1">Quantity to Add</label>
        <input
          type="number"
          min={1}
          value={qty}
          onChange={e => setQty(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          autoFocus
          placeholder="e.g. 50"
          className="w-full h-10 border border-border rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary mb-4"
        />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 h-9 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-muted/50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!qty || Number(qty) <= 0 || saving}
            className="flex-1 h-9 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Add Stock'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Product Form ────────────────────────────────────────────────────────────

type ProductFormProps = {
  initial?: Partial<ApiProduct>;
  onClose: () => void;
  onSave: (data: Omit<ApiProduct, 'id'>) => Promise<void>;
  sections: string[];
  sectionCategories: Record<string, string[]>;
  allCategories: string[];
};

// Derive the section from a category
function sectionForCategory(cat: string, sectionCategories: Record<string, string[]>): string {
  for (const [sec, cats] of Object.entries(sectionCategories)) {
    if (cats.includes(cat)) return sec;
  }
  return '';
}

function ProductForm({ initial, onClose, onSave, sections, sectionCategories, allCategories }: ProductFormProps) {
  const defaultCategory = initial?.category ?? allCategories[0];
  const [form, setForm] = useState({
    name:     initial?.name     ?? '',
    section:  initial?.section  ?? sectionForCategory(defaultCategory, sectionCategories),
    category: defaultCategory,
    price:    String(initial?.price ?? ''),
    stock:    String(initial?.stock ?? '0'),
    unit:     initial?.unit     ?? 'pieces',
    image:    initial?.image    ?? '',
  });
  const [saving, setSaving] = useState(false);

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  // When section changes, auto-select its first category
  const handleSectionChange = (sec: string) => {
    const firstCat = sectionCategories[sec]?.[0] ?? '';
    setForm(f => ({ ...f, section: sec, category: firstCat }));
  };

  const availableCats = sectionCategories[form.section] ?? [];

  const handleSave = async () => {
    if (!form.name || !form.price) return;
    setSaving(true);
    await onSave({
      name:     form.name,
      section:  form.section,
      category: form.category,
      price:    Number(form.price),
      stock:    Number(form.stock),
      unit:     form.unit,
      image:    form.image,
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-base">{initial?.name ? 'Edit Product' : 'New Product'}</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
            <X size={14} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">Product Name *</label>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              className="w-full h-9 border border-border rounded-xl px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g. Chicken Shawarma"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">Section *</label>
              <select
                value={form.section}
                onChange={e => handleSectionChange(e.target.value)}
                className="w-full h-9 border border-border rounded-xl px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary bg-card"
              >
                {sections.filter(s => s !== 'All').map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">Category *</label>
              <select
                value={form.category}
                onChange={e => set('category', e.target.value)}
                className="w-full h-9 border border-border rounded-xl px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary bg-card"
              >
                {availableCats.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">Price (ZMW) *</label>
              <input
                type="number" min={0}
                value={form.price}
                onChange={e => set('price', e.target.value)}
                className="w-full h-9 border border-border rounded-xl px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="45"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">Initial Stock</label>
              <input
                type="number" min={0}
                value={form.stock}
                onChange={e => set('stock', e.target.value)}
                className="w-full h-9 border border-border rounded-xl px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">Unit</label>
            <select
              value={form.unit}
              onChange={e => set('unit', e.target.value)}
              className="w-full h-9 border border-border rounded-xl px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary bg-card"
            >
              {['pieces', 'loaves', 'cups', 'bottles', 'cans', 'portions', 'kg'].map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">Image URL (optional)</label>
            <input
              value={form.image}
              onChange={e => set('image', e.target.value)}
              className="w-full h-9 border border-border rounded-xl px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="https://…"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 h-9 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-muted/50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!form.name || !form.price || saving}
            className="flex-1 h-9 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Saving…' : initial?.name ? 'Save Changes' : 'Add Product'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function StockManagement() {
  const [, navigate] = useLocation();
  const { sections, sectionCategories, allCategories, reload: reloadCategories } = useCategories();
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filterSection, setFilterSection]   = useState('All');
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [stockDialog,  setStockDialog]  = useState<ApiProduct | null>(null);
  const [editDialog,   setEditDialog]   = useState<ApiProduct | null>(null);
  const [showAddForm,  setShowAddForm]  = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setProducts(await productsApi.list());
    } catch {
      toast({ title: 'Error', description: 'Failed to load products', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Refresh categories alongside products (e.g. after stock changes)
  const refreshAll = useCallback(() => {
    reloadCategories();
    load();
  }, [load, reloadCategories]);

  useEffect(() => { load(); }, [load]);

  const handleAddStock = async (product: ApiProduct, qty: number) => {
    try {
      await productsApi.addStock(product.id, qty);
      await load();
      toast({ title: 'Stock Updated', description: `+${qty} ${product.unit} added to ${product.name}` });
    } catch (err: any) {
      const msg = err?.message ?? '';
      if (msg.includes('Queued for sync')) {
        toast({ title: '📋 Queued for Sync', description: 'Stock update will sync when online', duration: 3000 });
      } else {
        toast({ title: 'Error', description: msg || 'Failed to update stock', variant: 'destructive' });
      }
    }
  };

  const handleCreate = async (data: Omit<ApiProduct, 'id'>) => {
    try {
      await productsApi.create(data);
      await load();
      toast({ title: 'Product Added', description: `${data.name} added successfully` });
    } catch (err: any) {
      const msg = err?.message ?? '';
      if (msg.includes('Queued for sync')) {
        toast({ title: '📋 Queued for Sync', description: 'Product will be created when online', duration: 3000 });
      } else {
        toast({ title: 'Error', description: msg || 'Failed to add product', variant: 'destructive' });
      }
    }
  };

  const handleEdit = async (id: string, data: Omit<ApiProduct, 'id'>) => {
    try {
      await productsApi.update(id, data);
      await load();
      toast({ title: 'Updated', description: 'Changes saved' });
    } catch (err: any) {
      const msg = err?.message ?? '';
      if (msg.includes('Queued for sync')) {
        toast({ title: '📋 Queued for Sync', description: 'Changes will sync when online', duration: 3000 });
      } else {
        toast({ title: 'Error', description: msg || 'Failed to update', variant: 'destructive' });
      }
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await productsApi.delete(id);
      await load();
      setConfirmDelete(null);
      toast({ title: 'Deleted', description: 'Product removed' });
    } catch (err: any) {
      const msg = err?.message ?? '';
      if (msg.includes('Queued for sync')) {
        toast({ title: '📋 Queued for Sync', description: 'Deletion will sync when online', duration: 3000 });
        setConfirmDelete(null);
      } else {
        toast({ title: 'Error', description: msg || 'Failed to delete', variant: 'destructive' });
      }
    }
  };

  // Subcategory list for the active section filter
  const subCatsForFilter = filterSection === 'All' ? [] : sectionCategories[filterSection] ?? [];

  const handleSectionFilterChange = (sec: string) => {
    setFilterSection(sec);
    setFilterCategory(null);
  };

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchSection = filterSection === 'All' || p.section === filterSection;
    const matchCat = !filterCategory || p.category === filterCategory;
    return matchSearch && matchSection && matchCat;
  });

  const lowStockCount  = products.filter(p => p.stock > 0 && p.stock <= 5).length;
  const outOfStockCount = products.filter(p => p.stock === 0).length;
  const totalStock     = products.reduce((s, p) => s + p.stock, 0);

  return (
    <div className="h-[100dvh] w-full bg-background flex flex-col overflow-hidden text-foreground">
      <Topbar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── Header ── */}
        <div className="flex-shrink-0 px-6 pt-5 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-foreground">Stock Management</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Sandyz Restaurant — manage inventory</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={refreshAll} className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-muted/50 transition-colors">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={() => navigate('/categories')}
                className="flex items-center gap-1.5 h-8 px-3 border border-primary/30 text-primary rounded-xl text-xs font-bold hover:bg-primary/5 transition-colors"
              >
                <Tags size={13} /> Categories
              </button>
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-1.5 h-8 px-3 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:opacity-90 transition-opacity"
              >
                <Plus size={13} /> Add Product
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-3 mt-4">
            {[
              { label: 'Total Products', value: products.length, color: '' },
              { label: 'Total Units',    value: totalStock,       color: '' },
              { label: 'Low Stock',      value: lowStockCount,    color: lowStockCount  > 0 ? 'bg-amber-50 border-amber-200 text-amber-700' : '' },
              { label: 'Out of Stock',   value: outOfStockCount,  color: outOfStockCount > 0 ? 'bg-red-50 border-red-200 text-destructive'  : '' },
            ].map(s => (
              <div key={s.label} className={`flex-1 border rounded-xl p-3 ${s.color || 'bg-card border-card-border'}`}>
                <div className={`text-lg font-bold ${s.color ? '' : 'text-foreground'}`}>{s.value}</div>
                <div className="text-[10px] text-muted-foreground font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="flex-shrink-0 px-6 py-3 border-b border-border bg-card/30 space-y-2">
          {/* Search + section pills */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search products…"
                className="w-52 h-8 bg-card border border-border rounded-full pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
              {sections.map(sec => (
                <button
                  key={sec}
                  onClick={() => handleSectionFilterChange(sec)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors border ${
                    filterSection === sec
                      ? 'bg-primary text-primary-foreground border-transparent'
                      : 'bg-card border-border text-muted-foreground hover:border-primary/40'
                  }`}
                >
                  {sec}
                </button>
              ))}
            </div>
          </div>

          {/* Subcategory pills */}
          {subCatsForFilter.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setFilterCategory(null)}
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap border transition-colors ${
                  !filterCategory ? 'bg-primary/10 border-primary text-primary' : 'bg-card border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                All {filterSection}
              </button>
              {subCatsForFilter.map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap border transition-colors ${
                    filterCategory === cat ? 'bg-primary/10 border-primary text-primary' : 'bg-card border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {cat} ({products.filter(p => p.category === cat).length})
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Table ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground gap-2">
              <RefreshCw size={20} className="animate-spin opacity-40" />
              <span className="text-sm">Loading…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
              <Package size={32} className="opacity-20" />
              <p className="text-sm">No products found</p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-3 text-muted-foreground font-semibold w-1/3">Product</th>
                  <th className="text-left py-2 pr-3 text-muted-foreground font-semibold">Section</th>
                  <th className="text-left py-2 pr-3 text-muted-foreground font-semibold">Category</th>
                  <th className="text-right py-2 pr-3 text-muted-foreground font-semibold">Price</th>
                  <th className="text-right py-2 pr-3 text-muted-foreground font-semibold">Stock</th>
                  <th className="text-left py-2 pr-3 text-muted-foreground font-semibold">Status</th>
                  <th className="text-right py-2 text-muted-foreground font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(product => {
                  const isOut = product.stock === 0;
                  const isLow = product.stock > 0 && product.stock <= 5;
                  return (
                    <tr key={product.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      {/* Name + thumbnail */}
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-full h-full object-cover"
                              onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&h=100&fit=crop'; }}
                            />
                          </div>
                          <span className="font-semibold text-foreground">{product.name}</span>
                        </div>
                      </td>

                      <td className="py-2.5 pr-3 text-muted-foreground">{product.section}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground">{product.category}</td>

                      <td className="py-2.5 pr-3 text-right font-bold text-foreground">
                        K {Number(product.price).toFixed(2)}
                      </td>

                      <td className="py-2.5 pr-3 text-right">
                        <span className={`font-bold ${isOut ? 'text-destructive' : isLow ? 'text-amber-600' : 'text-foreground'}`}>
                          {product.stock}
                        </span>
                        <span className="text-muted-foreground ml-1">{product.unit}</span>
                      </td>

                      <td className="py-2.5 pr-3">
                        {isOut ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-semibold">
                            <X size={9} /> Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold">
                            <AlertTriangle size={9} /> Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-semibold">
                            <Check size={9} /> In Stock
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setStockDialog(product)}
                            className="flex items-center gap-1 h-7 px-2 rounded-lg border border-primary/30 text-primary text-[10px] font-semibold hover:bg-primary/5 transition-colors"
                          >
                            <Plus size={10} /> Stock
                          </button>
                          <button
                            onClick={() => setEditDialog(product)}
                            className="w-7 h-7 rounded-lg border border-border text-muted-foreground flex items-center justify-center hover:bg-muted/50 transition-colors"
                          >
                            <Pencil size={11} />
                          </button>
                          {confirmDelete === product.id ? (
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleDelete(product.id)} className="h-7 px-2 rounded-lg bg-destructive text-white text-[10px] font-bold">Yes</button>
                              <button onClick={() => setConfirmDelete(null)} className="h-7 px-2 rounded-lg border border-border text-[10px]">No</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDelete(product.id)}
                              className="w-7 h-7 rounded-lg border border-border text-muted-foreground flex items-center justify-center hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Dialogs ── */}
      {stockDialog && (
        <AddStockDialog
          product={stockDialog}
          onClose={() => setStockDialog(null)}
          onSave={qty => handleAddStock(stockDialog, qty)}
        />
      )}
      {editDialog && (
        <ProductForm
          initial={editDialog}
          onClose={() => setEditDialog(null)}
          onSave={data => handleEdit(editDialog.id, data)}
          sections={sections}
          sectionCategories={sectionCategories}
          allCategories={allCategories}
        />
      )}
      {showAddForm && (
        <ProductForm
          onClose={() => setShowAddForm(false)}
          onSave={handleCreate}
          sections={sections}
          sectionCategories={sectionCategories}
          allCategories={allCategories}
        />
      )}
    </div>
  );
}
