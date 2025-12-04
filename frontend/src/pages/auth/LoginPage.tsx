import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Mail, Key, ChevronRight, AlertTriangle } from 'lucide-react';

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
                    title: 'Access Granted',
                    description: 'Welcome back, Operative.',
                });
                navigate('/dashboard');
            }, 1500);
        },
        onError: (error: any) => {
            console.error('Login error:', error);
            setStatus('error');
            const message = error.response?.data?.detail || 'Invalid Credentials';
            setErrorMsg(message);
            toast({
                variant: 'destructive',
                title: 'Access Denied',
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
        label="NEURAL LINK (EMAIL)"
        icon={Mail}
        type="email"
        value={email}
        onChange={(e: any) => setEmail(e.target.value)}
        disabled={status === 'loading' || status === 'success'}
        error={errorMsg && !email ? 'REQUIRED' : undefined}
        />

        <QuantumInput
        label="ACCESS CODE (PASSWORD)"
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
        label="AUTHENTICATE"
        disabled={status === 'success'}
        />
        </form>

        <div className="mt-8 text-center">
        <Link
        to="/auth/register"
        className={`
            inline-flex items-center gap-2 text-[10px] font-mono tracking-widest text-slate-500
            hover:text-cyan-400 transition-colors uppercase
            ${status === 'loading' ? 'pointer-events-none opacity-50' : ''}
            `}
            >
            <span>NO CLEARANCE?</span>
            <span className="border-b border-cyan-500/30 pb-0.5">REQUEST ACCESS</span>
            <ChevronRight size={10} />
            </Link>
            </div>
            </GatekeeperLayout>
    );
}
