# v1.3.0 — Trava do cofre, Kryp, notificações, foto de perfil e dicas

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

## 2. Kryp — o robô de ajuda

Botão roxo com o robô no canto da tela (site, celular e Windows). Arquivos em `src/ajuda/`:

| Arquivo | Papel |
|---|---|
| `contexto.ts` | Monta o **perfil** de quem pergunta: plano, situação do cofre (sem cofre, sem PIN, trancado, pronto, em outro aparelho, bloqueado), biometria, nº de chaves, herança, senha de acesso, dispositivo físico (comprado, a caminho, pareado), respostas do questionário, página e plataforma |
| `base.ts` | ~40 assuntos (perguntas frequentes). Cada resposta muda conforme o perfil e traz botões que levam à tela certa |
| `motor.ts` | Entende a pergunta: tira acentos, troca sinônimos e gírias ("vc", "cel", "contigencia"), tolera erros de digitação (distância de edição), dá peso à página atual, entende continuação ("e se eu esquecer?", "não entendi") e, sem certeza, oferece "você quis dizer…?" |
| `KrypBot.tsx` | A janela: digitando…, sugestões por página, conversa guardada só na aba (`sessionStorage`) |

Nada sai do aparelho: não há IA externa e o Kryp **nunca** vê o conteúdo do cofre.
Qualquer tela pode abrir o Kryp com uma pergunta: `window.dispatchEvent(new CustomEvent('krypta:kryp', { detail: 'pergunta' }))`.

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

## 4. Foto de perfil

- **Perfil → toque no avatar**: enviar foto (o app recorta e reduz para 256×256 JPEG) ou escolher um dos 6 avatares do Krypta.
- Sem escolha, todo mundo tem o **mesmo avatar padrão** (robô roxo), no lugar da letra.
- Banco: migração `008_avatar_perfil.sql` (`users.avatar_url` → `MEDIUMTEXT`). API: `PUT /api/users/me { avatar }`.

## 5. Dicas e ajustes visuais

- Cartões **"Você sabia?"** (`src/components/Dica.tsx`) em Meu Krypta, Minhas chaves, Nova chave, Início do celular,
  Planos, Aplicações e Perfil. Fechou, não volta naquele aparelho. "Perguntar ao Kryp" abre o robô já com a pergunta.
- Textos: **CCP → chave de contingência**, **kit do herdeiro → código de herança**, **CCH → chave do herdeiro**
  (só nos textos; no código e na API continuam `ccp`/`cch`).
- "Recebi um código de herança" com o ícone de chave e sublinhado na abertura do celular e no login.
- Herança, ID da conta e detalhes do dispositivo só aparecem **depois** que o cofre existe.
- Carregamento entre telas: de 1,1–4,5 s para 0,35–1,5 s.
- Fundo da abertura (as 3 frases): ondas desenhadas em `<canvas>` na resolução da tela — nítidas e sempre em movimento
  (com "reduzir movimento" ligado, só ficam mais lentas).
- Início do celular: pendências em roxo (antes amarelo), ícone do dispositivo no degradê roxo (antes preto),
  mais espaço entre os cartões; o selo Pro do perfil ficou lilás.
