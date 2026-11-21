# Modo Mobile (app do celular)

## Quando o Krypta troca sozinho para o modo Mobile
| Situação | Modo |
|---|---|
| Aberto pelo app instalado (PWA, ícone na tela inicial) | Mobile |
| Celular ou tablet (navegador) | Mobile |
| Janela com até 768 px de largura | Mobile |
| Computador com janela larga, app para Windows | Web |

Em **Ajustes → Modo de exibição** a pessoa escolhe **Automático / Mobile / Web** (vale para aquele aparelho).
Código: `src/mobile/modo.ts` (detecção) e `src/mobile/ModoContext.tsx` (troca ao vivo ao girar/redimensionar).

## O servidor também identifica
- Toda requisição leva o cabeçalho `X-Krypta-Cliente: web | mobile | pwa | desktop`.
  Sem ele, o servidor deduz pelo navegador (User-Agent). Middleware: `server/src/middlewares/cliente.ts`.
- A sessão é gravada com o cliente (`sessions.cliente`) → Perfil mostra **"Onde sua conta está aberta"**.
- O alerta de login diz "Login realizado pelo celular / pelo app do celular / pelo app para Windows".
- `GET /api/client/context` → `{ cliente, aparelho, modoRecomendado }`.

## Questionário de boas-vindas (primeiro acesso)
- Depois do cadastro (site ou app), a pessoa vai para **/boas-vindas**: 5 perguntas, com "Pular".
- `POST /api/onboarding` salva as respostas e o **servidor** calcula o plano recomendado
  (`server/src/services/Recomendacao.ts`). A tela mostra os motivos e leva direto aos **Planos**.
- `GET /api/users/me` passa a trazer `onboardingConcluido` e `recomendacao`.

## Telas do modo Mobile (`src/mobile/pages`)
| Endereço | Tela |
|---|---|
| `/` (sem login) | Abertura com as 3 frases e as ondas roxas |
| `/login`, `/register` | Entrar e criar conta |
| `/boas-vindas` | Questionário + recomendação |
| `/` (logado) | Início: resumo da conta, atividades, plano, dispositivo |
| `/device` | Cofre Digital |
| `/cofre/chaves`, `/cofre/nova-chave` | Minhas chaves e o botão **+** |
| `/heranca-digital`, `/bloqueio`, `/emergencia` | Herança, Kill Switch (com a CCP) e emergência |
| `/cofre/completo` | A tela completa do cofre do site (pareamento, CCP, kit de herança) |
| `/notificacoes`, `/profile`, `/settings`, `/plans` | Notificações, perfil, ajustes, planos |

Os endereços são os mesmos do site. Checkout, Minhas compras, Produtos, Aplicações e o resgate de herança
abrem a versão do site (já responsiva). Serviços e Como funciona não aparecem no app.
O chat com o Cody (bot) ficou para depois.

## Migração
`server/sql/005_modo_mobile_onboarding.sql` (depois da 004).

## Teste
`npm run sim -- testar-tudo` (inclui `mobile`) ou `npm run sim -- mobile <email> <senha>`.
