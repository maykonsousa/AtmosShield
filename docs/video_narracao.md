# Narração do Vídeo — AtmosShield (cue cards, ~5 min)

> Leia em ritmo calmo (~145 palavras/min). `[TELA: ...]` indica o que mostrar.
> Grave **um bloco por vez** — é muito mais fácil refazer 40s do que 5 minutos.
> Números abaixo são os **valores reais** validados na API local.

---

## BLOCO 1 — Abertura (0:00–0:30)
`[TELA: slide/landing com o nome AtmosShield e os 4 integrantes]`

> "Olá! Somos o grupo do projeto **AtmosShield**, da Global Solution 2026.1 da FIAP.
> Integrantes:
> Matheus Fantini
> Heleno Madeira
> Samantha Farias.
> E nós **QUEREMOS CONCORRER**.
> Nos próximos cinco minutos a gente mostra como usar tecnologia espacial pra
> proteger a Terra do fogo — do satélite no céu ao sensor no chão."

---

## BLOCO 2 — Problema & Solução (0:30–1:30)
`[TELA: landing page; depois o mapa de focos de calor]`

> "Todo ano o Brasil perde milhões de hectares para queimadas, muitas delas
> criminosas e em áreas sem fiscalização constante. O satélite enxerga o foco
> grande, mas chega tarde — e não cobre o início do incêndio.
>
> O AtmosShield resolve isso cruzando **duas escalas**. Na escala macro, dados de
> satélite do **INPE** com os focos de calor da região. Na escala micro, uma rede
> de sensores **ESP32** instalados no solo, que confirmam um foco ativo em minutos.
>
> E o modelo é **colaborativo**: o governo instala os sensores âncora, e produtores
> rurais homologam os próprios dispositivos. Cada um protege a sua propriedade — e,
> de quebra, alimenta a inteligência de toda a rede com mais pontos de dado."

---

## BLOCO 3 — Demo Técnica: Hardware + Backend (1:30–2:45)
`[TELA: Wokwi com o ESP32; depois o terminal/Swagger da API]`

> "Aqui está o nó de borda: um **ESP32** com sensor de temperatura e umidade e um
> sensor de fumaça. Quando eu aproximo a fumaça `[ação: aproximar do sensor]`, o
> nível de gás sobe e o ESP32 dispara um **JSON via HTTP POST** para a nossa API
> em Python, o FastAPI.
>
> `[TELA: resposta da API]` A API enriquece a leitura com **vento e chuva reais**
> da Open-Meteo e roda um modelo de **Machine Learning** — um Random Forest — que
> classifica o risco. Numa leitura tranquila o risco volta **Baixo**. Mas com calor
> a 42 graus, umidade a 13% e fumaça alta, o modelo retorna **Crítico**.
>
> E tem um detalhe importante de confiabilidade: sensores privados podem falhar.
> `[TELA: leitura com 150°C]` Se um sensor salta de 25 para 150 graus **sem nenhuma
> fumaça**, o **Pandas** marca como *outlier* e descarta — evitando despachar uma
> brigada por alarme falso."

---

## BLOCO 4 — Show Visual: Dashboard (2:45–4:15)
`[TELA: abrir http://localhost:3000/dashboard?lat=-10.3&lon=-46.7]`
> A coordenada na URL força o widget de clima na região do **Jalapão/TO** (seca + ventando),
> e já pula o pop-up de permissão de localização. Deixe essa URL pré-carregada.

> "Tudo isso vira decisão neste painel, feito em **Next.js**. No topo, os
> indicadores da operação. Aqui, o **clima da região ao vivo** — vento, umidade e
> precipitação direto da Open-Meteo, atualizando sem dar refresh na página.
>
> `[TELA: mapa]` No mapa, os **focos de calor do INPE** espalhados pelo Brasil, cada
> nó colorido pelo risco — verde, amarelo e vermelho.
>
> `[AÇÃO: clicar no KPI CRÍTICO]` E o painel é operacional: quando a brigada clica
> em **Crítico**, o mapa isola na hora só os focos críticos e dá zoom neles.
> `[TELA: mapa reenquadrado nos nós vermelhos]` É exatamente o que importa numa
> emergência — onde estão as ameaças reais, agora, pra despachar a resposta.
> `[AÇÃO: clicar em Total de Nós]` Um clique e ele volta a ver a rede inteira."

---

## BLOCO 5 — Conclusão (4:15–5:00)
`[TELA: README / repositório no GitHub]`

> "O AtmosShield mostra impacto em duas frentes. **Ecológico**: detecção precoce
> que reduz o tempo de resposta e a área queimada. **Comercial**: um modelo SaaS
> onde produtores protegem suas terras e ainda fortalecem a rede pública.
>
> E ele integra as disciplinas do curso: **Python e FastAPI**, **análise de dados
> com Pandas**, **Machine Learning** com Random Forest, **IoT** com o ESP32, e
> **web avançado** em Next.js.
>
> O satélite é o olho no céu; o ESP32 é o olho no chão. Código completo no GitHub,
> link na tela. Obrigado — e **QUERO CONCORRER**!"

---

## Checklist antes de gravar
- [ ] API no ar: `.venv/bin/uvicorn src.backend.app.main:app --port 8000` (da raiz)
- [ ] Front no ar: `cd src/frontend && npm run dev`
- [ ] **Plano B** (Bloco 3): `./demo.sh` testado — dispara baseline → crítico → outlier por ENTER
- [ ] Abas pré-abertas: Wokwi (circuito + `.ino`), terminal com `./demo.sh`, e o dashboard em
      `http://localhost:3000/dashboard?lat=-10.3&lon=-46.7` (clima já no Jalapão)
- [ ] Hard refresh (`Cmd+Shift+R`) no dashboard se reiniciou o `next dev` — senão os cliques não pegam
- [ ] Webcam só no Bloco 1 (opcional); áreas sensíveis da tela fechadas
- [ ] Cronômetro à vista — 5:00 é teto rígido
