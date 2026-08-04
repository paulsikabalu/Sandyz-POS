import { useState, useEffect, useCallback } from 'react';
import { Topbar } from '../components/Topbar';
import { reportsApi, type SalesReport, type StockReport } from '../api/client';
import { useToast } from '@/hooks/use-toast';
import {
  ShoppingCart,
  TrendingUp,
  Package,
  AlertTriangle,
  DollarSign,
  RefreshCw,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

export default function Dashboard() {
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [stockReport, setStockReport] = useState<StockReport | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const [sales, stock] = await Promise.all([
        reportsApi.sales(),
        reportsApi.stock(),
      ]);
      setSalesReport(sales);
      setStockReport(stock);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.message ?? 'Failed to load dashboard data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  return (
    <div className="h-[100dvh] w-full bg-background flex flex-col overflow-hidden text-foreground">
      <Topbar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 px-6 pt-5 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-foreground">Dashboard</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Overview of sales and inventory</p>
            </div>
            <button
              onClick={loadReports}
              className="flex items-center gap-1.5 h-8 px-3 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:opacity-90 transition-opacity"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground gap-2">
              <RefreshCw size={20} className="animate-spin opacity-40" />
              <span className="text-sm">Loading dashboard…</span>
            </div>
          ) : (
            <>
              {/* Sales Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  {
                    label: 'Total Revenue',
                    value: salesReport ? `K ${salesReport.summary.totalRevenue.toFixed(2)}` : '—',
                    icon: DollarSign,
                    color: 'bg-green-50 text-green-600 border-green-200',
                  },
                  {
                    label: 'Total Orders',
                    value: salesReport ? String(salesReport.summary.totalOrders) : '—',
                    icon: ShoppingCart,
                    color: 'bg-blue-50 text-blue-600 border-blue-200',
                  },
                  {
                    label: 'Avg Order Value',
                    value: salesReport ? `K ${salesReport.summary.averageOrderValue.toFixed(2)}` : '—',
                    icon: TrendingUp,
                    color: 'bg-purple-50 text-purple-600 border-purple-200',
                  },
                  {
                    label: 'Items Sold',
                    value: salesReport ? String(salesReport.summary.totalItems) : '—',
                    icon: Package,
                    color: 'bg-orange-50 text-orange-600 border-orange-200',
                  },
                ].map(card => {
                  const Icon = card.icon;
                  return (
                    <div key={card.label} className={`border rounded-xl p-4 ${card.color}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold opacity-80">{card.label}</span>
                        <Icon size={18} />
                      </div>
                      <div className="text-xl font-bold">{card.value}</div>
                    </div>
                  );
                })}
              </div>

              {/* Stock Health */}
              {stockReport && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    {
                      label: 'Total Products',
                      value: String(stockReport.summary.totalProducts),
                      icon: Package,
                      color: '',
                    },
                    {
                      label: 'Total Stock Units',
                      value: String(stockReport.summary.totalStock),
                      icon: Package,
                      color: '',
                    },
                    {
                      label: 'Low Stock Items',
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
                      <div key={card.label} className={`border rounded-xl p-4 ${card.color || 'bg-card border-card-border'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-muted-foreground">{card.label}</span>
                          <Icon size={18} className={card.color ? '' : 'text-muted-foreground'} />
                        </div>
                        <div className={`text-xl font-bold ${card.color ? '' : 'text-foreground'}`}>{card.value}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Daily Sales Chart (simple table) */}
              {salesReport && salesReport.dailySales.length > 0 && (
                <div className="border border-border rounded-xl p-4 bg-card">
                  <h3 className="text-sm font-bold text-foreground mb-3">Daily Sales</h3>
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
                        {salesReport.dailySales.slice(-7).map(day => (
                          <tr key={day.date} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                            <td className="py-2 pr-3 font-medium text-foreground">
                              {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </td>
                            <td className="py-2 pr-3 text-right">{day.orders}</td>
                            <td className="py-2 text-right font-bold text-foreground">K {day.revenue.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Top Products */}
              {salesReport && salesReport.topProducts.length > 0 && (
                <div className="border border-border rounded-xl p-4 bg-card">
                  <h3 className="text-sm font-bold text-foreground mb-3">Top Selling Products</h3>
                  <div className="space-y-2">
                    {salesReport.topProducts.map((product, index) => (
                      <div key={product.id} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">
                            {index + 1}
                          </span>
                          <span className="text-xs font-medium text-foreground">{product.name}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{product.qty} sold</span>
                          <span className="font-bold text-foreground">K {product.revenue.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment Breakdown */}
              {salesReport && Object.keys(salesReport.paymentBreakdown).length > 0 && (
                <div className="border border-border rounded-xl p-4 bg-card">
                  <h3 className="text-sm font-bold text-foreground mb-3">Payment Methods</h3>
                  <div className="space-y-2">
                    {Object.entries(salesReport.paymentBreakdown).map(([method, amount]) => (
                      <div key={method} className="flex items-center justify-between py-1.5">
                        <span className="text-xs font-medium text-foreground capitalize">{method}</span>
                        <span className="text-xs font-bold text-foreground">K {amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

