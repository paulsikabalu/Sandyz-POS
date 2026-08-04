import { type ReactNode } from 'react';
import { Route } from 'wouter';
import { useAuth, hasRole, type UserRole } from '../store/useAuthStore';
import Login from '@/pages/Login';

type ProtectedRouteProps = {
  path: string;
  component: () => ReactNode;
  roles?: UserRole[];
};

/**
 * Route wrapper that checks authentication and optional role-based access.
 * Redirects to login if not authenticated.
 * Shows "Access Denied" if authenticated but missing required role.
 */
export function ProtectedRoute({ path, component: Component, roles }: ProtectedRouteProps) {
  return (
    <Route path={path}>
      <RouteGuard roles={roles}>
        <Component />
      </RouteGuard>
    </Route>
  );
}

function RouteGuard({ children, roles }: { children: ReactNode; roles?: UserRole[] }) {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium">Loading…</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show login page in-place
  if (!isAuthenticated || !user) {
    return <Login />;
  }

  // Check role-based access
  if (roles && roles.length > 0 && !hasRole(user, roles)) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔒</span>
          </div>
          <h2 className="text-lg font-bold text-foreground mb-1">Access Denied</h2>
          <p className="text-sm text-muted-foreground mb-4">
            You don't have permission to access this page. Required role(s): {roles.join(', ')}
          </p>
          <p className="text-xs text-muted-foreground">
            Your current role: <span className="font-semibold text-foreground">{user.role}</span>
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

