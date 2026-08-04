import { useState, useEffect, useCallback } from 'react';
import { Topbar } from '../components/Topbar';
import { reportsApi, type SalesReport, type StockReport } from '../api/client';
import { useToast } from '@/hooks/use-toast';
import {
  BarChart3,
  Package,
  RefreshCw,
  Download,
  TrendingUp,
  AlertTriangle,
  DollarSign,
} from 'lucide-react';

type TabType = 'sales' | 'stock';

export default function Reports() {
  const [activeTab, setActiveTab] = useState<TabType>('sales');
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [stockReport, setStockReport] = useState<StockReport | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'sales') {
        setSalesReport(await reportsApi.sales());
      } else {
        setStockReport(await reportsApi.stock());
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.message ?? 'Failed to load report',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [activeTab, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="h-[100dvh] w-full bg-background flex flex-col overflow-hidden text-foreground">
      <Topbar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 px-6 pt-5 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-foreground">Reports</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Sales and inventory analytics</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadData}
                className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-muted/50"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1.5 mt-4">
            {[
              { id: 'sales' as TabType, label: 'Sales Report', icon: TrendingUp },
              { id: 'stock' as TabType, label: 'Stock Report', icon: Package },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 h-7 rounded-full text-xs font-semibold transition-all border ${
                    isActive
                      ? 'bg-primary text-primary-foreground border-transparent shadow-sm'
                      : 'bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                  }`}
                >
                  <Icon size={13} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Report Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground gap-2">
              <RefreshCw size={20} className="animate-spin opacity-40" />
              <span className="text-sm">Loading report…</span>
            </div>
          ) : activeTab === 'sales' && salesReport ? (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Total Revenue', value: `K ${salesReport.summary.totalRevenue.toFixed(2)}`, icon: DollarSign },
                  { label: 'Total Orders', value: String(salesReport.summary.totalOrders), icon: TrendingUp },
                  { label: 'Avg Order Value', value: `K ${salesReport.summary.averageOrderValue.toFixed(2)}`, icon: BarChart3 },
                  { label: 'Items Sold', value: String(salesReport.summary.totalItems), icon: Package },
                ].map(card => {
                  const Icon = card.icon;
                  return (
                    <div key={card.label} className="border border-border rounded-xl p-4 bg-card">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-muted-foreground">{card.label}</span>
                        <Icon size={18} className="text-muted-foreground" />
                      </div>
                      <div className="text-xl font-bold text-foreground">{card.value}</div>
                    </div>
                  );
                })}
              </div>

              {/* Daily Sales */}
              {salesReport.dailySales.length > 0 && (
                <div className="border border-border rounded-xl p-4 bg-card">
                  <h3 className="text-sm font-bold text-foreground mb-3">Daily Sales Breakdown</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 pr-3 text-muted-foreground font-semibold">Date</th>
                          <th className="text-right py-2 pr-3 text-muted-foreground font-semibold">Orders</th>
                          <th className="text-right py-2 text-muted-foreground font-semibold">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesReport.dailySales.map(day => (
                          <tr key={day.date} className="border-b border-border/50 hover:bg-muted/20">
                            <td className="py-2 pr-3 font-medium text-foreground">{day.date}</td>
                            <td className="py-2 pr-3 text-right">{day.orders}</td>
                            <td className="py-2 text-right font-bold text-foreground">K {day.revenue.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Payment Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-border rounded-xl p-4 bg-card">
                  <h3 className="text-sm font-bold text-foreground mb-3">Payment Methods</h3>
                  <div className="space-y-2">
                    {Object.entries(salesReport.paymentBreakdown).map(([method, amount]) => (
                      <div key={method} className="flex items-center justify-between py-1.5 border-b border-border/20 last:border-0">
                        <span className="text-xs font-medium text-foreground capitalize">{method}</span>
                        <span className="text-xs font-bold text-foreground">K {amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border border-border rounded-xl p-4 bg-card">
                  <h3 className="text-sm font-bold text-foreground mb-3">Top Products</h3>
                  <div className="space-y-2">
                    {salesReport.topProducts.slice(0, 5).map((product, idx) => (
                      <div key={product.id} className="flex items-center justify-between py-1.5 border-b border-border/20 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-medium text-foreground">{product.name}</span>
                        </div>
                        <span className="text-xs font-bold text-foreground">{product.qty} sold</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'stock' && stockReport ? (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Total Products', value: String(stockReport.summary.totalProducts), icon: Package },
                  { label: 'Total Stock', value: String(stockReport.summary.totalStock), icon: Package },
                  {
                    label: 'Low Stock',
                    value: String(stockReport.summary.lowStock),
                    icon: AlertTriangle,
                    color: stockReport.summary.lowStock > 0 ? 'bg-amber-50 border-amber-200 text-amber-700' : '',
                  },
                  {
                    label: 'Out of Stock',
                    value: String(stockReport.summary.outOfStock),
                    icon: AlertTriangle,
                    color: stockReport.summary.outOfStock > 0 ? 'bg-red-50 border-red-200 text-destructive' : '',
                  },
                ].map(card => {
                  const Icon = card.icon;
                  return (
                    <div key={card.label} className={`border rounded-xl p-4 ${card.color || 'bg-card border-border'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-muted-foreground">{card.label}</span>
                        <Icon size={18} />
                      </div>
                      <div className={`text-xl font-bold ${card.color ? '' : 'text-foreground'}`}>{card.value}</div>
                    </div>
                  );
                })}
              </div>

              {/* Section Breakdown */}
              <div className="border border-border rounded-xl p-4 bg-card">
                <h3 className="text-sm font-bold text-foreground mb-3">Stock by Section</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 pr-3 text-muted-foreground font-semibold">Section</th>
                        <th className="text-right py-2 pr-3 text-muted-foreground font-semibold">Products</th>
                        <th className="text-right py-2 pr-3 text-muted-foreground font-semibold">Total Stock</th>
                        <th className="text-right py-2 pr-3 text-muted-foreground font-semibold">Low</th>
                        <th className="text-right py-2 text-muted-foreground font-semibold">Out</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(stockReport.sectionBreakdown).map(([section, data]) => (
                        <tr key={section} className="border-b border-border/50 hover:bg-muted/20">
                          <td className="py-2 pr-3 font-medium text-foreground">{section}</td>
                          <td className="py-2 pr-3 text-right">{data.count}</td>
                          <td className="py-2 pr-3 text-right font-bold">{data.totalStock}</td>
                          <td className="py-2 pr-3 text-right text-amber-600">{data.lowStock}</td>
                          <td className="py-2 text-right text-destructive">{data.outOfStock}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Low Stock Items */}
              {stockReport.lowStockItems.length > 0 && (
                <div className="border border-amber-200 rounded-xl p-4 bg-amber-50">
                  <h3 className="text-sm font-bold text-amber-700 mb-3">Low Stock Items</h3>
                  <div className="space-y-1.5">
                    {stockReport.lowStockItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between py-1">
                        <span className="text-xs font-medium text-amber-800">{item.name}</span>
                        <span className="text-xs font-bold text-amber-700">{item.stock} {item.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Out of Stock Items */}
              {stockReport.outOfStockItems.length > 0 && (
                <div className="border border-red-200 rounded-xl p-4 bg-red-50">
                  <h3 className="text-sm font-bold text-red-700 mb-3">Out of Stock Items</h3>
                  <div className="space-y-1.5">
                    {stockReport.outOfStockItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between py-1">
                        <span className="text-xs font-medium text-red-800">{item.name}</span>
                        <span className="text-xs font-bold text-red-700">0 {item.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

