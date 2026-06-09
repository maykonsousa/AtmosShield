#!/usr/bin/env bash
# demo.sh — disparos da demo do AtmosShield (Plano B do vídeo).
# Simula o que o ESP32 enviaria: leitura normal -> foco crítico -> sensor defeituoso (outlier).
# Uso:  ./demo.sh          (API em http://localhost:8000)
#       API_URL=https://meu-tunel.trycloudflare.com ./demo.sh
set -euo pipefail

API_URL="${API_URL:-http://localhost:8000}"
API_KEY="atm_shield_secure_token_abc123"

# cores
B="\033[1m"; G="\033[32m"; Y="\033[33m"; R="\033[31m"; C="\033[36m"; D="\033[2m"; X="\033[0m"

pausa() { echo; read -rp "$(echo -e "${D}— ENTER para o próximo disparo —${X}")" _; echo; }

# envia um payload e imprime os campos que importam na tela
disparar() {
  local titulo="$1" payload="$2"
  echo -e "${B}${C}▶ ${titulo}${X}"
  echo -e "${D}POST ${API_URL}/readings${X}"
  curl -s -X POST "${API_URL}/readings" \
    -H "Content-Type: application/json" \
    -d "${payload}" \
  | python3 -c '
import sys, json
d = json.load(sys.stdin)
label = d.get("risco_label")
cor = {"Baixo": "\033[32m", "Moderado": "\033[33m", "Critico": "\033[31m"}.get(label, "\033[0m")
dev = d["device_id"]; temp = d["temperatura"]; umid = d["umidade_ar"]; ppm = d["ppm_fumaca"]
vento = d["vento_kmh"]; fonte = d["vento_fonte"]; risco = d["risco"]
print(f"  device      : {dev}")
print(f"  temp/umid   : {temp} C  /  {umid} %")
print(f"  fumaca      : {ppm} ppm")
print(f"  vento (live): {vento} km/h  ({fonte})")
print(f"  RISCO       : {cor}\033[1m{label}\033[0m  (classe {risco})")
flag = "\033[31m\033[1mTRUE  <- Pandas filtrou alarme falso\033[0m" if d["is_outlier"] else "\033[2mfalse\033[0m"
print(f"  is_outlier  : {flag}")
'
}

echo -e "${B}==================  AtmosShield · DEMO  ==================${X}"
echo -e "${D}API: ${API_URL}${X}"
pausa

# 1) Leitura normal -> risco Baixo
disparar "CENÁRIO 1 — leitura tranquila (esperado: Baixo)" \
'{"device_id":"ESP32-PRIV-092","api_key":"'"${API_KEY}"'","leitura":{"temperatura":24.5,"umidade_ar":68.0,"ppm_fumaca":40},"coordenadas":{"latitude":-23.5329,"longitude":-46.7925}}'
pausa

# 2) Foco crítico -> risco Critico
disparar "CENÁRIO 2 — calor + seca + fumaça (esperado: Crítico)" \
'{"device_id":"ESP32-PRIV-092","api_key":"'"${API_KEY}"'","leitura":{"temperatura":42.0,"umidade_ar":13.0,"ppm_fumaca":420},"coordenadas":{"latitude":-10.85,"longitude":-50.2}}'
pausa

# 3) Sensor defeituoso: baseline + salto sem fumaça -> outlier
echo -e "${B}${C}▶ CENÁRIO 3 — sensor privado descalibrado${X}"
echo -e "${D}primeiro uma leitura-base de 25°C (silenciosa) para haver histórico...${X}"
curl -s -X POST "${API_URL}/readings" -H "Content-Type: application/json" \
  -d '{"device_id":"ESP32-PRIV-OUT","api_key":"'"${API_KEY}"'","leitura":{"temperatura":25.0,"umidade_ar":55.0,"ppm_fumaca":35},"coordenadas":{"latitude":-15.6,"longitude":-47.6}}' \
  > /dev/null
echo -e "${D}agora o salto para 150°C SEM fumaça (sensor defeituoso):${X}"
disparar "salto 25°C → 150°C sem fumaça (esperado: is_outlier TRUE)" \
'{"device_id":"ESP32-PRIV-OUT","api_key":"'"${API_KEY}"'","leitura":{"temperatura":150.0,"umidade_ar":55.0,"ppm_fumaca":30},"coordenadas":{"latitude":-15.6,"longitude":-47.6}}'

echo
echo -e "${B}${G}==================  FIM DA DEMO  ==================${X}"
