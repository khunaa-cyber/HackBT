import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { parseTelemetryLine } from '../lib/parseTelemetry';
import { SerialStatus, TelemetryPacket } from '../types/telemetry';

type SerialPortLike = SerialPort;

type NavigatorWithSerial = Navigator & {
  serial?: {
    requestPort: () => Promise<SerialPortLike>;
  };
};

function getWebSerialErrorMessage() {
  if (!window.isSecureContext) {
    return 'Web Serial needs a secure context. Open this app at http://localhost:5173 in Chrome or Edge, not from file:// or an insecure URL.';
  }

  if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
    return 'Open this dashboard on localhost in Chrome or Edge to use Web Serial.';
  }

  return 'Web Serial is not available in this browser. Use Chrome or Edge on localhost.';
}

function createSimulationLine(counter: number): string {
  const t = counter / 5;
  const temperature = 20 + Math.sin(t) * 3 + Math.random() * 0.4;
  const humidity = 48 + Math.cos(t / 2) * 10 + Math.random() * 1.5;
  const pressure = 858 + Math.sin(t / 3) * 2 + Math.random() * 0.2;
  const uvIntensity = Math.max(0, 1.5 + Math.sin(t / 1.4) * 1.1 + Math.random() * 0.2);
  const uvIndex = Math.max(0, uvIntensity * 2.4);
  const groundUvIndex = Math.max(0, uvIndex + (Math.random() * 0.2 - 0.1));
  const uvDiff = uvIndex - groundUvIndex;
  const altitude = 1360 + Math.sin(t / 3) * 18;

  return `${new Date().toLocaleTimeString()},${temperature.toFixed(2)},${humidity.toFixed(1)},${pressure.toFixed(2)},${uvIntensity.toFixed(2)},${uvIndex.toFixed(1)},${groundUvIndex.toFixed(1)},${uvDiff.toFixed(1)},${altitude.toFixed(1)}`;
}

export function useSerialTelemetry() {
  const [status, setStatus] = useState<SerialStatus>('disconnected');
  const [packets, setPackets] = useState<TelemetryPacket[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [baudRate, setBaudRate] = useState(9600);
  const portRef = useRef<SerialPortLike | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<string> | null>(null);
  const flushTimerRef = useRef<number | null>(null);
  const simulationRef = useRef<number | null>(null);
  const packetIdRef = useRef(1);
  const textBufferRef = useRef('');
  const lastRawRef = useRef<string | null>(null);
  const lastPacketRef = useRef<TelemetryPacket | null>(null);

  const addLine = useCallback((line: string) => {
    const cleaned = line.trim();
    if (!cleaned) return;

    const parsed = parseTelemetryLine(cleaned, packetIdRef.current);

    // Only consider valid packets.
    if (!parsed.valid) return;

    // Compare key numeric fields to detect duplicates or partial/complete pairs.
    function keyFields(p: TelemetryPacket) {
      return [
        p.temperature,
        p.humidity,
        p.pressure,
        p.altitude,
        p.uvVoltage,
        p.uvIntensity,
        p.uvIndex,
        p.groundUvVoltage,
        p.groundUvIndex
      ];
    }

    const last = lastPacketRef.current;
    if (last) {
      const lastKeys = keyFields(last);
      const newKeys = keyFields(parsed);

      const identical = lastKeys.every((v, i) => {
        const nv = newKeys[i];
        return (v === null && nv === null) || (v !== null && nv !== null && Math.abs((v as number) - (nv as number)) < 1e-6);
      });

      if (identical) {
        // Duplicate of the most recent packet — ignore.
        return;
      }

      // If new packet has strictly more non-null fields than last, replace last.
      const lastCount = lastKeys.filter((v) => v !== null).length;
      const newCount = newKeys.filter((v) => v !== null).length;
      if (newCount > lastCount) {
        // Keep last packet's id for continuity.
        const replacement: TelemetryPacket = { ...parsed, id: last.id };
        lastPacketRef.current = replacement;
        setPackets((current) => {
          if (current.length === 0) return [replacement];
          const copy = current.slice(0, -1);
          copy.push(replacement);
          return copy.slice(-499);
        });
        return;
      }
    }

    // New, distinct packet — append with new id.
    parsed.id = packetIdRef.current++;
    lastPacketRef.current = parsed;
    lastRawRef.current = cleaned;
    setPackets((current) => [...current.slice(-499), parsed]);
  }, []);

  const processChunk = useCallback((chunk: string) => {
    textBufferRef.current += chunk;
    if (flushTimerRef.current !== null) {
      window.clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }

    const lines = textBufferRef.current.split(/\r?\n/);
    if (lines.length > 1) {
      textBufferRef.current = lines.pop() ?? '';
      lines.forEach(addLine);
      return;
    }

    // Increase idle flush timeout to allow slow/fragmented serial chunks to arrive
    // (serial sender sends full lines every ~2s; 200ms caused premature partial-parsing).
    flushTimerRef.current = window.setTimeout(() => {
      const buffered = textBufferRef.current.trim();
      textBufferRef.current = '';
      flushTimerRef.current = null;

      if (buffered) {
        addLine(buffered);
      }
    }, 1200);
  }, [addLine]);

  const disconnect = useCallback(async () => {
    if (flushTimerRef.current !== null) {
      window.clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }

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
      setError(getWebSerialErrorMessage());
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
