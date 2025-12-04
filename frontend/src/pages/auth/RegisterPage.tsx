import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Key, ChevronRight, User, Shield } from 'lucide-react';

import { registerApiV1AuthRegisterPost } from '@/api/generated/services.gen';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/hooks/use-toast';
import {
    GatekeeperLayout,
    SecurityBadge,
    QuantumInput,
    BiometricScanner
} from '@/components/auth/GatekeeperUI';

export function RegisterPage() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const setAuth = useAuthStore((state) => state.setAuth);

    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const registerMutation = useMutation({
        mutationFn: registerApiV1AuthRegisterPost,
        onSuccess: async (data) => {
            setStatus('success');
            setTimeout(() => {
                setAuth(data.access_token, data as any);
                toast({
                    title: 'Identity Verified',
                    description: 'Welcome to Synapse. Uplink established.',
                });
                navigate('/dashboard');
            }, 1500);
        },
        onError: (error: any) => {
            setStatus('error');
            const message = error.response?.data?.detail || 'Registration Failed';
            setErrorMsg(message);
            toast({
                variant: 'destructive',
                title: 'Registration Failed',
                description: message,
            });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');

        if (password !== confirmPassword) {
            setStatus('error');
            setErrorMsg('PASSWORD_MISMATCH');
            return;
        }

        if (password.length < 8) {
            setStatus('error');
            setErrorMsg('PASSWORD_TOO_SHORT');
            return;
        }

        if (!fullName || !email) {
            setStatus('error');
            setErrorMsg('INCOMPLETE_DATA');
            return;
        }

        setStatus('loading');

        registerMutation.mutate({
            requestBody: {
                full_name: fullName,
                email,
                password,
            },
        });
    };

    return (
        <GatekeeperLayout status={status}>
        <SecurityBadge status={status} />

        <form onSubmit={handleSubmit}>
        <AnimatePresence>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <QuantumInput
        label="OPERATIVE ID (NAME)"
        icon={User}
        value={fullName}
        onChange={(e: any) => setFullName(e.target.value)}
        disabled={status === 'loading' || status === 'success'}
        />
        </motion.div>
        </AnimatePresence>

        <QuantumInput
        label="NEURAL LINK (EMAIL)"
        icon={Mail}
        type="email"
        value={email}
        onChange={(e: any) => setEmail(e.target.value)}
        disabled={status === 'loading' || status === 'success'}
        />

        <QuantumInput
        label="ACCESS CODE"
        icon={Key}
        type="password"
        value={password}
        onChange={(e: any) => setPassword(e.target.value)}
        disabled={status === 'loading' || status === 'success'}
        error={errorMsg && !password ? 'REQUIRED' : undefined}
        />

        <QuantumInput
        label="VERIFY CODE"
        icon={Shield}
        type="password"
        value={confirmPassword}
        onChange={(e: any) => setConfirmPassword(e.target.value)}
        disabled={status === 'loading' || status === 'success'}
        error={errorMsg === 'PASSWORD_MISMATCH' ? 'MISMATCH' : undefined}
        />

        <BiometricScanner
        onClick={handleSubmit}
        loading={status === 'loading'}
        label="INITIALIZE UPLINK"
        disabled={status === 'success'}
        />
        </form>

        <div className="mt-8 text-center">
        <Link
        to="/auth/login"
        className={`
            inline-flex items-center gap-2 text-[10px] font-mono tracking-widest text-slate-500
            hover:text-cyan-400 transition-colors uppercase
            ${status === 'loading' ? 'pointer-events-none opacity-50' : ''}
            `}
            >
            <span>ALREADY CREDENTIALED?</span>
            <span className="border-b border-cyan-500/30 pb-0.5">ACCESS TERMINAL</span>
            <ChevronRight size={10} />
            </Link>
            </div>
            </GatekeeperLayout>
    );
}
