# Krypta — Front-end (`src/`)

**React 19 + Vite + TypeScript + Tailwind + framer-motion + lucide-react.**
O mesmo código vira o **site**, o **app do celular (PWA / modo Mobile)** e o **app Windows (Tauri)**.

## Comandos (na raiz do projeto)
| Comando | O que faz |
|---|---|
| `npm run dev` | Front (5173) + API (3333) juntos |
| `npm run dev:front` | Só o front |
| `npm run build` | Build de produção → `dist/` (usa `.env.production`) |
| `npm run preview` | Testa o build em http://localhost:4173 (dá para instalar o PWA no PC) |
| `npm run lint` | oxlint |
| `npm run icones` | Regera a biblioteca de logos de marcas |

Em produção o site é montado pela Hostinger a partir do GitHub, com as variáveis definidas no painel do site
(`VITE_API_URL=https://krypta-api.onrender.com/api`, `VITE_SITE_URL=https://krypta.website`).

Variáveis (`.env` / `.env.production`, veja `.env.example`): `VITE_API_URL`, `VITE_SITE_URL`,
`VITE_DESKTOP_DOWNLOAD_URL`, login social. **Tudo com `VITE_` vai para o navegador: nunca coloque segredos.**

## Pastas
```
src/
├── main.tsx, App.tsx      Entrada, provedores (tema, auth, modo), registro do service worker
├── routes/                AppRoutes (modo Web) e destino pós-login
├── mobile/                MODO MOBILE: rotas, telas de app, UI própria, ícones, hooks do cofre
│   ├── modo.ts, ModoContext.tsx    Decide Web x Mobile (PWA, celular, largura ≤ 768) e o cliente
│   ├── MobileRoutes.tsx           Rotas do modo Mobile (mesmas URLs do site)
│   ├── Moldura.tsx                Mesma tela nos dois modos (app ou página do site)
│   ├── ui.tsx                     Componentes do app (cards, botões, folhas, campos)
│   ├── useCofre.ts                Estado do cofre: dispositivo deste aparelho + sessão remota
│   ├── carregamento.tsx           v1.4.0: loader só em telas pesadas/lentas
│   ├── TravaCofre.tsx             v1.3.0: criar / abrir / gerenciar o PIN e a biometria do cofre
│   ├── credenciais.ts             Tipos de chave e campos (Free x Pro)
│   ├── icones/                    Logos de marcas (simple-icons) e ícones padrão
│   └── pages/                     MEntrada, MOnboarding, MInicio, MCofre, MChaves, MAcesso, MRemoto, MConta
├── pages/                 Telas do site: Welcome, AuthPage, Device (Meu Krypta), Plans, Checkout,
│                          Orders, Products, Profile, Settings, Aplicacoes, HowItWorks, InheritanceClaim,
│                          Contact, RecoverPassword, ErrorPage, Suspended...
├── ajuda/                 Kody, o assistente (contexto, base, motor, KodyBot, KodyCard, abrir)
├── components/            Navbar, Footer, botões, cards, transições, login social;
│                          v1.3.0: AvisosApp (notificações), FotoPerfil, Dica
├── contexts/              AuthContext (sessão/usuário), ThemeContext (claro/escuro)
├── services/
│   ├── api.ts             Cliente HTTP: token, renovação automática, cabeçalho X-Krypta-Cliente, APIs
│   ├── vaultFlows.ts      Fluxos do cofre (parear, salvar, sincronizar, recuperar, Kill Switch, herança...)
│   ├── virtualDevice.ts   "ESP32 de software": chaves Ed25519 e cofre no navegador/app + Trava (v1.3.0)
│   ├── avisos.ts          v1.3.0: notificações (Windows, navegador, app) e não lidas
│   └── cofreRemoto.ts     v1.2.0: senha de acesso, sessão remota em memória, pontos de restauração
├── crypto/kryptaCrypto.ts Toda a criptografia: chave de contingência, Argon2id, HKDF, AES-GCM, vault.enc, PIN
├── config/                PWA, app desktop, login social
├── utils/plan.ts          Planos e recursos (espelho do servidor)
└── assets/, data/, hooks/, types/
```
Legado sem uso no fluxo atual: `services/mockDb.ts`, `services/database.ts`, `services/fakePayment.ts`, `services/teste.ts`.

## Regras importantes
- **Nome de arquivo = import, letra por letra.** O Windows ignora maiúsculas, o servidor de build (Linux) não:
  a pasta é `assets/Logos`, então o import é `../assets/Logos/...`.
- **Toda criptografia fica em `crypto/kryptaCrypto.ts`.** Parâmetros congelados: mudar exige rótulo `v2`.
- As telas chamam `services/vaultFlows.ts` / `services/cofreRemoto.ts`; não falam com a criptografia direto.
- Gravar o cofre: passe uma **função** (`salvar(lista => ...)`) para aplicar sobre a versão mais nova.
- O plano mostrado vem do servidor (`conta.recursos`); o front só esconde botões, quem bloqueia é a API.

Mais: [docs/MODO-MOBILE.md](../docs/MODO-MOBILE.md) · [docs/COFRE-REMOTO.md](../docs/COFRE-REMOTO.md) · [docs/ARQUITETURA.md](../docs/ARQUITETURA.md)
