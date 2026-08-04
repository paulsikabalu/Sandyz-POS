import { useState, useEffect, useCallback } from 'react';
import { Topbar } from '../components/Topbar';
import { settingsApi } from '../api/client';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Save, Settings as SettingsIcon } from 'lucide-react';

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
                                if (e.key === 'Enter') {
                                  handleSave(field.key, currentValue);
                                }
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

              <div className="text-center p-4">
                <p className="text-[11px] text-muted-foreground">
                  Settings are saved automatically when you change a value or click the save button.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

