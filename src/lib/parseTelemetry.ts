import { TelemetryPacket } from '../types/telemetry';

type ParsedValues = {
  timestamp?: string;
  temperature?: number | null;
  humidity?: number | null;
  pressure?: number | null;
  uvIntensity?: number | null;
  uvIndex?: number | null;
  groundUvIndex?: number | null;
  uvDiff?: number | null;
  uvVoltage?: number | null;
  groundUvVoltage?: number | null;
  altitude?: number | null;
};

function stripReceiverPrefix(line: string): string {
  // Your Receiver.ino prints: Serial.println("Received: " + msg);
  // The actual CanSat telemetry is the part after "Received:".
  return line.replace(/^received\s*:\s*/i, '').trim();
}

function readNumber(value: string | undefined): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!/^-?\d+(?:\.\d+)?$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
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

function parseNanoLabelStyle(line: string): ParsedValues | null {
  const temperature = firstNumberMatch(line, /(?:^|\s)T\s*[:=]\s*(-?\d+(?:\.\d+)?)\s*C\b/i);
  const humidity = firstNumberMatch(line, /(?:^|\s)H\s*[:=]\s*(-?\d+(?:\.\d+)?)\s*%/i);
  const pressure = firstNumberMatch(line, /(?:^|\s)P\s*[:=]\s*(-?\d+(?:\.\d+)?)\s*hpa\b/i);
  const altitude = firstNumberMatch(line, /(?:^|\s)A\s*[:=]\s*(-?\d+(?:\.\d+)?)\s*m\b/i);
  const uvIndex = firstNumberMatch(line, /(?:^|\s)UV\s*[:=]\s*(-?\d+(?:\.\d+)?)\b/i);
  const uvVoltage = firstNumberMatch(line, /(?:^|\s)(?:uv\s*v(?:olt)?|uvVoltage|uv_voltage)\s*[:=]?\s*(-?\d+(?:\.\d+)?)/i) ?? firstNumberMatch(line, /(?:^|\s)(-?\d+(?:\.\d+)?)\s*v\b/i);
  const groundUvIndex = firstNumberMatch(line, /ground\s*uv\s*[:=]\s*(-?\d+(?:\.\d+)?)\b/i);
  const groundUvVoltage = firstNumberMatch(line, /ground\s*v(?:olt)?\s*[:=]\s*(-?\d+(?:\.\d+)?)/i) ?? firstNumberMatch(line, /ground\s*v\s*[:=]\s*(-?\d+(?:\.\d+)?)/i);
  const uvDiff = firstNumberMatch(line, /diff\s*[:=]\s*(-?\d+(?:\.\d+)?)\b/i);

  const hasAny =
    temperature !== null ||
    humidity !== null ||
    pressure !== null ||
    altitude !== null ||
    uvIndex !== null ||
    groundUvIndex !== null ||
    uvDiff !== null;

  if (!hasAny) return null;

  return {
    temperature,
    humidity,
    pressure,
    uvIndex,
    uvVoltage,
    groundUvIndex,
    groundUvVoltage,
    uvDiff,
    altitude
  };
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
  // Don't return early from reportStyle — we still want to scan unit-suffixed tokens
  // for cases like '870.16p' which reportStyle may not recognize.

  // Extract number and unit suffix from each token to allow flexible ordering.
  const tokens = parts.map((p) => {
    const numMatch = p.match(/(-?\d+(?:\.\d+)?)/);
    const num = numMatch ? Number(numMatch[1]) : null;
    const lower = p.toLowerCase();
    return { raw: p, num, lower };
  });

  // Identify timestamp (leading non-numeric tokens)
  const firstNumberIndex = tokens.findIndex((t) => t.num !== null);
  if (firstNumberIndex === -1) return null;
  const hasTimestamp = firstNumberIndex > 0;
  const offset = firstNumberIndex;
  const timestamp = hasTimestamp ? parts.slice(0, offset).join(', ') : '';

  // Scan tokens for unit hints to assign values robustly.
  let temperature: number | null = null;
  let humidity: number | null = null;
  let pressure: number | null = null;
  let altitude: number | null = null;
  let uvVoltage: number | null = null;
  let uvIntensity: number | null = null;
  let uvIndex: number | null = null;
  let groundUvIndex: number | null = null;
  let groundSeen = false;
  let groundUvVoltage: number | null = null;
  let uvDiff: number | null = null;

  for (let i = offset; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.num === null) continue;
    const s = t.lower;

    if (/ground/.test(s)) {
      // mark that a ground-related token appeared (e.g. "Ground v: 1.01")
      groundSeen = true;
      if (/v\b/.test(s) && groundUvVoltage === null) {
        groundUvVoltage = t.num;
        continue;
      }
    }

    if (humidity === null && /%/.test(s)) {
      humidity = t.num;
      continue;
    }

    if (/\bdiff\b/.test(s)) {
      // explicit diff token like 'diff: -0.12'
      if (t.num !== null) {
        // store as uvDiff (higher-level code will pick this up from nanoStyle or csv)
        // we attach it to uvIntensity temporarily via uvDiff in ParsedValues
        // but prefer to set uvIntensity only from mW tokens.
        // assign to a local uvDiff variable via reportStyle merging later
      }
      continue;
    }

    if (pressure === null && (/(?:hpa|p\b)/.test(s) || /\bpress\b/.test(s))) {
      pressure = t.num;
      continue;
    }

    if (altitude === null && /m\b(?!w)/.test(s)) {
      // 'm' as meters, avoid matching 'mW'
      altitude = t.num;
      continue;
    }

    if (uvVoltage === null && /v\b/.test(s) && !/ground/.test(s)) {
      uvVoltage = t.num;
      continue;
    }

    if (uvIntensity === null && /mw/.test(s)) {
      uvIntensity = t.num;
      continue;
    }

    if (/i\b/.test(s)) {
      if (groundSeen) {
        if (groundUvIndex === null) {
          groundUvIndex = t.num;
          continue;
        }
      } else {
        if (uvIndex === null) {
          uvIndex = t.num;
          continue;
        }
      }
    }

    if (/\bdiff\b/.test(s)) {
      if (uvDiff === null) uvDiff = t.num;
      continue;
    }

    // Fallback positional mapping for unrecognized unit tokens
    const pos = i - offset;
    if (pos === 0 && temperature === null) temperature = t.num;
    else if (pos === 1 && humidity === null) humidity = t.num;
    else if (pos === 2 && pressure === null) pressure = t.num;
    else if (pos === 3 && altitude === null) altitude = t.num;
    else if (pos === 4 && uvVoltage === null) uvVoltage = t.num;
    else if (pos === 5 && uvIntensity === null) uvIntensity = t.num;
    else if (pos === 6 && uvIndex === null) uvIndex = t.num;
  }
  const hasAny = temperature !== null || humidity !== null || pressure !== null || uvIntensity !== null || uvIndex !== null || altitude !== null || uvVoltage !== null || groundUvIndex !== null || uvDiff !== null;
  if (!hasAny && !reportStyle) return null;

  // Merge reportStyle as fallback for values not found via tokens
  return {
    timestamp: timestamp || reportStyle?.timestamp,
    temperature: temperature ?? reportStyle?.temperature ?? null,
    humidity: humidity ?? reportStyle?.humidity ?? null,
    pressure: pressure ?? reportStyle?.pressure ?? null,
    altitude: altitude ?? reportStyle?.altitude ?? null,
    uvVoltage: uvVoltage ?? reportStyle?.uvVoltage ?? null,
    uvIntensity: uvIntensity ?? reportStyle?.uvIntensity ?? null,
    uvIndex: uvIndex ?? reportStyle?.uvIndex ?? null,
    groundUvIndex: groundUvIndex ?? reportStyle?.groundUvIndex ?? null,
    groundUvVoltage: groundUvVoltage ?? reportStyle?.groundUvVoltage ?? null,
    uvDiff: uvDiff ?? reportStyle?.uvDiff ?? null
  };
}

export function parseTelemetryLine(line: string, id: number): TelemetryPacket {
  const raw = line.trim();
  const telemetry = stripReceiverPrefix(raw);
  const now = new Date();

  const keyedTemperature = readKeyValue(telemetry, ['temperature', 'temp', 'bmpTemp', 'bmp_temperature']);
  const keyedHumidity = readKeyValue(telemetry, ['humidity', 'hum']);
  const keyedPressure = readKeyValue(telemetry, ['pressure', 'press']);
  // Avoid matching the generic 'uv' key here — that label is used for ground uv index
  // in some payloads (e.g. 'uv: 0.14i'). Only match explicit intensity keys.
  const keyedUvIntensity = readKeyValue(telemetry, ['uvIntensity', 'uv_intensity', 'uvmW']);
  const keyedUvIndex = readKeyValue(telemetry, ['uvIndex', 'uv_index', 'uvi']);
  const keyedAltitude = readKeyValue(telemetry, ['altitude', 'alt']);

  const reportStyle = parseReportStyle(telemetry);
  const nanoStyle = parseNanoLabelStyle(telemetry);
  const csv = parseCsvLike(telemetry);

  // Debug helper: show how the raw line is tokenized and parsed.
  // Keep as debug; can be removed once issues are resolved.
  // eslint-disable-next-line no-console
  console.debug('parseTelemetryLine', {
    raw,
    telemetry,
    reportStyle,
    nanoStyle,
    csv
  });

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
    temperature: keyedTemperature ?? nanoStyle?.temperature ?? reportStyle?.temperature ?? csv?.temperature ?? null,
    humidity: keyedHumidity ?? nanoStyle?.humidity ?? reportStyle?.humidity ?? csv?.humidity ?? null,
    pressure: keyedPressure ?? nanoStyle?.pressure ?? reportStyle?.pressure ?? csv?.pressure ?? null,
    uvIntensity: keyedUvIntensity ?? reportStyle?.uvIntensity ?? csv?.uvIntensity ?? null,
    uvIndex: keyedUvIndex ?? nanoStyle?.uvIndex ?? reportStyle?.uvIndex ?? csv?.uvIndex ?? null,
    uvVoltage: nanoStyle?.uvVoltage ?? csv?.uvVoltage ?? null,
    groundUvIndex: nanoStyle?.groundUvIndex ?? csv?.groundUvIndex ?? null,
    groundUvVoltage: nanoStyle?.groundUvVoltage ?? csv?.groundUvVoltage ?? null,
    uvDiff: nanoStyle?.uvDiff ?? null,
    altitude: keyedAltitude ?? nanoStyle?.altitude ?? reportStyle?.altitude ?? csv?.altitude ?? null,

    raw,
    valid: false
  };

  packet.valid = [
    packet.temperature,
    packet.humidity,
    packet.pressure,
    packet.uvIntensity,
    packet.uvIndex,
    packet.groundUvIndex,
    packet.uvDiff,
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
    packet.uvVoltage ?? '',
    packet.groundUvIndex ?? '',
    packet.groundUvVoltage ?? '',
    packet.uvDiff ?? '',
    packet.altitude ?? '',
    `"${packet.raw.replaceAll('"', '""')}"`,
    packet.valid
  ];
  return values.join(',');
}

export function packetsToCsv(packets: TelemetryPacket[]): string {
  const header = 'id,timestamp,receivedAt,temperature,humidity,pressure,uvIntensity,uvIndex,uvVoltage,groundUvIndex,groundUvVoltage,uvDiff,altitude,raw,valid';
  return [header, ...packets.map(packetToCsvRow)].join('\n');
}
