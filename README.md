# CanSat Live Dashboard

React + Vite website for displaying real-time CanSat telemetry from an XBee USB adapter or Arduino serial port.

## What it shows

- Temperature
- Humidity
- Pressure
- UV intensity
- UV index
- Estimated altitude
- Connection status
- Packet counts
- Data loss estimate based on invalid/unreadable packets
- Live chart
- Telemetry table
- CSV export

## How to run

```bash
npm install
npm run dev
```

Open the localhost link shown by Vite, usually:

```txt
http://localhost:5173
```

Use Chrome or Microsoft Edge for the Web Serial connection.

## How to connect XBee / Arduino

1. Connect your XBee USB adapter or Arduino Nano to the laptop.
2. Open the dashboard in Chrome/Edge.
3. Choose the correct baud rate. Start with `9600` unless your Arduino code uses a different one.
4. Click `Connect`.
5. Select the serial device from the browser popup.

## Arduino sketch

Use the example sketch in `arduino/TelemetrySender.ino` if you want a simple serial sender that matches this dashboard.

It prints one CSV line per second in this shape:

```txt
timestamp,temperature,humidity,pressure,uvIntensity,uvIndex,altitude
```

The dashboard already understands that format, so any serial data you send in the same structure will show up in the chart and table.

## Expected telemetry format

The dashboard accepts two formats.

### Recommended CSV format

```txt
timestamp,temperature,humidity,pressure,uvIntensity,uvIndex,altitude
```

Example:

```txt
14:30:00,19.6,43,858.6,1.69,3.2,1387.3
```

Altitude is optional:

```txt
14:30:00,19.6,43,858.6,1.69,3.2
```

### Key-value format

```txt
temp=19.6,hum=43,pressure=858.6,uv=1.69,uvi=3.2,alt=1387.3

### Arduino Nano label format

The dashboard also understands the format you showed from the Nano:

```txt
Received: T:23.00C H:23.00% P:869.02hPa A:1276.62m UV:0.00, Ground UV: 0.1, Diff: -0.1
```

It will map `T`, `H`, `P`, `A`, and `UV` into the live telemetry cards and table. Extra labels like `Ground UV` and `Diff` are kept in the raw line and can be added later if you want them as separate fields.
```

## Test without hardware

Click `Simulate` to generate fake telemetry. This is useful for checking the design before connecting XBee.

## Files to edit most often

- `src/lib/parseTelemetry.ts` — change this if your Arduino prints a different data format.
- `src/styles.css` — change dashboard design.
- `src/lib/metrics.ts` — change visible metric cards.
- `src/App.tsx` — change page layout.
