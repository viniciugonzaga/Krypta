# Utilitários do front (`scripts/`)

| Script | Comando | O que faz |
|---|---|---|
| `gerar-icones.mjs` | `npm run icones` (roda sozinho após `npm install`) | Gera `src/mobile/icones/marcas.gerado.json` com os logos de marcas do pacote `simple-icons` (CC0). `npm run icones -- --todas` inclui ~3.300 marcas |
| `lancar-versao.mjs` | `npm run desktop:lancar` | Publica a versão do `package.json` (tag `vX.Y.Z`); sem Git no terminal, mostra o caminho pelo GitHub Actions |
| `copiar-instalador.mjs` | `npm run desktop:copiar` | Copia o `.exe` gerado localmente para `public/downloads/` (opção de download sem GitHub) |
