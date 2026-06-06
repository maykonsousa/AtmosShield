# AtmosShield — Nó Sensor ESP32 (Wokwi)

Simula um nó de borda da rede AtmosShield: lê temperatura/umidade (DHT22) e fumaça
(potenciômetro no lugar do MQ-2), monta o payload JSON e envia para a API via `POST /readings`.

## Como rodar no Wokwi

1. Acesse https://wokwi.com e crie um projeto ESP32.
2. Copie `atmosshield_sensor.ino` para o `sketch.ino` e `diagram.json` para o diagrama.
3. Em **Library Manager**, adicione as libs de `libraries.txt` (DHT sensor library + Adafruit Unified Sensor).
4. Suba a API local (`uvicorn src.backend.app.main:app --port 8000`) e exponha-a com um túnel
   público (ex.: `ngrok http 8000`). Cole a URL pública em `API_URL` (terminando em `/readings`).
5. Rode a simulação. Gire o potenciômetro para simular o aumento de fumaça e acompanhe os POSTs
   no Serial Monitor e os alertas em `GET /alerts`.

## Circuito

- **DHT22**: VCC->3V3, GND->GND, SDA->GPIO15
- **Potenciômetro (MQ-2 simulado)**: VCC->3V3, GND->GND, SIG->GPIO34 (ADC)

## Contrato do payload

```json
{
  "device_id": "ESP32-PRIV-092",
  "api_key": "atm_shield_secure_token_abc123",
  "leitura": { "temperatura": 41.8, "umidade_ar": 14.2, "ppm_fumaca": 380.0 },
  "coordenadas": { "latitude": -3.4712, "longitude": -52.3812 }
}
```

Hardware real: basta trocar o potenciômetro por um MQ-2 no mesmo GPIO34 e manter o DHT22.
