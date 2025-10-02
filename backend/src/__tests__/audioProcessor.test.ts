import { describe, it, expect, jest } from '@jest/globals';
import { AudioProcessor, AudioChunk } from '../audioProcessor';

type WhisperResult = {
  text: string;
  startMs: number;
  endMs: number;
};

class TestAudioProcessor extends AudioProcessor {
  public readonly runWhisperMock = jest.fn(
    async (wavFile: Buffer): Promise<WhisperResult> => {
      void wavFile;
      return {
        text: 'mock',
        startMs: 0,
        endMs: 0
      };
    }
  );

  protected override async runWhisperTranscription(wavFile: Buffer) {
    return this.runWhisperMock(wavFile);
  }

  public addChunk(chunk: AudioChunk): void {
    (this as unknown as { audioBuffer: ArrayBuffer[] }).audioBuffer.push(
      chunk.data
    );
  }

  public setBufferStartTime(timestamp: number): void {
    (this as unknown as { bufferStartTime: number }).bufferStartTime = timestamp;
  }

  public async invokeProcessBuffer(): Promise<void> {
    await (
      this as unknown as { processBuffer: () => Promise<void> }
    ).processBuffer();
  }

  public resetInternalBuffer(): void {
    (this as unknown as { resetBuffer: () => void }).resetBuffer();
  }

  public getBufferLength(): number {
    return (this as unknown as { audioBuffer: ArrayBuffer[] }).audioBuffer.length;
  }

  public getBufferStartTime(): number {
    return (this as unknown as { bufferStartTime: number }).bufferStartTime;
  }
}

describe('AudioProcessor', () => {
  const createChunk = (timestamp: number, byteLength = 8): AudioChunk => ({
    data: new Uint8Array(Array(byteLength).fill(1)).buffer,
    timestamp,
    sampleRate: 16000
  });

  it('processes buffered audio when duration threshold is reached', async () => {
    const processor = new TestAudioProcessor();

    await processor.processAudio(createChunk(0));
    await processor.processAudio(createChunk(10_000));
  await processor.processAudio(createChunk(60_500));

    expect(processor.getBufferLength()).toBe(0);
    expect(processor.getBufferStartTime()).toBe(0);
  });

  it('invokes Whisper transcription when flushing a full buffer', async () => {
    const processor = new TestAudioProcessor();

    const chunkOne = createChunk(0);
    const chunkTwo = createChunk(20_000);

    processor.addChunk(chunkOne);
    processor.addChunk(chunkTwo);
    processor.setBufferStartTime(0);

    await processor.invokeProcessBuffer();
    processor.resetInternalBuffer();

    expect(processor.runWhisperMock).toHaveBeenCalledTimes(1);
  });

  it('continues accumulating audio if duration threshold not reached', async () => {
    const processor = new TestAudioProcessor();

    await processor.processAudio(createChunk(1_000));
    await processor.processAudio(createChunk(20_000));

    expect(processor.runWhisperMock).not.toHaveBeenCalled();
    expect(processor.getBufferLength()).toBe(2);
  });
});
