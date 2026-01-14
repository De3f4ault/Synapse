
/**
 * AudioAnalysis - The "Sensory" Layer
 * 
 * Provides real-time frequency analysis for visualizers without clogging the main thread.
 * 
 * ## Invariants
 * - Performs NO work when subscriber count is 0
 * - Analysis loop auto-stops when last subscriber unsubscribes
 * - requestAnimationFrame naturally pauses when tab is hidden
 * - Energy-gated: pauses emission during extended silence to save battery
 * 
 * ## Performance Characteristics
 * - fftSize = 256 (128 frequency bins) - low resolution, low CPU
 * - Throttled to ~15fps - sufficient for smooth visuals
 * - Energy gate: pauses after ~2s of silence
 */

export interface AudioSignal {
    energy: number; // 0-1 (Overall volume/intensity)
    bass: number;   // 0-1 (Low freq 20-250Hz)
    mids: number;   // 0-1 (Mid freq 250-4kHz)
    treble: number; // 0-1 (High freq 4k-20kHz)
}

type SignalCallback = (signal: AudioSignal) => void;

class AudioAnalysis {
    private analyser: AnalyserNode | null = null;
    private bufferLength: number = 0;
    private dataArray: Uint8Array | null = null;
    private isAnalyzing: boolean = false;
    private animationFrameId: number | null = null;
    
    // Throttling
    private lastEmitTime: number = 0;
    private readonly emitInterval: number = 1000 / 15; // Cap at ~15fps
    
    // Energy Gating - saves battery during silence
    private silentFrameCount: number = 0;
    private readonly SILENCE_THRESHOLD = 0.02;  // ~-34dB normalized
    private readonly SILENCE_FRAMES_TO_GATE = 30;  // ~2 seconds at 15fps
    private isGated: boolean = false;
    
    // Subscribers
    private subscribers: Set<SignalCallback> = new Set();
    
    private static instance: AudioAnalysis;
    
    private constructor() {
        // Private for Singleton
    }
    
    public static getInstance(): AudioAnalysis {
        if (!AudioAnalysis.instance) {
            AudioAnalysis.instance = new AudioAnalysis();
        }
        return AudioAnalysis.instance;
    }
    
    /**
     * Connect an AudioNode to the analyser.
     * Called by AudioEngine during initialization.
     */
    public connectSource(sourceNode: AudioNode, context: AudioContext) {
        if (!this.analyser) {
            this.analyser = context.createAnalyser();
            this.analyser.fftSize = 256; // Low resolution, sufficient for visuals
            this.analyser.smoothingTimeConstant = 0.8;
            
            this.bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(this.bufferLength);
        }
        
        try {
            sourceNode.connect(this.analyser);
            // Only start if we have subscribers
            if (this.subscribers.size > 0) {
                this.startAnalysisLoop();
            }
        } catch (e) {
            console.error("Failed to connect analyser:", e);
        }
    }
    
    /**
     * Subscribe to audio signals.
     * Returns an unsubscribe function.
     * 
     * INVARIANT: Loop only runs when subscribers > 0
     */
    public subscribe(callback: SignalCallback): () => void {
        this.subscribers.add(callback);
        
        // Start loop if not running and we have an analyser
        if (!this.isAnalyzing && this.analyser) {
            this.startAnalysisLoop();
        }
        
        return () => {
            this.subscribers.delete(callback);
            if (this.subscribers.size === 0) {
                this.stopAnalysisLoop();
            }
        };
    }
    
    private startAnalysisLoop() {
        if (this.isAnalyzing) return;
        this.isAnalyzing = true;
        this.isGated = false;
        this.silentFrameCount = 0;
        
        const loop = () => {
            if (!this.isAnalyzing) return;
            
            this.animationFrameId = requestAnimationFrame(loop);
            
            // Throttle to ~15fps
            const now = Date.now();
            if (now - this.lastEmitTime < this.emitInterval) return;
            
            this.processAndEmit();
            this.lastEmitTime = now;
        };
        
        loop();
    }
    
    private stopAnalysisLoop() {
        this.isAnalyzing = false;
        this.isGated = false;
        this.silentFrameCount = 0;
        
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }
    
    private processAndEmit() {
        if (!this.analyser || !this.dataArray) return;
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.analyser.getByteFrequencyData(this.dataArray as any);
        
        // Calculate frequency bands
        // fftSize=256 => 128 bins, ~172Hz per bin at 44.1kHz
        const bass = this.getAverage(0, 2);      // 0-344Hz
        const mids = this.getAverage(3, 20);     // 500Hz-3.4kHz
        const treble = this.getAverage(21, 127); // 3.6kHz+
        const energy = this.getAverage(0, 127);
        
        // Energy gating - pause emission during extended silence
        if (energy < this.SILENCE_THRESHOLD) {
            this.silentFrameCount++;
            if (this.silentFrameCount >= this.SILENCE_FRAMES_TO_GATE) {
                if (!this.isGated) {
                    this.isGated = true;
                    // Emit one final "silent" signal so visualizers can fade
                    this.emitSignal({ energy: 0, bass: 0, mids: 0, treble: 0 });
                }
                return; // Skip further processing while gated
            }
        } else {
            // Reset gate on any audio activity
            this.silentFrameCount = 0;
            this.isGated = false;
        }
        
        this.emitSignal({ energy, bass, mids, treble });
    }
    
    private emitSignal(signal: AudioSignal) {
        this.subscribers.forEach(cb => cb(signal));
    }
    
    private getAverage(startBin: number, endBin: number): number {
        const data = this.dataArray;
        if (!data) return 0;
        
        let sum = 0;
        const safeEnd = Math.min(endBin, this.bufferLength - 1);
        const count = safeEnd - startBin + 1;
        
        if (count <= 0) return 0;
        
        for (let i = startBin; i <= safeEnd; i++) {
            sum += data[i] ?? 0;
        }
        
        // Normalize 0-255 to 0-1
        return (sum / count) / 255;
    }
    
    /**
     * Get the raw AnalyserNode for advanced use cases.
     */
    public getAnalyserNode(): AnalyserNode | null {
        return this.analyser;
    }
    
    /**
     * Check if analysis is currently gated due to silence.
     */
    public isEnergyGated(): boolean {
        return this.isGated;
    }
}

export const audioAnalysis = AudioAnalysis.getInstance();

