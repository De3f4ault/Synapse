import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { loginApiV1AuthLoginPost } from '@/api/generated/services.gen';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Brain } from 'lucide-react';

export function LoginPage() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const setAuth = useAuthStore((state) => state.setAuth);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const loginMutation = useMutation({
        mutationFn: loginApiV1AuthLoginPost,
        onSuccess: (data) => {
            setAuth(data.access_token, null);

            toast({
                title: 'Welcome back!',
                description: 'Successfully logged in.',
            });

            navigate('/dashboard');
        },
        onError: (error: any) => {
            console.error('Login error:', error);
            toast({
                variant: 'destructive',
                title: 'Login failed',
                description: error.response?.data?.detail || 'Invalid email or password',
            });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        console.log('Login attempt with:', { email, password: password ? '***' : '(empty)' });

        if (!email || !password) {
            toast({
                variant: 'destructive',
                title: 'Validation Error',
                description: 'Please enter both email and password',
            });
            return;
        }

        const payload = {
            requestBody: {
                email: email.trim(),
                password: password,
            },
        };

        console.log('Sending payload:', payload);

        loginMutation.mutate(payload);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary p-4">
        <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-2">
        <Brain className="h-12 w-12 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold">Welcome to Synapse</CardTitle>
        <CardDescription>
        Enter your credentials to access your account
        </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
        {loginMutation.isError && (
            <Alert variant="destructive">
            <AlertDescription>
            {(loginMutation.error as any)?.response?.data?.detail || 'Invalid email or password'}
            </AlertDescription>
            </Alert>
        )}

        <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
        id="email"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        disabled={loginMutation.isPending}
        autoComplete="email"
        />
        </div>

        <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
        id="password"
        type="password"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        disabled={loginMutation.isPending}
        autoComplete="current-password"
        />
        </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
        <Button
        type="submit"
        className="w-full"
        disabled={loginMutation.isPending || !email || !password}
        >
        {loginMutation.isPending ? 'Logging in...' : 'Login'}
        </Button>

        <p className="text-sm text-center text-muted-foreground">
        Don't have an account?{' '}
        <Link
        to="/auth/register"
        className="text-primary hover:underline font-medium"
        >
        Sign up
        </Link>
        </p>
        </CardFooter>
        </form>
        </Card>
        </div>
    );
}
