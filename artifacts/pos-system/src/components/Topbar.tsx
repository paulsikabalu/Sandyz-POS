import { useLocation } from 'wouter';
import {
  Menu,
  ShoppingBag,
  PackageOpen,
  Settings,
  LogOut,
  BarChart3,
  Wifi,
  WifiOff,
  LayoutDashboard,
  Users,
  Tags,
} from 'lucide-react';
import { useNetworkStatus } from '../lib/network';
import { useAuth, hasRole } from '../store/useAuthStore';
import type { UserRole } from '../store/useAuthStore';

function Topbar() {
  const [location, navigate] = useLocation();
  const { isOnline } = useNetworkStatus();
  const { user, logout } = useAuth();

  const NAV_ITEMS = [
    { icon: Menu, label: 'POS', href: '/', roles: ['admin', 'cashier', 'manager'] },
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', roles: ['admin', 'manager'] },
    { icon: PackageOpen, label: 'Stock', href: '/stock', roles: ['admin', 'cashier', 'manager'] },
    { icon: Tags, label: 'Categories', href: '/categories', roles: ['admin', 'cashier', 'manager'] },
    { icon: BarChart3, label: 'Reports', href: '/reports', roles: ['admin', 'manager'] },
    { icon: ShoppingBag, label: 'Orders', href: '/orders', roles: ['admin', 'manager', 'cashier'] },
    { icon: Users, label: 'Users', href: '/users', roles: ['admin'] },
    { icon: Settings, label: 'Settings', href: '/settings', roles: ['admin', 'manager'] },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Filter nav items based on user role
  const visibleNavItems = NAV_ITEMS.filter(
    item => user && hasRole(user, item.roles as UserRole[])
  );

  return (
    <header className="w-full h-[56px] flex items-center bg-sidebar text-sidebar-foreground border-b border-sidebar-border px-4 flex-shrink-0 gap-4">
      {/* Logo */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-sm flex-shrink-0">
          <span className="text-xs">S</span>
        </div>
        <div className="hidden sm:block min-w-0">
          <span className="font-bold text-xs tracking-tight leading-tight block">SANDYZ</span>
          <span className="text-[9px] text-muted-foreground font-medium leading-tight block">Restaurant POS</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex items-center gap-1 flex-1 overflow-x-auto scrollbar-hide">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || (item.href !== '/' && location.startsWith(item.href));
          return (
            <button
              key={item.href}
              data-testid={`nav-${item.label.toLowerCase()}`}
              onClick={() => navigate(item.href)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors text-xs font-medium whitespace-nowrap
                ${isActive
                  ? 'bg-sidebar-active text-primary'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
            >
              <Icon size={15} className={isActive ? 'text-primary' : 'text-muted-foreground'} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Network status indicator */}
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/30 flex-shrink-0">
        {isOnline ? (
          <Wifi size={13} className="text-green-500" />
        ) : (
          <WifiOff size={13} className="text-destructive" />
        )}
        <span className={`text-[10px] font-medium ${isOnline ? 'text-green-600' : 'text-destructive'}`}>
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Right side: user avatar + logout */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="hidden sm:flex flex-col items-end">
          <span className="text-[11px] font-semibold text-foreground leading-tight">{user?.name ?? 'User'}</span>
          <span className="text-[9px] text-muted-foreground font-medium capitalize leading-tight">{user?.role ?? 'guest'}</span>
        </div>
        <div className="w-7 h-7 rounded-full border-2 border-sidebar bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shadow-sm">
          {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
        </div>
        <button
          onClick={handleLogout}
          data-testid="button-logout"
          className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-muted-foreground hover:text-destructive transition-colors text-xs font-medium"
        >
          <LogOut size={14} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}

export { Topbar };
