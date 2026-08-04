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
  Trophy,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

// ── Palette ───────────────────────────────────────────────────────────────
const COLORS = {
  primary: '#6366f1',
  green:   '#22c55e',
  amber:   '#f59e0b',
  red:     '#ef4444',
  blue:    '#3b82f6',
  purple:  '#a855f7',
  pink:    '#ec4899',
  teal:    '#14b8a6',
};
const PIE_COLORS = [COLORS.primary, COLORS.green, COLORS.blue, COLORS.amber];

// ── Tooltip helpers ───────────────────────────────────────────────────────
function RevenueTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      <p className="text-muted-foreground">
        Revenue: <span className="font-bold text-foreground">K {Number(payload[0]?.value ?? 0).toFixed(2)}</span>
      </p>
      <p className="text-muted-foreground">
        Orders: <span className="font-bold text-foreground">{payload[1]?.value ?? 0}</span>
      </p>
    </div>
  );
}

function ProductTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-foreground mb-1">{payload[0]?.payload?.name}</p>
      <p className="text-muted-foreground">
        Qty sold: <span className="font-bold text-foreground">{payload[0]?.value}</span>
      </p>
      <p className="text-muted-foreground">
        Revenue: <span className="font-bold text-foreground">K {Number(payload[0]?.payload?.revenue ?? 0).toFixed(2)}</span>
      </p>
    </div>
  );
}

function PaymentTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-foreground capitalize">{payload[0]?.name}</p>
      <p className="text-muted-foreground">
        K <span className="font-bold text-foreground">{Number(payload[0]?.value ?? 0).toFixed(2)}</span>
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────
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

  useEffect(() => { loadReports(); }, [loadReports]);

  // ── Derived chart data ──────────────────────────────────────────────
  const dailyData = (salesReport?.dailySales ?? [])
    .slice(-7)
    .map(d => ({
      date: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      revenue: Number(d.revenue.toFixed(2)),
      orders: d.orders,
    }));

  const topProductsData = (salesReport?.topProducts ?? [])
    .slice(0, 8)
    .map(p => ({
      name: p.name.length > 18 ? p.name.slice(0, 16) + '…' : p.name,
      fullName: p.name,
      qty: p.qty,
      revenue: p.revenue,
    }))
    .reverse(); // bottom → top so #1 is at the top of the horizontal bar

  const paymentData = Object.entries(salesReport?.paymentBreakdown ?? {}).map(
    ([method, amount]) => ({
      name: method.charAt(0).toUpperCase() + method.slice(1),
      value: Number(Number(amount).toFixed(2)),
    })
  );

  const topProduct = salesReport?.topProducts?.[0];

  return (
    <div className="h-[100dvh] w-full bg-background flex flex-col overflow-hidden text-foreground">
      <Topbar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 px-6 pt-5 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-foreground">Dashboard</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Sales overview and top performers</p>
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

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground gap-2">
              <RefreshCw size={20} className="animate-spin opacity-40" />
              <span className="text-sm">Loading dashboard…</span>
            </div>
          ) : (
            <>
              {/* ── KPI cards ── */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  {
                    label: 'Total Revenue',
                    value: salesReport ? `K ${salesReport.summary.totalRevenue.toFixed(2)}` : '—',
                    icon: DollarSign,
                    bg: 'bg-green-50 dark:bg-green-950/30',
                    border: 'border-green-200 dark:border-green-800',
                    text: 'text-green-700 dark:text-green-400',
                  },
                  {
                    label: 'Total Orders',
                    value: salesReport ? String(salesReport.summary.totalOrders) : '—',
                    icon: ShoppingCart,
                    bg: 'bg-blue-50 dark:bg-blue-950/30',
                    border: 'border-blue-200 dark:border-blue-800',
                    text: 'text-blue-700 dark:text-blue-400',
                  },
                  {
                    label: 'Avg Order Value',
                    value: salesReport ? `K ${salesReport.summary.averageOrderValue.toFixed(2)}` : '—',
                    icon: TrendingUp,
                    bg: 'bg-purple-50 dark:bg-purple-950/30',
                    border: 'border-purple-200 dark:border-purple-800',
                    text: 'text-purple-700 dark:text-purple-400',
                  },
                  {
                    label: 'Items Sold',
                    value: salesReport ? String(salesReport.summary.totalItems) : '—',
                    icon: Package,
                    bg: 'bg-orange-50 dark:bg-orange-950/30',
                    border: 'border-orange-200 dark:border-orange-800',
                    text: 'text-orange-700 dark:text-orange-400',
                  },
                ].map(card => {
                  const Icon = card.icon;
                  return (
                    <div key={card.label} className={`border rounded-xl p-4 ${card.bg} ${card.border}`}>
                      <div className={`flex items-center justify-between mb-2 ${card.text}`}>
                        <span className="text-xs font-semibold opacity-80">{card.label}</span>
                        <Icon size={17} />
                      </div>
                      <div className={`text-2xl font-bold ${card.text}`}>{card.value}</div>
                    </div>
                  );
                })}
              </div>

              {/* ── #1 Most Sold Product hero ── */}
              {topProduct && (
                <div className="border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 dark:border-amber-800 rounded-xl p-4 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
                    <Trophy size={22} className="text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                      Most Sold Product
                    </p>
                    <p className="text-base font-bold text-foreground truncate">{topProduct.name}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{topProduct.qty}</p>
                    <p className="text-[11px] text-amber-600 dark:text-amber-400">units sold</p>
                  </div>
                  <div className="text-right flex-shrink-0 pl-3 border-l border-amber-200 dark:border-amber-700">
                    <p className="text-base font-bold text-foreground">K {topProduct.revenue.toFixed(2)}</p>
                    <p className="text-[11px] text-muted-foreground">revenue</p>
                  </div>
                </div>
              )}

              {/* ── Revenue trend + Payment methods ── */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Area chart — daily revenue */}
                <div className="md:col-span-2 border border-border rounded-xl p-4 bg-card">
                  <h3 className="text-sm font-bold text-foreground mb-1">Revenue Trend</h3>
                  <p className="text-[11px] text-muted-foreground mb-3">Last 7 days</p>
                  {dailyData.length === 0 ? (
                    <EmptyChart label="No sales data yet" />
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={dailyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.25} />
                            <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                        <Tooltip content={<RevenueTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke={COLORS.primary}
                          strokeWidth={2}
                          fill="url(#revenueGrad)"
                          dot={{ r: 3, fill: COLORS.primary, strokeWidth: 0 }}
                          activeDot={{ r: 5 }}
                        />
                        <Area
                          type="monotone"
                          dataKey="orders"
                          stroke={COLORS.blue}
                          strokeWidth={1.5}
                          fill="transparent"
                          strokeDasharray="4 3"
                          dot={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Pie chart — payment methods */}
                <div className="border border-border rounded-xl p-4 bg-card flex flex-col">
                  <h3 className="text-sm font-bold text-foreground mb-1">Payment Methods</h3>
                  <p className="text-[11px] text-muted-foreground mb-3">Revenue by type</p>
                  {paymentData.length === 0 ? (
                    <EmptyChart label="No payment data yet" />
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={150}>
                        <PieChart>
                          <Pie
                            data={paymentData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={65}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {paymentData.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<PaymentTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="mt-2 space-y-1">
                        {paymentData.map((entry, i) => (
                          <div key={entry.name} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                              />
                              <span className="text-muted-foreground capitalize">{entry.name}</span>
                            </div>
                            <span className="font-semibold text-foreground">K {entry.value.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* ── Top selling products horizontal bar chart ── */}
              <div className="border border-border rounded-xl p-4 bg-card">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-bold text-foreground">Top Selling Products</h3>
                  <span className="text-[11px] text-muted-foreground">by units sold</span>
                </div>
                <p className="text-[11px] text-muted-foreground mb-3">
                  {topProduct ? (
                    <>
                      <span className="font-semibold text-foreground">{topProduct.name}</span> leads with{' '}
                      <span className="font-semibold text-foreground">{topProduct.qty} units</span>
                    </>
                  ) : 'No sales data yet'}
                </p>
                {topProductsData.length === 0 ? (
                  <EmptyChart label="No product sales yet" />
                ) : (
                  <ResponsiveContainer width="100%" height={Math.max(160, topProductsData.length * 36)}>
                    <BarChart
                      data={topProductsData}
                      layout="vertical"
                      margin={{ top: 0, right: 60, left: 8, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                      <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        width={110}
                      />
                      <Tooltip content={<ProductTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.4 }} />
                      <Bar dataKey="qty" radius={[0, 6, 6, 0]} maxBarSize={22}>
                        {topProductsData.map((_, i) => (
                          <Cell
                            key={i}
                            fill={i === topProductsData.length - 1 ? COLORS.amber : COLORS.primary}
                            opacity={0.85 + (i / topProductsData.length) * 0.15}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* ── Stock health ── */}
              {stockReport && (
                <div className="border border-border rounded-xl p-4 bg-card">
                  <h3 className="text-sm font-bold text-foreground mb-3">Stock Health</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      {
                        label: 'Total Products',
                        value: String(stockReport.summary.totalProducts),
                        icon: Package,
                        style: 'text-foreground',
                      },
                      {
                        label: 'Total Stock Units',
                        value: String(stockReport.summary.totalStock),
                        icon: Package,
                        style: 'text-foreground',
                      },
                      {
                        label: 'Low Stock',
                        value: String(stockReport.summary.lowStock),
                        icon: AlertTriangle,
                        style: stockReport.summary.lowStock > 0 ? 'text-amber-600' : 'text-foreground',
                      },
                      {
                        label: 'Out of Stock',
                        value: String(stockReport.summary.outOfStock),
                        icon: AlertTriangle,
                        style: stockReport.summary.outOfStock > 0 ? 'text-destructive' : 'text-foreground',
                      },
                    ].map(card => {
                      const Icon = card.icon;
                      return (
                        <div key={card.label} className="border border-border rounded-xl p-3 bg-background">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] font-semibold text-muted-foreground">{card.label}</span>
                            <Icon size={15} className={card.style} />
                          </div>
                          <div className={`text-xl font-bold ${card.style}`}>{card.value}</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Stock health bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                      <span>Stock health</span>
                      <span className="font-semibold text-foreground">{stockReport.summary.stockHealthPercentage}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${stockReport.summary.stockHealthPercentage}%`,
                          background:
                            stockReport.summary.stockHealthPercentage >= 80
                              ? COLORS.green
                              : stockReport.summary.stockHealthPercentage >= 50
                              ? COLORS.amber
                              : COLORS.red,
                        }}
                      />
                    </div>
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

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-[120px] text-muted-foreground text-xs">
      {label}
    </div>
  );
}
