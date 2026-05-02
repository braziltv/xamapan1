# Vídeo de fundo no Painel TV

Adicionar suporte para um vídeo em loop (via URL externa) que ocupa a tela inteira do painel TV. Quando uma chamada de paciente ocorre, o vídeo é ocultado e pausado automaticamente; ao terminar a chamada, o vídeo retorna do ponto onde parou.

## Como vai funcionar

1. **Configuração no Admin → aba Marketing**
   - Novo bloco "Vídeo em tela cheia (TV)" com:
     - Campo URL do vídeo (MP4 direto ou link YouTube)
     - Switch "Ativar vídeo na TV"
     - Slider de volume (0-100%)
     - Botão "Testar URL" (validação)
   - Configurações salvas em `unit_settings` (já existe — segue isolamento por unidade)
   - Sincronização realtime: ao salvar, todas TVs da unidade atualizam instantaneamente

2. **Comportamento na TV (`PublicDisplay.tsx`)**
   - Quando `videoEnabled = true` e nenhuma chamada ativa (`!announcingType`):
     - Renderiza overlay `<video>` cobrindo 100% da tela (z-index alto, acima do header/ticker/sidebar)
     - Loop contínuo, com áudio no volume configurado
   - Quando uma chamada inicia (`announcingType` muda para 'triage' ou 'doctor'):
     - Vídeo é pausado e ocultado (fade-out 300ms)
     - Painel padrão volta totalmente visível com a chamada
     - O áudio TTS da chamada toca normalmente sem interferência
   - Quando a chamada termina (`announcingType` volta a `null`):
     - Vídeo reaparece (fade-in 300ms) e retoma play do ponto pausado

3. **Suporte a YouTube**
   - Detecta automaticamente se a URL é YouTube (`youtube.com/watch`, `youtu.be/`)
   - Para YouTube: usa `<iframe>` com parâmetros `autoplay=1&loop=1&playlist=ID&mute=0`
   - Para MP4 direto: usa `<video>` HTML5 nativo (controle de pause/play preciso)
   - YouTube tem limitação: o pause durante chamadas usa a YouTube Iframe API

## Detalhes técnicos

**Migração de DB** — adicionar colunas em `unit_settings`:
- `tv_video_url text` (nullable)
- `tv_video_enabled boolean default false`
- `tv_video_volume integer default 50`

**Arquivos a editar/criar:**
- `src/components/admin/MarketingPanel.tsx` — novo bloco de configuração de vídeo
- `src/components/PublicDisplay.tsx` — overlay condicional `<TVVideoOverlay />` controlado por `announcingType` e settings carregadas
- `src/components/tv/TVVideoOverlay.tsx` (novo) — componente que decide entre `<video>` (MP4) ou iframe YouTube com API JS para play/pause
- Hook existente `useUnitSettings` (ou similar) carrega novos campos via realtime

**Comportamento de áudio:**
- Volume do vídeo abaixa automaticamente para 0 durante chamadas (extra-segurança caso o pause demore)
- TTS da chamada usa AudioContext separado (já implementado), não conflita

**Restrições navegador (autoplay):**
- HTML5 `<video>` com áudio: requer interação do usuário antes do primeiro play (já há `audioUnlocked` no PublicDisplay — reutilizar)
- Se não houver unlock, vídeo inicia mudo e ativa som assim que `audioUnlocked = true`

**Ordem visual (z-index):**
```
Vídeo overlay (z-50, fullscreen)  ← visível só quando !announcingType
Header / Sidebar / Ticker (z-10)
Background gradient (z-0)
```

**Multi-unit:** todas configs filtradas por `unit_name` conforme regra do projeto.

## Fora do escopo
- Upload de arquivos de vídeo (somente URL externa nesta versão)
- Playlist de múltiplos vídeos (somente um por unidade)
- Edição/corte de vídeo
