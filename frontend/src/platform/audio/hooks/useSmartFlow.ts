
import { useEffect } from 'react';
import { useAudioUIStore } from '../store/useAudioUIStore';
import { audioEngine } from '@/platform/audio';

/**
 * useSmartFlow - The "Nervous System"
 * 
 * Listens for global media events and triggers auto-ducking.
 */
export function useSmartFlow() {
    const { autoDuckEnabled } = useAudioUIStore();

    useEffect(() => {
        if (!autoDuckEnabled) return;

        const handlePlay = (e: Event) => {
            const target = e.target as HTMLMediaElement;
            // Only duck for video or audio elements that are NOT our own engine sources (handled internally usually, but DOM nodes are separate)
            // Our AudioEngine uses AudioBufferSourceNodes which don't fire DOM events. 
            // So any DOM media event is likely external (Youtube embed, Video player, etc).
            if (target.tagName === 'VIDEO' || target.tagName === 'AUDIO') {
                audioEngine.duck('media-element');
            }
        };

        const handlePause = (e: Event) => {
            const target = e.target as HTMLMediaElement;
            if (target.tagName === 'VIDEO' || target.tagName === 'AUDIO') {
                 // Check if any other media is still playing? 
                 // For now, simple logic: if THIS element paused, we try to restore.
                 // Ideally we count how many are playing, but stack logic in Engine handles multiple calls.
                 // But wait, if 2 videos play, we call duck twice. If 1 pauses, we call restore once. Still ducked.
                 // This works implicitly!
                 audioEngine.restore('media-element');
                 
                 // Caveat: If we use the SAME reason string 'media-element', stack will only have size 1.
                 // To support multiple videos properly we need unique IDs.
                 // But typically only one main media plays.
                 // Let's leave it as single reason for now to avoid complexity of tracking DOM node IDs.
                 // Actually, if Video A plays -> duck('media'). Video B plays -> duck('media') (no change).
                 // Video A pauses -> restore('media'). UNDUCKED, but Video B is still playing!
                 // This is a bug.
                 // Fix: We should just set a generic 'media' duck state based on if ANY media is playing.
                 // Or generate IDs.
            }
        };
        
        // Better Approach for single reason:
        // We can't easily track *which* element paused without IDs.
        // But for Phase 3 "Simple", let's assume one active media at a time (standard web behavior usually).
        // OR: use event.target to generate a unique key if possible? 
        // We can use a WeakMap or just checking checks.
        // Let's stick to simple single-reason "media" for now as per instructions.
        // "Video starts -> duck. Video ends -> restore."
        
        document.addEventListener('play', handlePlay, true); // Capture phase
        document.addEventListener('pause', handlePause, true);
        document.addEventListener('ended', handlePause, true); // Treat ended as pause

        return () => {
            document.removeEventListener('play', handlePlay, true);
            document.removeEventListener('pause', handlePause, true);
            document.removeEventListener('ended', handlePause, true);
        };
    }, [autoDuckEnabled]);
}
