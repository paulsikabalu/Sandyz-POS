import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '../store/useAuthStore';
import { useToast } from '@/hooks/use-toast';
import {
    LogIn,
    Eye,
    EyeOff,
    Store,
    Loader2,
    TrendingUp,
    ShoppingBag,
    Users,
} from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { login } = useAuth();
    const [, navigate] = useLocation();
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !password) {
            toast({
                title: 'Validation Error',
                description: 'Please enter email and password',
                variant: 'destructive',
            });
            return;
        }

        setIsSubmitting(true);

        try {
            await login(email, password);

            toast({
                title: 'Welcome Back!',
                description: 'Login successful',
            });

            navigate('/');
        } catch (err: any) {
            toast({
                title: 'Login Failed',
                description: err?.message ?? 'Invalid email or password',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-background to-primary/10 flex items-center justify-center p-6">
            <div className="w-full max-w-5xl overflow-hidden border border-border/50 bg-card shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
                <div className="grid lg:grid-cols-2 min-h-[320px]">
                    {/* Left Side */}
                    <div className="relative hidden lg:block min-h-[320px]">
                        <img
                            src="https://plus.unsplash.com/premium_photo-1678051227112-abbdccd19360?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTd8fHNoYXdhcm1hfGVufDB8fDB8fHww"
                            alt="Restaurant"
                            className="absolute inset-0 h-full w-full object-cover"
                        />

                        <div className="absolute inset-0 bg-gradient-to-br from-black/0 via-black/0 to-primary/0" />


                        {/* Hero Content */}
                        <div className="relative z-10 flex h-full flex-col justify-end p-6 text-dark">
                            
                            <h1 className="max-w-sm text-2xl font-bold leading-tight">
                                Run Your Restaurant Like a Pro.
                            </h1>

                            <p className="mt-2 max-w-sm text-xs text-dark/80">
                                Manage orders, inventory, staff, kitchen operations,
                                and reporting from one powerful POS system.
                            </p>
                        </div>
                    </div>

                    {/* Right Side */}
                    <div className="flex items-center justify-center p-5 lg:p-6">
                        <div className="w-full max-w-sm">
                            {/* Desktop Logo */}
                            <div className="hidden lg:block mb-5">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center bg-primary text-primary-foreground shadow-lg">
                                        <Store size={20} />
                                    </div>

                                    <div>
                                        <h1 className="text-lg font-bold">Sandyz POS</h1>
                                        <p className="text-xs text-muted-foreground">
                                            Restaurant Point of Sale
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Mobile Logo */}
                            <div className="lg:hidden text-center mb-6">
                                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center bg-primary text-primary-foreground shadow-lg">
                                    <Store size={22} />
                                </div>

                                <h1 className="text-xl font-bold">Sandyz POS</h1>

                                <p className="text-sm text-muted-foreground">
                                    Restaurant Point of Sale
                                </p>
                            </div>

                            {/* Header */}
                            <div className="mb-4">
         

                                <p className="mt-1 text-xs text-muted-foreground">
                                    Sign in to continue managing your business.
                                </p>
                            </div>

                            {/* Login Form */}
                            <form onSubmit={handleSubmit} className="space-y-3">
                                <div>
                                    <label className="mb-1 block text-xs font-medium">
                                        Email Address
                                    </label>

                                    <input
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder="admin@sandyz.com"
                                        autoComplete="email"
                                        autoFocus
                                        className="h-9 w-full border border-border bg-background px-3 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-medium">
                                        Password
                                    </label>

                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            placeholder="Enter your password"
                                            autoComplete="current-password"
                                            className="h-9 w-full border border-border bg-background px-3 pr-10 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
                                        />

                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                            {showPassword ? (
                                                <EyeOff size={16} />
                                            ) : (
                                                <Eye size={16} />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting || !email || !password}
                                    className="flex h-9 w-full items-center justify-center gap-2 bg-primary text-primary-foreground text-sm font-semibold shadow-lg shadow-primary/20 transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 size={14} className="animate-spin" />
                                            Signing In...
                                        </>
                                    ) : (
                                        <>
                                            <LogIn size={14} />
                                            Sign In
                                        </>
                                    )}
                                </button>

                                <div className="border border-border bg-muted/40 p-2 text-center">
                                    <p className="text-[10px] text-muted-foreground">
                                        Demo Credentials
                                    </p>

                                    <p className="mt-1 text-xs font-medium">
                                        admin@sandyz.com / admin123
                                    </p>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}