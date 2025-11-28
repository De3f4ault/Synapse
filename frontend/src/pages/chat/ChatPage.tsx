/**
 * ChatPage - Oracle Theme Integration
 * Complete mystical interface with eye tracking and ethereal animations
 *
 * Location: ChatPage.tsx
 */

import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Atom, ChevronLeft, ChevronRight } from 'lucide-react';

// Components
import { MinimalSidebar } from './components/sidebar/MinimalSidebar';
import { ChatContainer } from './components/main-area/ChatContainer';
import { ChatInput } from './components/main-area/ChatInput';
import { MainInput } from './components/input/MainInput';
import { PreviewSidebar } from './components/preview/PreviewSidebar';

// Hooks
import { useSidebarCollapse } from './hooks/useSidebarCollapse';
import { usePreviewSidebar } from './hooks/usePreviewSidebar';
import { useChatSession } from './hooks/useChatSession';
import { cn } from '@/lib/utils';

// Styles
import './styles/scrollbar.css';
import './styles/global-overrides.css';
import './styles/oracle-theme.css';
import './styles/animations.css';

// Types
import { NeuralDensity } from './types/chat.types';

// --- ORACLE'S EYE VISUALIZER (Blurred, Ethereal) ---
const OracleEye = ({ isActive }: { isActive: boolean }) => {
    return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-0 opacity-40">
        {/* Outer glow */}
        <div className={`absolute inset-0 transition-all duration-1000 ${isActive ? 'scale-110 opacity-60' : 'scale-100 opacity-30'}`}>
        <div className="absolute inset-0 bg-gradient-radial from-cyan-900/20 via-purple-900/10 to-transparent blur-[120px]" />
        </div>

        {/* The Eye structure */}
        <div className="relative w-[500px] h-[280px] flex items-center justify-center">
        {/* Eye socket/outline - outer ellipse */}
        <motion.div
        className="absolute w-full h-full rounded-[50%] border-2 border-cyan-500/10"
        animate={{
            boxShadow: isActive
            ? ['0 0 20px rgba(6,182,212,0.1)', '0 0 40px rgba(6,182,212,0.2)', '0 0 20px rgba(6,182,212,0.1)']
            : '0 0 10px rgba(6,182,212,0.05)',
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Iris - Middle circle with slower rotation */}
        <motion.div
        className="absolute w-48 h-48 rounded-full border border-cyan-400/20 bg-gradient-to-br from-cyan-950/30 to-purple-950/20 backdrop-blur-md"
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        >
        {/* Iris pattern lines */}
        {[...Array(12)].map((_, i) => (
            <div
            key={i}
            className="absolute top-1/2 left-1/2 w-[1px] h-16 bg-gradient-to-t from-cyan-500/10 to-transparent origin-bottom"
            style={{
                transform: `translate(-50%, -100%) rotate(${i * 30}deg)`,
            }}
            />
        ))}
        </motion.div>

        {/* Pupil - Center with pulse */}
        <motion.div
        className={cn(
            "absolute w-20 h-20 rounded-full flex items-center justify-center backdrop-blur-sm transition-all duration-1000",
            isActive
            ? "bg-cyan-500/30 shadow-[0_0_60px_rgba(6,182,212,0.4)]"
            : "bg-black/60 shadow-[0_0_20px_rgba(0,0,0,0.5)]"
        )}
        animate={{
            scale: isActive ? [1, 1.1, 1] : 1,
        }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
        {/* Inner pupil glow */}
        <div className={cn(
            "w-10 h-10 rounded-full transition-all duration-1000",
            isActive ? "bg-cyan-400/40 shadow-[0_0_30px_cyan]" : "bg-slate-800"
        )} />
        </motion.div>

        {/* Orbital particles around the eye */}
        {[...Array(6)].map((_, i) => (
            <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full bg-cyan-400/30"
            animate={{
                x: [
                    Math.cos((i * 60 * Math.PI) / 180) * 180,
                                      Math.cos(((i * 60 + 360) * Math.PI) / 180) * 180,
                ],
                y: [
                    Math.sin((i * 60 * Math.PI) / 180) * 100,
                                      Math.sin(((i * 60 + 360) * Math.PI) / 180) * 100,
                ],
            }}
            transition={{
                duration: 20,
                repeat: Infinity,
                ease: "linear",
                delay: i * 0.5,
            }}
            />
        ))}
        </div>
        </div>
    );
};

export const ChatPage: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();

    const { isCollapsed, toggleSidebar } = useSidebarCollapse();
    const { isOpen: isPreviewOpen } = usePreviewSidebar();

    const { data: session } = useChatSession(sessionId ? parseInt(sessionId) : undefined);
    const isActiveSession = !!sessionId;

    // Oracle UI State
    const [neuralDensity, setNeuralDensity] = useState<NeuralDensity>('HIGH');
    const [isDeepGnosis, setIsDeepGnosis] = useState(false);

    // Simulate processing state for visual FX
    const isProcessing = false;

    return (
        <div className={`fixed inset-0 bg-[#020408] text-slate-200 font-sans selection:bg-cyan-500/30 flex overflow-hidden ${isDeepGnosis ? 'gnosis-active' : ''}`}>

        {/* Chromatic Aberration & Grain (Deep Gnosis) */}
        {isDeepGnosis && (
            <div className="absolute inset-0 z-50 pointer-events-none mix-blend-overlay opacity-30 bg-noise" style={{ filter: 'contrast(150%) brightness(1000%)' }} />
        )}

        {/* Ambient Background Layer 1 */}
        <div className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#020408] to-black" />

        {/* Ambient Background Layer 2 (Noise) */}
        <div className={`absolute inset-0 z-0 bg-noise mix-blend-overlay pointer-events-none transition-opacity duration-1000 ${neuralDensity === 'HIGH' ? 'opacity-20' : 'opacity-5'}`} />

        {/* Left Sidebar (Grimoire) */}
        <MinimalSidebar />

        {/* Main Content Area */}
        <main
        className={cn(
            'flex-1 h-screen relative z-10 flex flex-col',
            'transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
                      'overflow-hidden'
        )}
        >
        {/* Top Header Bar with Toggle */}
        <div className="h-20 flex items-center justify-between px-8 z-20 relative flex-shrink-0">
        <button
        onClick={toggleSidebar}
        className="p-2 -ml-2 text-slate-500 hover:text-cyan-400 transition-colors rounded-full hover:bg-white/5"
        >
        {isCollapsed ? <ChevronRight size={24}/> : <ChevronLeft size={24}/>}
        </button>

        <div className="flex flex-col items-center">
        <span className="font-serif text-2xl text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-500 tracking-widest font-bold">
        ORACLE
        </span>
        <div className="flex items-center gap-2">
        <div className={`w-1.5 h-1.5 rounded-full ${isProcessing ? 'bg-purple-500 animate-pulse' : 'bg-emerald-500'}`} />
        <span className="text-[9px] font-mono text-slate-500 tracking-[0.3em] uppercase">
        {isProcessing ? 'COMMUNING...' : 'AWAITING QUERY'}
        </span>
        </div>
        </div>

        <div className="w-8" />
        </div>

        {/* Oracle Eye - Positioned absolutely behind content */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <OracleEye isActive={isProcessing || isActiveSession} />
        </div>

        {isActiveSession ? (
            // Active Session Layout - Full height chat
            <div className="flex-1 flex flex-col relative z-10 min-h-0">
            {/* Messages - Scrollable area */}
            <div className="flex-1 overflow-y-auto oracle-scrollbar min-h-0">
            <ChatContainer hasMessages={true} isDeepGnosis={isDeepGnosis} />
            </div>

            {/* Input - Fixed at bottom */}
            <div className="w-full max-w-4xl mx-auto relative z-20 pb-6 px-4 flex-shrink-0">
            <ChatInput
            sessionId={sessionId ? parseInt(sessionId) : undefined}
            />
            </div>
            </div>
        ) : (
            // New Session - Welcome Screen - Full height
            <div className="flex-1 flex flex-col items-center justify-center px-4 relative z-10 min-h-0">
            {/* Welcome Screen - Centered */}
            <div className="flex-1 flex items-center justify-center w-full">
            <ChatContainer hasMessages={false} />
            </div>

            {/* Input Section - Fixed at bottom */}
            <div className="w-full max-w-[760px] pb-[8vh] relative z-20 flex-shrink-0">
            <MainInput isCentered={true} />

            {/* Gnosis Toggle */}
            <div className="flex justify-center mt-6">
            <button
            onClick={() => setIsDeepGnosis(!isDeepGnosis)}
            className={`text-[10px] font-bold tracking-widest uppercase transition-colors ${isDeepGnosis ? 'text-amber-500' : 'text-slate-600 hover:text-slate-400'}`}
            >
            Deep Gnosis {isDeepGnosis ? 'Active' : 'Offline'}
            </button>
            </div>
            </div>
            </div>
        )}
        </main>

        {/* Right Sidebar */}
        <PreviewSidebar isOpen={isPreviewOpen} onClose={() => {}} files={[]} />

        {/* Mystical Particles Overlay */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {[...Array(30)].map((_, i) => (
            <div
            key={i}
            className="absolute w-1 h-1 bg-cyan-500/20 rounded-full animate-float"
            style={{
                left: `${Math.random() * 100}%`,
                                       top: `${Math.random() * 100}%`,
                                       animationDelay: `${Math.random() * 5}s`,
                                       animationDuration: `${5 + Math.random() * 5}s`,
            }}
            />
        ))}
        </div>
        </div>
    );
};

export default ChatPage;
