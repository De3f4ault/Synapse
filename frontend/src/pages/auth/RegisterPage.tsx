import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { registerApiV1AuthRegisterPost } from '@/api/generated/services.gen';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Brain } from 'lucide-react';

/**
 * Register Page
 *
 * User registration with validation.
 */

export function RegisterPage() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const setAuth = useAuthStore((state) => state.setAuth);

    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const registerMutation = useMutation({
        mutationFn: registerApiV1AuthRegisterPost,
        onSuccess: async (data) => {
            setAuth(data.access_token, data as any);

            toast({
                title: 'Account created!',
                description: 'Welcome to Synapse. Let\'s start learning.',
            });

            navigate('/dashboard');
        },
        onError: (error: any) => {
            toast({
                variant: 'destructive',
                title: 'Registration failed',
                description: error.response?.data?.detail || 'Please try again',
            });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validate password match
        if (password !== confirmPassword) {
            toast({
                variant: 'destructive',
                title: 'Passwords do not match',
                description: 'Please ensure both passwords are identical',
            });
            return;
        }

        // Validate password length
        if (password.length < 8) {
            toast({
                variant: 'destructive',
                title: 'Password too short',
                description: 'Password must be at least 8 characters',
            });
            return;
        }

        registerMutation.mutate({
            requestBody: {
                full_name: fullName,
                email,
                password,
            },
        });
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary p-4">
        <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-2">
        <Brain className="h-12 w-12 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold">Create an Account</CardTitle>
        <CardDescription>
        Sign up to start your learning journey
        </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
        {registerMutation.isError && (
            <Alert variant="destructive">
            <AlertDescription>
            {(registerMutation.error as any)?.response?.data?.detail ||
                'Registration failed. Please try again.'}
                </AlertDescription>
                </Alert>
        )}

        <div className="space-y-2">
        <Label htmlFor="fullName">Full Name</Label>
        <Input
        id="fullName"
        type="text"
        placeholder="John Doe"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        required
        disabled={registerMutation.isPending}
        />
        </div>

        <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
        id="email"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        disabled={registerMutation.isPending}
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
        minLength={8}
        disabled={registerMutation.isPending}
        />
        <p className="text-xs text-muted-foreground">
        Must be at least 8 characters
        </p>
        </div>

        <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
        id="confirmPassword"
        type="password"
        placeholder="••••••••"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
        disabled={registerMutation.isPending}
        />
        </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
        <Button
        type="submit"
        className="w-full"
        disabled={registerMutation.isPending}
        >
        {registerMutation.isPending ? 'Creating Account...' : 'Create Account'}
        </Button>

        <p className="text-sm text-center text-muted-foreground">
        Already have an account?{' '}
        <Link
        to="/auth/login"
        className="text-primary hover:underline font-medium"
        >
        Log in
        </Link>
        </p>
        </CardFooter>
        </form>
        </Card>
        </div>
    );
}
