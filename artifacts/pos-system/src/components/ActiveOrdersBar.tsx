import { Table } from '../store/usePosStore';
import { ArrowRight } from 'lucide-react';

type ActiveOrdersBarProps = {
  tables: Table[];
  activeTableId: string;
  onSelectTable: (id: string) => void;
};

export function ActiveOrdersBar({ tables, activeTableId, onSelectTable }: ActiveOrdersBarProps) {
  return (
    <div className="w-full h-[60px] bg-card border-t border-card-border px-4 flex items-center overflow-x-auto scrollbar-hide gap-2 flex-shrink-0">
      {tables.map(table => {
        const isActive = table.id === activeTableId;
        const isProcessing = table.status === 'processing';
        
        return (
          <button
            key={table.id}
            data-testid={`table-chip-${table.id}`}
            onClick={() => onSelectTable(table.id)}
            className={`
              flex items-center gap-2 p-2 pr-3 rounded-xl min-w-[150px] transition-all border text-left
              ${isActive 
                ? 'bg-sidebar-active border-primary shadow-sm' 
                : 'bg-card border-card-border hover:border-border hover:bg-muted/30'
              }
            `}
          >
            <div className={`
              w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0
              ${isActive 
                ? 'bg-primary text-primary-foreground' 
                : isProcessing ? 'bg-amber-100 text-amber-700' : 'bg-muted text-foreground'
              }
            `}>
              T{table.number}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="font-bold text-xs text-foreground truncate">
                {table.customerName}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {table.itemCount} Items
              </div>
            </div>

            <div className={`
              w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0
              ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
            `}>
              <ArrowRight size={11} />
            </div>
          </button>
        );
      })}
    </div>
  );
}
