import { useState, useEffect, useCallback } from 'react';
import { Topbar } from '../components/Topbar';
import { settingsApi } from '../api/client';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Save, ChevronDown, ChevronUp } from 'lucide-react';
import {
  getCashDrawerSettings,
  saveCashDrawerSettings,
  openCashDrawer,
  type CashDrawerSettings,
} from '../lib/cashDrawer';

type SettingField = {
  key: string;
  label: string;
  description: string;
  type: 'text' | 'number' | 'select';
  options?: { value: string; label: string }[];
  placeholder?: string;
};

const SETTING_FIELDS: SettingField[] = [
  {
    key: 'tax_rate',
    label: 'Tax Rate (%)',
    description: 'Default tax percentage applied to orders',
    type: 'number',
    placeholder: '5',
  },
  {
    key: 'currency',
    label: 'Currency Symbol',
    description: 'Currency symbol displayed on receipts and UI',
    type: 'text',
    placeholder: 'K',
  },
  {
    key: 'store_name',
    label: 'Store Name',
    description: 'Your restaurant or store name',
    type: 'text',
    placeholder: 'Sandyz Restaurant',
  },
  {
    key: 'default_service_type',
    label: 'Default Service Type',
    description: 'Default service type for new orders',
    type: 'select',
    options: [
      { value: 'dine-in', label: 'Dine In' },
      { value: 'takeaway', label: 'Take Away' },
      { value: 'delivery', label: 'Delivery' },
    ],
  },
  {
    key: 'low_stock_threshold',
    label: 'Low Stock Threshold',
    description: 'Stock count below which items are marked as low stock',
    type: 'number',
    placeholder: '5',
  },
];

export default function Settings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const { toast } = useToast();

  // ── Cash drawer (per-terminal, stored in localStorage) ────────────────
  const [drawer, setDrawer] = useState<CashDrawerSettings>(getCashDrawerSettings);
  const [drawerExpanded, setDrawerExpanded] = useState(false);
  const [testingDrawer, setTestingDrawer] = useState(false);

  const saveDrawer = useCallback((next: CashDrawerSettings) => {
    saveCashDrawerSettings(next);
    setDrawer(next);
  }, []);

  const handleTestDrawer = async () => {
    setTestingDrawer(true);
    try {
      await openCashDrawer(drawer);
      toast({ title: '✅ Cash drawer opened', duration: 2000 });
    } catch (err: any) {
      toast({
        title: 'Cash Drawer Error',
        description: err?.message ?? 'Could not open drawer',
        variant: 'destructive',
      });
    } finally {
      setTestingDrawer(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSettings(await settingsApi.list());
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.message ?? 'Failed to load settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (key: string, value: string) => {
    setSaving(key);
    try {
      const result = await settingsApi.update(key, value);
      setSettings(prev => ({ ...prev, [result.key]: result.value }));
      toast({
        title: 'Setting Updated',
        description: `${key} has been saved`,
        duration: 2000,
      });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.message ?? 'Failed to save setting',
        variant: 'destructive',
      });
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="h-[100dvh] w-full bg-background flex flex-col overflow-hidden text-foreground">
      <Topbar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 px-6 pt-5 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-foreground">Settings</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Configure your POS system</p>
            </div>
            <button
              onClick={load}
              className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-muted/50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Settings Form */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground gap-2">
              <RefreshCw size={20} className="animate-spin opacity-40" />
              <span className="text-sm">Loading settings…</span>
            </div>
          ) : (
            <div className="max-w-2xl space-y-3">
              {/* ── Store / system settings ── */}
              {SETTING_FIELDS.map(field => {
                const currentValue = settings[field.key] ?? '';
                const isSaving = saving === field.key;

                return (
                  <div key={field.key} className="border border-border rounded-xl p-4 bg-card">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 mr-4">
                        <label className="text-sm font-semibold text-foreground block mb-0.5">
                          {field.label}
                        </label>
                        <p className="text-[11px] text-muted-foreground mb-2">{field.description}</p>

                        {field.type === 'select' ? (
                          <select
                            value={currentValue}
                            onChange={e => handleSave(field.key, e.target.value)}
                            disabled={isSaving}
                            className="w-full h-9 border border-border rounded-xl px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary bg-background disabled:opacity-50"
                          >
                            {field.options?.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        ) : (
                          <div className="flex items-center gap-2">
                            <input
                              type={field.type}
                              value={currentValue}
                              onChange={e => {
                                setSettings(prev => ({ ...prev, [field.key]: e.target.value }));
                              }}
                              onBlur={() => {
                                if (currentValue !== (settings[field.key] ?? '')) {
                                  handleSave(field.key, currentValue);
                                }
                              }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleSave(field.key, currentValue);
                              }}
                              placeholder={field.placeholder}
                              className="flex-1 h-9 border border-border rounded-xl px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                            />
                            <button
                              onClick={() => handleSave(field.key, currentValue)}
                              disabled={isSaving}
                              className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors disabled:opacity-50"
                            >
                              {isSaving ? (
                                <RefreshCw size={13} className="animate-spin" />
                              ) : (
                                <Save size={13} />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* ── Hardware: Cash Drawer ─────────────────────────────── */}
              <div className="border border-border rounded-xl bg-card overflow-hidden">
                {/* Section header / toggle */}
                <button
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                  onClick={() => setDrawerExpanded(v => !v)}
                >
                  <div>
                    <span className="text-sm font-semibold text-foreground">Cash Drawer</span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Hardware settings for automatic cash drawer control
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        drawer.enabled
                          ? 'bg-green-100 text-green-700'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {drawer.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                    {drawerExpanded
                      ? <ChevronUp size={14} className="text-muted-foreground" />
                      : <ChevronDown size={14} className="text-muted-foreground" />}
                  </div>
                </button>

                {drawerExpanded && (
                  <div className="border-t border-border px-4 py-4 space-y-4">
                    {/* Enable toggle */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-foreground">Enable Cash Drawer</p>
                        <p className="text-[11px] text-muted-foreground">
                          Automatically opens the drawer on cash payments
                        </p>
                      </div>
                      <button
                        onClick={() => saveDrawer({ ...drawer, enabled: !drawer.enabled })}
                        className={`relative w-10 h-5 rounded-full transition-colors ${
                          drawer.enabled ? 'bg-primary' : 'bg-muted'
                        }`}
                        role="switch"
                        aria-checked={drawer.enabled}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                            drawer.enabled ? 'translate-x-5' : ''
                          }`}
                        />
                      </button>
                    </div>

                    {/* Interface type */}
                    <div>
                      <p className="text-xs font-medium text-foreground mb-1">Connection Type</p>
                      <p className="text-[11px] text-muted-foreground mb-2">
                        How this terminal connects to the cash drawer
                      </p>
                      <div className="flex gap-2">
                        {([
                          {
                            value: 'network',
                            label: 'Network Printer',
                            desc: 'Printer is on the network (IP address)',
                          },
                          {
                            value: 'print',
                            label: 'Via Receipt Printer',
                            desc: 'Drawer connected to printer RJ-11 port',
                          },
                        ] as const).map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => saveDrawer({ ...drawer, interface: opt.value })}
                            className={`flex-1 text-left px-3 py-2 rounded-xl border text-xs transition-colors ${
                              drawer.interface === opt.value
                                ? 'border-primary bg-primary/5 text-primary'
                                : 'border-border bg-background text-muted-foreground hover:bg-muted/40'
                            }`}
                          >
                            <p className="font-semibold">{opt.label}</p>
                            <p className="text-[10px] mt-0.5 opacity-80">{opt.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Network settings */}
                    {drawer.interface === 'network' && (
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-medium text-foreground mb-1">Printer IP Address</p>
                          <input
                            type="text"
                            value={drawer.ip}
                            onChange={e => setDrawer(d => ({ ...d, ip: e.target.value }))}
                            onBlur={() => saveDrawer(drawer)}
                            placeholder="192.168.1.100"
                            className="w-full h-9 border border-border rounded-xl px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                          />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-foreground mb-1">Port</p>
                          <input
                            type="number"
                            value={drawer.port}
                            onChange={e => setDrawer(d => ({ ...d, port: Number(e.target.value) }))}
                            onBlur={() => saveDrawer(drawer)}
                            placeholder="9100"
                            className="w-full h-9 border border-border rounded-xl px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                          />
                          <p className="text-[10px] text-muted-foreground mt-1">
                            Default is 9100 for most receipt printers (Epson, Star, etc.)
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Drawer pin */}
                    <div>
                      <p className="text-xs font-medium text-foreground mb-1">Drawer Pin</p>
                      <p className="text-[11px] text-muted-foreground mb-2">
                        Which RJ-11 pin the drawer is connected to on the printer
                      </p>
                      <div className="flex gap-2">
                        {([
                          { value: 0, label: 'Pin 2 (most common)' },
                          { value: 1, label: 'Pin 5' },
                        ] as const).map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => saveDrawer({ ...drawer, pin: opt.value })}
                            className={`flex-1 px-3 py-2 rounded-xl border text-xs transition-colors ${
                              drawer.pin === opt.value
                                ? 'border-primary bg-primary/5 text-primary font-semibold'
                                : 'border-border bg-background text-muted-foreground hover:bg-muted/40'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Test button */}
                    {drawer.enabled && (
                      <div className="pt-1">
                        <button
                          onClick={handleTestDrawer}
                          disabled={testingDrawer || (drawer.interface === 'network' && !drawer.ip)}
                          className="w-full h-9 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                          {testingDrawer ? 'Opening…' : 'Test — Open Cash Drawer Now'}
                        </button>
                        {drawer.interface === 'print' && (
                          <p className="text-[10px] text-muted-foreground text-center mt-1">
                            "Via Receipt Printer" mode opens the drawer as part of each print job
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="text-center p-4">
                <p className="text-[11px] text-muted-foreground">
                  Store and system settings are saved to the server. Cash drawer settings are saved
                  to this device only.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
