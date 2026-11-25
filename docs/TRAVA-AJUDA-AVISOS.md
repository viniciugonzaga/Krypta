# v1.3.0 / v1.4.0 — Trava do cofre, Kody, notificações, foto de perfil, Início e carregamento

## 1. Trava do cofre neste aparelho (PIN, senha ou biometria)

**Problema:** até a v1.2.1, quem pegasse o aparelho pareado (computador destravado, celular emprestado) abria o
cofre, porque o dispositivo de software ficava pronto no navegador.

**Agora:** o cofre tranca **também no aparelho pareado**.

| Como abre | Detalhe |
|---|---|
| **PIN** de 6 dígitos ou **senha** (8+ caracteres) | Criado no pareamento (passo 3 de "Ativar meu cofre") |
| **Biometria** (opcional) | Digital, rosto ou Windows Hello. Liga em *Senha do cofre → Ligar biometria* |
| **Chave de contingência** | "Esqueci o PIN": abre e obriga a criar um PIN novo |

- Tranca sozinha depois de **5 minutos** sem uso, ao recarregar a página e ao sair da conta.
- Errou o PIN 5 vezes: espera 30 s, depois o tempo dobra a cada erro (até 15 min).
- **Pro:** no pareamento dá para marcar "usar o mesmo PIN nos meus outros aparelhos", que cria a senha de acesso
  remota (v1.2.0) com o mesmo PIN.
- Quem já tinha cofre (antes da 1.3.0) vê o cartão **"Proteja o cofre neste aparelho"** e cria o PIN com a chave de contingência.

**Como funciona por dentro** (`src/services/virtualDevice.ts` → `Trava`):

1. Os dados do dispositivo (chave privada Ed25519, chave do cofre e credenciais) são cifrados com AES-256-GCM
   usando uma **chave da trava** aleatória de 32 bytes. No `localStorage` fica só o formato `krypta-device-v2` cifrado.
2. A chave da trava é guardada **embrulhada** de até três jeitos:
   - pelo PIN: `Argon2id(PIN, salt do aparelho, 64 MiB)` + HKDF `krypta-trava-pin-v1`;
   - pela chave de contingência: a mesma chave de envelope que abre o backup;
   - pela biometria: saída **PRF do WebAuthn** (autenticador do próprio aparelho) + HKDF `krypta-trava-bio-v1`.
3. Aberta, a chave fica **só na memória** da aba. Nada da trava vai para o servidor: não há tabela nova para isso.

> Biometria depende do navegador ter WebAuthn com a extensão PRF (Chrome/Edge recentes, Android, Safari 18+).
> Onde não há, o botão avisa e o PIN continua valendo.

## 2. Kody — o robô de ajuda (melhorado na v1.4.0)

O Kody aparece em três lugares: no **botão flutuante** (canto da tela), no cartão **"Fale com o Kody"** do Início
e do Perfil (app e site) e nas **dicas** ("Perguntar ao Kody"). No celular, o botão flutuante some no Início e no
Perfil, porque lá já tem o cartão. Arquivos em `src/ajuda/`:

| Arquivo | Papel |
|---|---|
| `contexto.ts` | Monta o **perfil** de quem pergunta: plano, situação do cofre (sem cofre, sem PIN, trancado, pronto, em outro aparelho, bloqueado), biometria, nº de chaves, herança, senha de acesso, dispositivo físico, questionário, página e plataforma |
| `base.ts` | ~60 assuntos com várias formas de responder. Inclui **fluxos guiados** (cofre não abre, perdi algo, escolher o plano em 3 perguntas), **check-up** da conta com nota, **gerador de senha**, dicas, conversa (oi, tudo bem, piada, obrigado, tchau) e perguntas sobre a própria conta (meu plano, quantas senhas) |
| `motor.ts` | A conversa: entende a resposta às perguntas que o Kody faz ("sim", "não", "o celular"), percebe irritação e responde com calma, entende duas perguntas na mesma mensagem, "outra!", "não entendi", continuação do assunto, tolera erros de digitação, não repete a mesma frase, usa o nome de vez em quando e, depois de 3 tentativas sem entender, oferece falar com a equipe |
| `KodyBot.tsx` | A janela: respostas em vários balões com "digitando…", rosto do Kody que muda com o humor, opções clicáveis, botões e navegação automática. Conversa guardada só na aba (senhas geradas não ficam) |
| `KodyCard.tsx` | Cartão "Fale com o Kody" com atalhos de pergunta |
| `abrir.ts` | `abrirKody('pergunta')` abre o Kody de qualquer tela |

Nada sai do aparelho: não há IA externa e o Kody **nunca** vê o conteúdo do cofre.

## 3. Notificações

Antes, "Notificações no aplicativo" era só um texto. Agora (`src/services/avisos.ts` + `src/components/AvisosApp.tsx`):

- Com a conta aberta, o app confere os eventos da conta a cada 60 s e quando a janela volta ao foco.
- Eventos importantes (novo login, cofre aberto em outro aparelho, Kill Switch, herança, troca da chave, senha, plano,
  dispositivo, alertas) viram:
  - **Windows:** notificação do sistema (`tauri-plugin-notification`, permissão `notification:default`);
  - **site/celular:** notificação do navegador (no PWA, pelo service worker);
  - **janela em uso:** aviso dentro do app (canto da tela).
- Sino do modo celular mostra as **não lidas**; abrir *Notificações* (ou *Perfil → Segurança* no site) marca como lidas.
- Liga/desliga em **Configurações → Notificações** (site) ou **Ajustes → Notificações neste aparelho** (celular).

## 4. Foto de perfil (v1.4.0)

- Conta nova: perfil **anônimo** (fundo roxo + ícone branco de pessoa).
- **Perfil → toque na foto**: escolha um dos **12 avatares do Kody** e a **cor do fundo** (12 cores prontas ou qualquer
  outra), ou envie uma **foto sua** (o app recorta e reduz para 320×320 JPEG). Dá para **baixar** o avatar em PNG e voltar ao anônimo.
- Fica salvo na conta (`users.avatar_url`): `kody:<1-12>:#RRGGBB` ou `data:image/jpeg;base64,...`. Aparece no site, no celular e no Windows.
- Banco: migração `008_avatar_perfil.sql` (já rodada na v1.3.0). API: `PUT /api/users/me { avatar }`.

## 5. Dicas e ajustes visuais

- Cartões **"Você sabia?"** (`src/components/Dica.tsx`) em Meu Krypta, Minhas chaves, Nova chave, Início do celular,
  Planos, Aplicações e Perfil. Fechou, não volta naquele aparelho. "Perguntar ao Kody" abre o robô já com a pergunta.
- Textos: **CCP → chave de contingência**, **kit do herdeiro → código de herança**, **CCH → chave do herdeiro**
  (só nos textos; no código e na API continuam `ccp`/`cch`).
- "Recebi um código de herança" com o ícone de chave e sublinhado na abertura do celular e no login.
- Herança, ID da conta e detalhes do dispositivo só aparecem **depois** que o cofre existe.
- Carregamento entre telas: de 1,1–4,5 s para 0,35–1,5 s.
- Fundo da abertura (as 3 frases): ondas desenhadas em `<canvas>` na resolução da tela — nítidas e sempre em movimento
  (com "reduzir movimento" ligado, só ficam mais lentas).
- Início do celular: pendências em roxo (antes amarelo), ícone do dispositivo no degradê roxo (antes preto),
  mais espaço entre os cartões; o selo Pro do perfil ficou lilás.

## 6. Início do site igual ao do app (v1.4.0)

- Logado, a página inicial do site e do Windows mostra o **Início** (`src/pages/inicio/PainelInicio.tsx`): cartão do
  cofre que muda com a situação (ativar, criar PIN, trancado, aberto, em outro aparelho), **resumo da conta**, atividades,
  cartão do Kody e atalhos. O resumo usa a mesma regra do app (`src/utils/resumoConta.ts`).
- Itens que ainda não valem (PIN, biometria, herança, pontos antes do cofre existir; recursos Pro no Free) não aparecem.
- Seção **Novidades** (`src/pages/inicio/Novidades.tsx`) para visitantes e logados, com botões para a tela certa.
- "Precisa de ajuda?" (Explore o sistema) agora abre o Kody; antes não levava a lugar nenhum.

## 7. Carregamento mais leve (v1.4.0)

- A animação do robô virou **WebP de ~1 MB** (antes GIF de 26 MB) e o palco encolhe em telas pequenas.
- **Celular:** o loader não aparece mais a cada troca de tela (`src/mobile/carregamento.tsx`). Ele aparece só:
  - na **1ª vez da sessão** em telas pesadas (cofre, chaves);
  - quando uma tela demora **mais de 0,7 s**.
  É um cartão compacto no meio da tela, não mais a tela cheia.
- Os robôs usados nas telas viraram WebP (`src/assets/kody/`), bem mais leves que os PNG originais (que continuam em `src/assets/sprites/`).
