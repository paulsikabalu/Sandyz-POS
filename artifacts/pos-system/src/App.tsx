import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { AuthProvider } from './store/useAuthStore';
import { ProtectedRoute } from './components/ProtectedRoute';
import Pos from './pages/Pos';
import StockManagement from './pages/StockManagement';
import CategoriesManagement from './pages/CategoriesManagement';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UsersManagement from './pages/UsersManagement';
import OrdersManagement from './pages/OrdersManagement';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import { syncService } from './lib/sync';

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <ProtectedRoute path="/" component={Pos} roles={['admin', 'cashier', 'manager']} />
      <ProtectedRoute path="/stock" component={StockManagement} roles={['admin', 'cashier', 'manager']} />
      <ProtectedRoute path="/categories" component={CategoriesManagement} roles={['admin', 'cashier', 'manager']} />
      <ProtectedRoute path="/dashboard" component={Dashboard} roles={['admin', 'manager']} />
      <ProtectedRoute path="/users" component={UsersManagement} roles={['admin']} />
      <ProtectedRoute path="/orders" component={OrdersManagement} roles={['admin', 'manager', 'cashier']} />
      <ProtectedRoute path="/reports" component={Reports} roles={['admin', 'manager']} />
      <ProtectedRoute path="/settings" component={Settings} roles={['admin', 'manager']} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Initialize background sync on app mount
  useEffect(() => {
    // Attempt an initial sync when the app loads (only if online)
    if (navigator.onLine) {
      syncService.sync();
    }

    // Listen for network restoration and trigger sync
    const handleOnline = () => {
      syncService.sync();
    };
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
