export interface AudioChunk {
    data: ArrayBuffer;
    timestamp: number;
    sampleRate: number;
}
export declare class AudioProcessor {
    private audioBuffer;
    private bufferStartTime;
    private readonly BUFFER_DURATION_MS;
    processAudio(audioData: AudioChunk): Promise<void>;
    private processBuffer;
    private combineAudioChunks;
    private normalizeAudio;
    private createWavFile;
    private runWhisperTranscription;
    private resetBuffer;
}
//# sourceMappingURL=audioProcessor.d.ts.map