import { TelemetryPacket } from '../types/telemetry';

type ParsedValues = {
  timestamp?: string;
  temperature?: number | null;
  humidity?: number | null;
  pressure?: number | null;
  uvIntensity?: number | null;
  uvIndex?: number | null;
  altitude?: number | null;
};

function stripReceiverPrefix(line: string): string {
  // Your Receiver.ino prints: Serial.println("Received: " + msg);
  // The actual CanSat telemetry is the part after "Received:".
  return line.replace(/^received\s*:\s*/i, '').trim();
}

function readNumber(value: string | undefined): number | null {
  if (!value) return null;
  const cleaned = value.replace(/[^0-9.+-]/g, '');
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function readKeyValue(line: string, keys: string[]): number | null {
  for (const key of keys) {
    const pattern = new RegExp(`${key}\\s*[:=]\\s*(-?\\d+(?:\\.\\d+)?)`, 'i');
    const match = line.match(pattern);
    if (match) return Number(match[1]);
  }
  return null;
}

function firstNumberMatch(line: string, pattern: RegExp): number | null {
  const match = line.match(pattern);
  return match ? Number(match[1]) : null;
}

function parseReportStyle(line: string): ParsedValues | null {
  /*
    Supports the format used in your report/test data, for example:

    Received: 28.14C, 857.60hPa, 1384.9m 27.6C, 41.0% 0.00mW, 213, 00:03.3, 28.14C

    Mapping:
    - first C value before hPa  -> BMP280 temperature
    - hPa value                 -> BMP280 pressure
    - m value after pressure    -> estimated altitude
    - % value                   -> DHT11 humidity
    - mW value                  -> GY-ML8511 UV intensity
    - explicit UVI/UV Index     -> UV index, if present
  */

  const pressure = firstNumberMatch(line, /(-?\d+(?:\.\d+)?)\s*hpa\b/i);
  const altitude = firstNumberMatch(line, /(-?\d+(?:\.\d+)?)\s*m\b/i);
  const humidity = firstNumberMatch(line, /(-?\d+(?:\.\d+)?)\s*%/i);
  const uvIntensity = firstNumberMatch(line, /(-?\d+(?:\.\d+)?)\s*mw(?:\/cm(?:\^?2|²))?/i);

  // Prefer the BMP280 temperature: it is usually the C value immediately before the pressure.
  let temperature: number | null = null;
  const beforePressure = line.match(/(-?\d+(?:\.\d+)?)\s*c\s*,?\s*-?\d+(?:\.\d+)?\s*hpa/i);
  if (beforePressure) {
    temperature = Number(beforePressure[1]);
  } else {
    temperature = firstNumberMatch(line, /(-?\d+(?:\.\d+)?)\s*c\b/i);
  }

  const uvIndex =
    readKeyValue(line, ['uvIndex', 'uv_index', 'uvi', 'uv index']) ??
    firstNumberMatch(line, /uv\s*index\s*[:=]?\s*(-?\d+(?:\.\d+)?)/i);

  const hasAny =
    temperature !== null ||
    humidity !== null ||
    pressure !== null ||
    uvIntensity !== null ||
    uvIndex !== null ||
    altitude !== null;

  if (!hasAny) return null;

  return {
    temperature,
    humidity,
    pressure,
    uvIntensity,
    uvIndex,
    altitude
  };
}

function parseCsvLike(line: string): ParsedValues | null {
  const parts = line.split(',').map((part) => part.trim()).filter(Boolean);

  /*
    Supported CSV formats:

    1) timestamp,temperature,humidity,pressure,uvIntensity,uvIndex,altitude
       Example: 14:30:00,19.6,43,858.6,1.69,3.2,1387.3

    2) temperature,humidity,pressure,uvIntensity,uvIndex,altitude
       Example: 19.6,43,858.6,1.69,3.2,1387.3

    3) report-style CSV fragments:
       Example: 28.14C,857.60hPa,1384.9m,27.6C,41.0%,0.00mW,213
  */

  if (parts.length < 3) return null;

  const joined = parts.join(', ');
  const reportStyle = parseReportStyle(joined);
  if (reportStyle) return reportStyle;

  const numericParts = parts.map(readNumber);

  // If the first part is not numeric, treat leading non-numeric part(s) as timestamp.
  const firstNumberIndex = numericParts.findIndex((value) => value !== null);
  if (firstNumberIndex === -1) return null;

  const hasTimestamp = firstNumberIndex > 0;
  const offset = firstNumberIndex;
  const timestamp = hasTimestamp ? parts.slice(0, offset).join(', ') : '';

  if (numericParts.length - offset >= 5) {
    return {
      timestamp,
      temperature: numericParts[offset],
      humidity: numericParts[offset + 1],
      pressure: numericParts[offset + 2],
      uvIntensity: numericParts[offset + 3],
      uvIndex: numericParts[offset + 4],
      altitude: numericParts[offset + 5] ?? null
    };
  }

  return null;
}

export function parseTelemetryLine(line: string, id: number): TelemetryPacket {
  const raw = line.trim();
  const telemetry = stripReceiverPrefix(raw);
  const now = new Date();

  const keyedTemperature = readKeyValue(telemetry, ['temperature', 'temp', 'bmpTemp', 'bmp_temperature']);
  const keyedHumidity = readKeyValue(telemetry, ['humidity', 'hum']);
  const keyedPressure = readKeyValue(telemetry, ['pressure', 'press']);
  const keyedUvIntensity = readKeyValue(telemetry, ['uvIntensity', 'uv_intensity', 'uv', 'uvmW']);
  const keyedUvIndex = readKeyValue(telemetry, ['uvIndex', 'uv_index', 'uvi']);
  const keyedAltitude = readKeyValue(telemetry, ['altitude', 'alt']);

  const reportStyle = parseReportStyle(telemetry);
  const csv = parseCsvLike(telemetry);

  const packet: TelemetryPacket = {
    id,
    timestamp: csv?.timestamp || reportStyle?.timestamp || now.toLocaleTimeString(),
    receivedAt: now.toISOString(),

    // Mapping for your CanSat test format:
    // temperature = BMP280 value ending in C before hPa
    // humidity    = DHT11 value ending in %
    // pressure    = BMP280 value ending in hPa
    // uvIntensity = GY-ML8511 value ending in mW
    // uvIndex     = only shown if your transmitter sends UVI / uvIndex explicitly
    // altitude    = BMP280 estimated altitude value ending in m
    temperature: keyedTemperature ?? reportStyle?.temperature ?? csv?.temperature ?? null,
    humidity: keyedHumidity ?? reportStyle?.humidity ?? csv?.humidity ?? null,
    pressure: keyedPressure ?? reportStyle?.pressure ?? csv?.pressure ?? null,
    uvIntensity: keyedUvIntensity ?? reportStyle?.uvIntensity ?? csv?.uvIntensity ?? null,
    uvIndex: keyedUvIndex ?? reportStyle?.uvIndex ?? csv?.uvIndex ?? null,
    altitude: keyedAltitude ?? reportStyle?.altitude ?? csv?.altitude ?? null,

    raw,
    valid: false
  };

  packet.valid = [
    packet.temperature,
    packet.humidity,
    packet.pressure,
    packet.uvIntensity,
    packet.uvIndex,
    packet.altitude
  ].some((value) => value !== null);

  return packet;
}

export function packetToCsvRow(packet: TelemetryPacket): string {
  const values = [
    packet.id,
    packet.timestamp,
    packet.receivedAt,
    packet.temperature ?? '',
    packet.humidity ?? '',
    packet.pressure ?? '',
    packet.uvIntensity ?? '',
    packet.uvIndex ?? '',
    packet.altitude ?? '',
    `"${packet.raw.replaceAll('"', '""')}"`,
    packet.valid
  ];
  return values.join(',');
}

export function packetsToCsv(packets: TelemetryPacket[]): string {
  const header = 'id,timestamp,receivedAt,temperature,humidity,pressure,uvIntensity,uvIndex,altitude,raw,valid';
  return [header, ...packets.map(packetToCsvRow)].join('\n');
}
