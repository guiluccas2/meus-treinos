# Meus Treinos

App (PWA) para controlar treinos de academia: planilhas com período, calendário com o dia certo de cada treino, registro de cargas e repetições por série, tipos de exercício, formas de execução (biset, triset, circuito…) e vídeos/animações de execução.

Funciona no computador e no celular (instalável na tela inicial), inclusive offline. Os dados são salvos automaticamente num **repositório privado** do GitHub.

## Funcionalidades

- **Importar planilha do Word (.docx)** — uma linha por exercício: `E. Força MMII – Step-up alto carregado – 4x6-8`. Exercícios com a mesma letra formam um bloco (2 = biset, 3 = triset, 4+ = circuito). Títulos como `Treino 1 – FORÇA` iniciam um novo treino. Datas são lidas do nome do arquivo (`… 12.10 a 29.11`).
- **Planilhas** com data de início e fim, em **dias fixos** da semana ou em **rodízio** (A→B→C; faltar não pula treino).
- **Editor** de treinos, blocos e exercícios: séries, reps/tempo/distância, carga, cadência, RIR/RPE, descanso e observações; juntar/separar blocos, reordenar, duplicar treinos e planilhas.
- **Execução do treino**: carga e repetições por série, valores da última vez, cronômetro de descanso com som e vibração, anotações.
- **Calendário** mensal com treinos previstos, feitos e não realizados.
- **Biblioteca de exercícios** com tipos editáveis e mídia:
  - **Animação padronizada por IA**: a partir de um vídeo seu (ou um trecho baixado do YouTube), o app detecta a pose quadro a quadro (MediaPipe, no próprio aparelho) e gera um boneco animado no estilo do app.
  - Link do YouTube com início/fim.
  - Vídeo próprio (até 40 MB), guardado no repositório privado.
- **Evolução**: treinos por semana, maior carga, volume e histórico por exercício.
- **Temas**: Lima, Oceano, Brasa, Violeta, Rosa e Grafite — cada um em versão clara e escura (ou automática).
- **Tipos de exercício e formas de execução editáveis** em Ajustes.

## Como os dados são salvos

- Toda alteração é gravada no aparelho na hora e enviada ao GitHub ~3 s depois (cada envio é um commit — o histórico funciona como backup).
- Arquivos no repositório de dados: `dados/meus-treinos.json`, `animacoes/*.json`, `videos/*`.
- Sem internet, o app continua funcionando e envia quando a conexão voltar.
- Se o mesmo dado for alterado em dois aparelhos ao mesmo tempo, vale a última alteração (a versão anterior fica no histórico de commits).

## Configuração

### 1. App (este repositório) no GitHub Pages
1. Em **Settings → Pages**, em *Build and deployment → Source*, escolha **GitHub Actions**.
2. Cada push na branch `main` publica o app em `https://<seu-usuario>.github.io/meus-treinos/`.

> No plano gratuito, o GitHub Pages exige que este repositório seja **público**. Ele contém só o código — seus dados ficam no repositório privado abaixo.

### 2. Repositório de dados (privado)
1. Crie um repositório **privado** `meus-treinos-dados` em https://github.com/new (marque *Add a README*).
2. Crie um token *fine-grained* em https://github.com/settings/personal-access-tokens/new:
   - *Repository access*: **Only select repositories** → `meus-treinos-dados`
   - *Permissions → Repository permissions → Contents*: **Read and write**
3. No app, abra **Ajustes → Salvamento no GitHub**, cole o token e conecte. Faça isso em cada aparelho.

O token fica guardado apenas no aparelho e só é enviado para `api.github.com`.

## Desenvolvimento

```bash
npm install
npm run dev
```

Stack: React 18 + Vite + vite-plugin-pwa, mammoth (leitura de .docx), MediaPipe Tasks Vision (pose), idb-keyval (cache local).
