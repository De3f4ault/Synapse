
import { useState, useEffect } from 'react';
import { audioAnalysis } from '../core/AudioAnalysis';
import type { AudioSignal } from '../core/AudioAnalysis';
import { useAudioUIStore } from '../store/useAudioUIStore';

/**
 * useAudioSignals - The "Bridge"
 * 
 * Subscribes to the AudioAnalysis service and bridges signals into React state.
 * Throttled to ~15fps within AudioAnalysis, but we can throttle further here if needed.
 * 
 * Returns: Current AudioSignal or null if disabled/silent.
 */
export function useAudioSignals() {
    const { synesthesiaEnabled, playIntent } = useAudioUIStore();
    const [signals, setSignals] = useState<AudioSignal | null>(null);
    
    useEffect(() => {
        if (!synesthesiaEnabled || !playIntent) {
             setSignals(null);
             return;
        }

        const handleSignal = (signal: AudioSignal) => {
            setSignals(signal);
        };

        const unsubscribe = audioAnalysis.subscribe(handleSignal);
        return () => unsubscribe();
    }, [synesthesiaEnabled, playIntent]);

    return signals;
}

