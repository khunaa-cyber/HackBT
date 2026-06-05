import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { parseTelemetryLine } from '../lib/parseTelemetry';
import { SerialStatus, TelemetryPacket } from '../types/telemetry';

type SerialPortLike = SerialPort & {
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
};

type NavigatorWithSerial = Navigator & {
  serial?: {
    requestPort: () => Promise<SerialPortLike>;
  };
};

function createSimulationLine(counter: number): string {
  const t = counter / 5;
  const temperature = 20 + Math.sin(t) * 3 + Math.random() * 0.4;
  const humidity = 48 + Math.cos(t / 2) * 10 + Math.random() * 1.5;
  const pressure = 858 + Math.sin(t / 3) * 2 + Math.random() * 0.2;
  const uvIntensity = Math.max(0, 1.5 + Math.sin(t / 1.4) * 1.1 + Math.random() * 0.2);
  const uvIndex = Math.max(0, uvIntensity * 2.4);
  const altitude = 1360 + Math.sin(t / 3) * 18;

  return `${new Date().toLocaleTimeString()},${temperature.toFixed(2)},${humidity.toFixed(1)},${pressure.toFixed(2)},${uvIntensity.toFixed(2)},${uvIndex.toFixed(1)},${altitude.toFixed(1)}`;
}

export function useSerialTelemetry() {
  const [status, setStatus] = useState<SerialStatus>('disconnected');
  const [packets, setPackets] = useState<TelemetryPacket[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [baudRate, setBaudRate] = useState(9600);
  const portRef = useRef<SerialPortLike | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<string> | null>(null);
  const simulationRef = useRef<number | null>(null);
  const packetIdRef = useRef(1);
  const textBufferRef = useRef('');

  const addLine = useCallback((line: string) => {
    const cleaned = line.trim();
    if (!cleaned) return;

    const packet = parseTelemetryLine(cleaned, packetIdRef.current++);
    setPackets((current) => [...current.slice(-499), packet]);
  }, []);

  const processChunk = useCallback((chunk: string) => {
    textBufferRef.current += chunk;
    const lines = textBufferRef.current.split(/\r?\n/);
    textBufferRef.current = lines.pop() ?? '';
    lines.forEach(addLine);
  }, [addLine]);

  const disconnect = useCallback(async () => {
    if (simulationRef.current !== null) {
      window.clearInterval(simulationRef.current);
      simulationRef.current = null;
    }

    try {
      await readerRef.current?.cancel();
      readerRef.current = null;
      await portRef.current?.close();
      portRef.current = null;
    } catch {
      // Ignore close errors.
    }

    setStatus('disconnected');
  }, []);

  const connect = useCallback(async () => {
    setError(null);
    const serial = (navigator as NavigatorWithSerial).serial;

    if (!serial) {
      setError('Web Serial is not available. Use Chrome or Edge on localhost.');
      setStatus('error');
      return;
    }

    try {
      setStatus('connecting');
      const port = await serial.requestPort();
      await port.open({ baudRate });
      portRef.current = port;
      setStatus('connected');

      const decoder = new TextDecoderStream();
      port.readable?.pipeTo(decoder.writable).catch(() => undefined);
      const reader = decoder.readable.getReader();
      readerRef.current = reader;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) processChunk(value);
      }
    } catch (event) {
      const message = event instanceof Error ? event.message : 'Serial connection failed.';
      setError(message);
      setStatus('error');
    }
  }, [baudRate, processChunk]);

  const startSimulation = useCallback(() => {
    void disconnect();
    setError(null);
    setStatus('simulation');
    let counter = 0;
    simulationRef.current = window.setInterval(() => {
      addLine(createSimulationLine(counter++));
    }, 1000);
  }, [addLine, disconnect]);

  const clearPackets = useCallback(() => {
    setPackets([]);
    packetIdRef.current = 1;
  }, []);

  const stats = useMemo(() => {
    const validCount = packets.filter((packet) => packet.valid).length;
    const invalidCount = packets.length - validCount;
    const latest = packets.at(-1) ?? null;
    return {
      total: packets.length,
      validCount,
      invalidCount,
      latest,
      dataLossPercent: packets.length ? Math.round((invalidCount / packets.length) * 100) : 0
    };
  }, [packets]);

  useEffect(() => {
    return () => {
      void disconnect();
    };
  }, [disconnect]);

  return {
    status,
    packets,
    error,
    baudRate,
    setBaudRate,
    connect,
    disconnect,
    startSimulation,
    clearPackets,
    stats
  };
}
