type CategoryCardProps = {
  name: string;
  count: number;
  icon: React.ElementType;
  isActive: boolean;
  onClick: () => void;
};

export function CategoryCard({ name, count, icon: Icon, isActive, onClick }: CategoryCardProps) {
  return (
    <button
      data-testid={`category-${name.toLowerCase()}`}
      onClick={onClick}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-xl min-w-max transition-all
        ${isActive 
          ? 'bg-sidebar-active border border-primary text-primary shadow-sm' 
          : 'bg-card border border-card-border text-foreground hover:bg-muted/50 hover:border-border'}
      `}
    >
      <div className={`
        w-7 h-7 rounded-full flex items-center justify-center transition-colors
        ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
      `}>
        <Icon size={14} />
      </div>
      <div className="flex flex-col items-start">
        <span className="font-semibold text-xs">{name}</span>
        <span className={`text-[10px] ${isActive ? 'text-primary/80' : 'text-muted-foreground'}`}>
          {count} Items
        </span>
      </div>
    </button>
  );
}
