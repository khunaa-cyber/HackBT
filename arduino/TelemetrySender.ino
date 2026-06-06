const unsigned long sampleIntervalMs = 1000;

unsigned long lastSampleMs = 0;
unsigned long packetIndex = 0;

String makeTimestamp(unsigned long ms)
{
    unsigned long totalSeconds = ms / 1000;
    unsigned int hours = (totalSeconds / 3600) % 24;
    unsigned int minutes = (totalSeconds / 60) % 60;
    unsigned int seconds = totalSeconds % 60;

    char buffer[12];
    snprintf(buffer, sizeof(buffer), "%02u:%02u:%02u", hours, minutes, seconds);
    return String(buffer);
}

float readTemperature()
{
    int raw = analogRead(A0);
    return 18.0 + (raw / 1023.0) * 12.0;
}

float readHumidity()
{
    int raw = analogRead(A1);
    return 35.0 + (raw / 1023.0) * 45.0;
}

float readPressure()
{
    int raw = analogRead(A2);
    return 850.0 + (raw / 1023.0) * 40.0;
}

float readUvIntensity()
{
    int raw = analogRead(A3);
    return (raw / 1023.0) * 3.5;
}

float readUvIndex(float uvIntensity)
{
    return uvIntensity * 2.4;
}

float readAltitude(float pressure)
{
    return 44330.0 * (1.0 - pow(pressure / 1013.25, 0.1903));
}

void setup()
{
    Serial.begin(9600);
    while (!Serial)
    {
        ;
    }
}

void loop()
{
    unsigned long now = millis();
    if (now - lastSampleMs < sampleIntervalMs)
    {
        return;
    }

    lastSampleMs = now;
    packetIndex++;

    String timestamp = makeTimestamp(now);
    float temperature = readTemperature();
    float humidity = readHumidity();
    float pressure = readPressure();
    float uvIntensity = readUvIntensity();
    float uvIndex = readUvIndex(uvIntensity);
    float altitude = readAltitude(pressure);

    Serial.print(timestamp);
    Serial.print(',');
    Serial.print(temperature, 2);
    Serial.print(',');
    Serial.print(humidity, 1);
    Serial.print(',');
    Serial.print(pressure, 2);
    Serial.print(',');
    Serial.print(uvIntensity, 2);
    Serial.print(',');
    Serial.print(uvIndex, 2);
    Serial.print(',');
    Serial.println(altitude, 1);
}