import { Buffer } from 'node:buffer';
export interface AudioChunk {
    data: ArrayBuffer;
    timestamp: number;
    sampleRate: number;
}
export declare class AudioProcessor {
    protected audioBuffer: ArrayBuffer[];
    protected bufferStartTime: number;
    protected readonly BUFFER_DURATION_MS = 30000;
    processAudio(audioData: AudioChunk): Promise<void>;
    protected processBuffer(): Promise<void>;
    protected combineAudioChunks(chunks: ArrayBuffer[]): ArrayBuffer;
    protected normalizeAudio(audioData: ArrayBuffer): ArrayBuffer;
    protected createWavFile(audioData: ArrayBuffer): Buffer;
    protected runWhisperTranscription(wavFile: Buffer): Promise<{
        text: string;
        startMs: number;
        endMs: number;
    }>;
    protected resetBuffer(): void;
}
//# sourceMappingURL=audioProcessor.d.ts.map