/**
 * AudioGraph - WebAudio Node Topology
 *
 * Creates and wires the audio graph nodes.
 * Zero behavior, zero state machines. Just topology.
 *
 * ## Graph Structure (Pre-Ducking Analysis Tap)
 *
 * [Music Src] -> [Music Gain] --+--> [Analysis Merger] --> AudioAnalysis
 *                               |
 * [Amb Src]   -> [Amb Gain]   --+--> [Master Gain] -> [Ducking Gain] -> [Destination]
 *
 * Rationale: Visuals reflect TRUE music energy, not ducked output.
 */

import { audioAnalysis } from './AudioAnalysis';

export interface AudioGraphHandles {
  masterGain: GainNode;
  musicGain: GainNode;
  ambienceGain: GainNode;
  duckingGain: GainNode;
  analysisMerger: GainNode;
}

/**
 * Build the complete audio graph.
 * Returns handles to all gain nodes for external control.
 */
export function buildAudioGraph(ctx: AudioContext): AudioGraphHandles {
  // Create nodes
  const masterGain = ctx.createGain();
  const musicGain = ctx.createGain();
  const ambienceGain = ctx.createGain();
  const duckingGain = ctx.createGain();
  const analysisMerger = ctx.createGain();

  // Set defaults
  duckingGain.gain.value = 1.0;
  analysisMerger.gain.value = 1.0;

  // Wire playback path
  musicGain.connect(masterGain);
  ambienceGain.connect(masterGain);
  masterGain.connect(duckingGain);
  duckingGain.connect(ctx.destination);

  // Wire analysis tap (pre-ducking)
  musicGain.connect(analysisMerger);
  ambienceGain.connect(analysisMerger);
  audioAnalysis.connectSource(analysisMerger, ctx);

  return {
    masterGain,
    musicGain,
    ambienceGain,
    duckingGain,
    analysisMerger,
  };
}
