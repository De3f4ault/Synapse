import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Mail, Key, AlertTriangle } from 'lucide-react';

import { loginApiV1AuthLoginPost } from '@/api/generated/services.gen';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/hooks/use-toast';
import {
    GatekeeperLayout,
    SecurityBadge,
    QuantumInput,
    BiometricScanner
} from '@/components/auth/GatekeeperUI';

export function LoginPage() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const setAuth = useAuthStore((state) => state.setAuth);

    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const loginMutation = useMutation({
        mutationFn: loginApiV1AuthLoginPost,
        onSuccess: (data) => {
            setStatus('success');
            setTimeout(() => {
                setAuth(data.access_token, null);
                toast({
                    title: 'Welcome back',
                    description: 'Successfully logged in to Synapse.',
                });
                navigate('/dashboard');
            }, 1000);
        },
        onError: (error: any) => {
            console.error('Login error:', error);
            setStatus('error');
            const message = error.response?.data?.detail || 'Invalid Credentials';
            setErrorMsg(message);
            toast({
                variant: 'destructive',
                title: 'Login Failed',
                description: message,
            });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');

        if (!email || !password) {
            setStatus('error');
            setErrorMsg('MISSING_CREDENTIALS');
            return;
        }

        setStatus('loading');

        loginMutation.mutate({
            requestBody: {
                email: email.trim(),
                password: password,
            },
        });
    };

    return (
        <GatekeeperLayout status={status}>
            <SecurityBadge status={status} />

            <form onSubmit={handleSubmit}>
                <QuantumInput
                    label="Email Address"
                    icon={Mail}
                    type="email"
                    value={email}
                    onChange={(e: any) => setEmail(e.target.value)}
                    disabled={status === 'loading' || status === 'success'}
                    error={errorMsg && !email ? 'REQUIRED' : undefined}
                />

                <QuantumInput
                    label="Password"
                    icon={Key}
                    type="password"
                    value={password}
                    onChange={(e: any) => setPassword(e.target.value)}
                    disabled={status === 'loading' || status === 'success'}
                    error={errorMsg && !password ? 'REQUIRED' : undefined}
                />

                <BiometricScanner
                    onClick={handleSubmit}
                    loading={status === 'loading'}
                    label="Sign In"
                    disabled={status === 'success'}
                />
            </form>

            <div className="mt-6 text-center">
                <Link
                    to="/auth/register"
                    className={`
                    inline-flex items-center gap-2 text-sm text-slate-500
                    hover:text-cyan-400 transition-colors
                    ${status === 'loading' ? 'pointer-events-none opacity-50' : ''}
                `}
                >
                    <span>Don't have an account?</span>
                    <span className="font-medium text-cyan-500 hover:underline">Sign up</span>
                </Link>
            </div>
        </GatekeeperLayout>
    );
}
