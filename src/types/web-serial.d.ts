declare global {
  interface SerialPort {
    readable: ReadableStream<BufferSource> | null;
    writable: WritableStream<Uint8Array> | null;
    open(options: { baudRate: number }): Promise<void>;
    close(): Promise<void>;
  }

  interface Navigator {
    serial?: {
      requestPort: () => Promise<SerialPort>;
    };
  }
}

export {};