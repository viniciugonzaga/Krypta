# Krypta v1.2.0 — Cofre em qualquer aparelho, relatórios e pontos de restauração

## O problema
Até a v1.1.0, o cofre abria em dois lugares: no **aparelho pareado**, ou em qualquer outro aparelho **com a CCP**
(só leitura). Para ver uma senha fora de casa, a pessoa precisaria andar com a CCP. Isso é ruim: a CCP é a
chave de emergência, feita para ficar guardada em papel e não para ser digitada todo dia.

## A solução (Krypta Pro): senha de acesso ao cofre
A pessoa cria **uma vez** um **PIN de 6 dígitos** (ou uma senha mais longa). Para criar, usa a CCP.
Depois, em **qualquer aparelho logado na conta** (site, celular/PWA, app Windows), o PIN abre o cofre
com **ver, criar, editar e remover**.

### Por que NÃO usar a mesma senha da conta
No login o servidor recebe a senha da conta. Se ela também abrisse o cofre, o servidor (ou quem invadir o
servidor) conseguiria abrir o cofre, e o Krypta deixaria de ser *zero-knowledge*. Por isso a senha de acesso
tem que ser **outra**, e ela **nunca sai do aparelho**.

### Como funciona por dentro
```
Criar (com a CCP)
  navegador: CCP → prova ──────────────────────────────► servidor confere a prova da CCP
  servidor: gera SEGREDO (32 bytes) + salt; guarda o segredo cifrado com o PASSWORD_PEPPER
  servidor ─► backup cifrado + salt + segredo ─► navegador
  navegador: abre o envelope da CCP → chave do cofre
             master = Argon2id(PIN, salt)          (64 MiB, t=3: 1-3 s de propósito)
             prova_pin  = HKDF(master, "krypta-prova-pin-v1")                 → servidor (bcrypt+pepper)
             chave_pin  = HKDF(master ‖ SEGREDO, "krypta-envelope-pin-v1")    → nunca sai
             envelope_pin = AES-GCM(chave_pin, chave do cofre)                 → servidor
Abrir (só o PIN)
  navegador: Argon2id(PIN, salt) → prova_pin ─► servidor confere (5 erros = BLOQUEIO)
  servidor ─► envelope_pin + SEGREDO + backup cifrado + token do cofre (15 min)
  navegador: chave_pin → abre envelope_pin → chave do cofre → abre as credenciais (só na memória)
Editar
  navegador baixa o backup mais novo, troca só os DADOS, mantém os envelopes, envia com versão + 1
  servidor recusa se a versão não subir (conflito) ou se tentarem trocar o envelope da CCP/herdeiro
```

### Por que é seguro (e onde estão os limites)
| Ameaça | O que protege |
|---|---|
| Alguém descobre a **senha da conta** | Sem o PIN não abre nada. 5 PINs errados bloqueiam; você recebe e-mail. |
| Alguém vê/adivinha o **PIN** | Sem estar logado na conta, o PIN não serve. Toda abertura vira alerta + e-mail. |
| **Força bruta online** no PIN | 5 tentativas por configuração + limite por IP. Desbloquear exige a CCP. |
| Roubo **só do banco de dados** | O banco tem a prova do PIN com bcrypt+**pepper** e o segredo cifrado com o **pepper** (no `.env`, fora do banco): não dá para testar PINs offline. |
| **Servidor inteiro comprometido** (banco + `.env`) | Este é o limite honesto do PIN: com tudo na mão, 1.000.000 de PINs × Argon2id de 64 MiB é caro, mas possível. Por isso existe a opção **"Senha (mais forte)"**: com 8+ caracteres aleatórios, a força bruta deixa de ser viável. A CCP e o dispositivo continuam fora do alcance do servidor. |
| Aparelho emprestado/esquecido aberto | O cofre fecha sozinho em 15 min, ao recarregar a página, em "Fechar" e ao sair da conta. A chave fica só na memória. |
| Aparelho remoto malicioso tentando sequestrar a recuperação | O servidor não deixa trocar/remover o envelope da CCP nem o do herdeiro por esse caminho. |
| Kill Switch / herança resgatada | A senha de acesso é apagada na hora. |

Resumo: **PIN = conveniência com proteção forte contra quem não é o servidor**. Para quem quer o máximo,
"Senha (mais forte)". A CCP continua sendo a única chave que o servidor nunca consegue atacar.

## Relatórios (alertas da conta)
Cada gravação do cofre manda um **resumo só com contagens** (`adicionadas`, `editadas`, `removidas`). Nomes de
serviços **nunca** vão ao servidor. O relatório mostra, por exemplo:
- "Cofre editado no dispositivo pareado no navegador (Chrome · Windows): 2 adicionadas (versão 14)"
- "Cofre aberto com a senha de acesso no celular (app instalado)"
- "Senha de acesso BLOQUEADA após 5 erros"
- "Cofre voltou ao ponto 'Antes de trocar as senhas'"

## Pontos de restauração ("salvar estado do cofre")
- **Salvar**, **restaurar** e **apagar** exigem a CCP (quem só tem a senha da conta ou o PIN não mexe neles).
- O ponto é uma **cópia cifrada** do backup: o servidor guarda e não consegue abrir.
- **Restaurar** troca só os **dados**: a CCP e o kit do herdeiro atuais continuam valendo, mesmo que tenham sido
  trocados depois do ponto.
- Antes de restaurar, o estado atual vira um **ponto automático** (dá para desfazer). Ficam os 3 últimos automáticos.
- Limite: Free 2 pontos · Pro 20.
- O dispositivo pareado e quem está com o cofre aberto pelo PIN recebem a versão restaurada (sincronia).

## Sincronia do dispositivo pareado
Como outros aparelhos agora editam, o aparelho pareado **puxa a versão nova** (`GET /vault/backup/sync`) ao abrir
o cofre e **antes de toda gravação**. Se a lista mudou enquanto a pessoa editava, a gravação é recusada com
"O cofre foi alterado em outro aparelho" e a lista é atualizada (nada é apagado sem querer).
> ESP32 físico: a sincronia entra na fase 2 do firmware. Enquanto isso, as edições remotas ficam no backup e o
> app do dispositivo de software já sincroniza.

## Campos por plano
- **Free:** Login (nome, usuário/e-mail e senha + observação), Wi-Fi e Nota segura.
- **Pro:** Cartão, Endereço, Documento, Personalizado e **"Adicionar campo"** (5, 10, quantos precisar).
- O limite é aplicado no app. O servidor não consegue conferir o conteúdo (está cifrado), mas confere o
  tamanho do cofre por plano (Free 64 KB · Pro 1 MB).

## Abandonar o cofre: cada cofre tem as suas chaves
Na v1.1.0, abandonar o cofre podia levar as chaves deste aparelho para o cofre novo (opção marcada por padrão).
Isso misturava cofres e foi **removido**. Agora o abandono apaga: backup, senha de acesso, pontos de restauração
e o dispositivo deste aparelho. O cofre novo começa **vazio**.

## Testes
```
npm run sim -- remoto <email> <senha>      # só esta parte
npm run sim -- testar-tudo                 # tudo, com conta nova
```
