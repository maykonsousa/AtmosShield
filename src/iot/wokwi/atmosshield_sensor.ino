// AtmosShield — nó sensor ESP32 (simulado no Wokwi)
// Lê DHT22 (temperatura/umidade) e um potenciômetro (simula o MQ-2 / fumaça)
// e envia o payload JSON para a API AtmosShield via HTTP POST.
#include <WiFi.h>
#include <HTTPClient.h>
#include "DHT.h"

#define DHT_PIN 15
#define DHT_TYPE DHT22
#define GAS_PIN 34  // potenciômetro simulando o sensor de gás/fumaça (analógico)

const char* WIFI_SSID = "Wokwi-GUEST";
const char* WIFI_PASS = "";

// Ajuste para a URL pública da sua API (ex.: túnel ngrok para o uvicorn local).
const char* API_URL = "http://localhost:8000/readings";

const char* DEVICE_ID = "ESP32-PRIV-092";
const char* API_KEY   = "atm_shield_secure_token_abc123";
const float LATITUDE  = -3.4712;
const float LONGITUDE = -52.3812;

DHT dht(DHT_PIN, DHT_TYPE);

void setup() {
  Serial.begin(115200);
  dht.begin();
  pinMode(GAS_PIN, INPUT);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Conectando ao WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(250);
    Serial.print(".");
  }
  Serial.println(" conectado!");
}

void loop() {
  float temperatura = dht.readTemperature();
  float umidade = dht.readHumidity();
  int gasRaw = analogRead(GAS_PIN);            // 0..4095
  float ppm = map(gasRaw, 0, 4095, 0, 1000);   // ppm de fumaça simulado

  if (isnan(temperatura) || isnan(umidade)) {
    Serial.println("Falha na leitura do DHT22");
    delay(2000);
    return;
  }

  String payload = String("{") +
    "\"device_id\":\"" + DEVICE_ID + "\"," +
    "\"api_key\":\"" + API_KEY + "\"," +
    "\"leitura\":{" +
      "\"temperatura\":" + String(temperatura, 1) + "," +
      "\"umidade_ar\":" + String(umidade, 1) + "," +
      "\"ppm_fumaca\":" + String(ppm, 1) +
    "}," +
    "\"coordenadas\":{" +
      "\"latitude\":" + String(LATITUDE, 4) + "," +
      "\"longitude\":" + String(LONGITUDE, 4) +
    "}}";

  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(API_URL);
    http.addHeader("Content-Type", "application/json");
    int code = http.POST(payload);
    Serial.printf("POST %d | %s\n", code, payload.c_str());
    http.end();
  }

  delay(5000);  // envia a cada 5s
}
