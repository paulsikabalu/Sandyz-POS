import { useState } from 'react';
import { AlertTriangle, RefreshCw, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import type { PendingMutation } from '../lib/sync';

interface SyncFailurePanelProps {
  mutations: PendingMutation[];
  onRetry: (id: string) => void;
  onDiscard: (id: string) => void;
  onRetryAll: () => void;
  onDiscardAll: () => void;
}

const MUTATION_LABELS: Record<string, { label: string; description: (p: unknown) => string }> = {
  PLACE_ORDER:    { label: 'Place Order',     description: () => 'An offline order could not be submitted' },
  CREATE_PRODUCT: { label: 'Create Product',  description: () => 'A new product could not be saved' },
  UPDATE_PRODUCT: { label: 'Update Product',  description: (p: any) => `Changes to product "${p?.data?.name ?? p?.id ?? ''}" could not be saved` },
  DELETE_PRODUCT: { label: 'Delete Product',  description: (p: any) => `Product "${p?.id ?? ''}" could not be deleted` },
  ADD_STOCK:      { label: 'Add Stock',       description: (p: any) => `Stock update for product "${p?.id ?? ''}" could not be applied` },
  UPDATE_ORDER:   { label: 'Update Order',    description: (p: any) => `Changes to order "${p?.id ?? ''}" could not be saved` },
  DELETE_ORDER:   { label: 'Delete Order',    description: (p: any) => `Order "${p?.id ?? ''}" could not be deleted` },
};

export function SyncFailurePanel({
  mutations,
  onRetry,
  onDiscard,
  onRetryAll,
  onDiscardAll,
}: SyncFailurePanelProps) {
  const [expanded, setExpanded] = useState(true);

  if (mutations.length === 0) return null;

  return (
    <div className="flex-shrink-0 border-t border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900">
      {/* Header bar — always visible */}
      <div className="flex items-center justify-between px-4 py-2">
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-2 text-red-700 dark:text-red-400 text-xs font-semibold hover:opacity-80 transition-opacity"
        >
          <AlertTriangle size={13} />
          <span>
            {mutations.length} offline operation{mutations.length > 1 ? 's' : ''} failed to sync
          </span>
          {expanded
            ? <ChevronDown size={12} />
            : <ChevronUp size={12} />}
        </button>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onRetryAll}
            title="Retry all"
            className="flex items-center gap-1 h-6 px-2 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 text-[11px] font-semibold hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors"
          >
            <RefreshCw size={11} />
            Retry all
          </button>
          <button
            onClick={onDiscardAll}
            title="Discard all"
            className="flex items-center gap-1 h-6 px-2 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 text-[11px] font-semibold hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors"
          >
            <Trash2 size={11} />
            Discard all
          </button>
        </div>
      </div>

      {/* Expanded list */}
      {expanded && (
        <div className="px-4 pb-3 space-y-2 max-h-52 overflow-y-auto">
          {mutations.map(m => {
            const meta = MUTATION_LABELS[m.type];
            const desc = meta?.description(m.payload) ?? m.type;
            const when = m.failedAt
              ? new Date(m.failedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
              : '';

            return (
              <div
                key={m.id}
                className="flex items-start justify-between gap-3 bg-white dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[11px] font-bold text-red-700 dark:text-red-400">
                      {meta?.label ?? m.type}
                    </span>
                    {when && (
                      <span className="text-[10px] text-red-400 dark:text-red-500">
                        · failed at {when}
                      </span>
                    )}
                    <span className="text-[10px] text-red-400 dark:text-red-500">
                      · {m.retries} attempt{m.retries !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <p className="text-[11px] text-red-600 dark:text-red-300 truncate">{desc}</p>
                  {m.errorMessage && (
                    <p className="text-[10px] text-red-400 dark:text-red-500 mt-0.5 font-mono truncate">
                      {m.errorMessage}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => onRetry(m.id)}
                    title="Retry this operation"
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                  >
                    <RefreshCw size={12} />
                  </button>
                  <button
                    onClick={() => onDiscard(m.id)}
                    title="Discard — remove from queue permanently"
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
