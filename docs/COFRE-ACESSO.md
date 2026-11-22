# Cofre: outros aparelhos, CCP perdida e chaves com ícones e campos (v1.1.0)

## 1. Ver o cofre em outro aparelho (Krypta Pro)
- Tela: **Cofre → "Ver o cofre neste aparelho"** (`/cofre/ver`, app e site).
- Mesma conta + a **CCP**: o navegador gera a prova da CCP, o servidor confere e devolve o
  backup **cifrado** (`POST /api/vault/backup/ccp`). Quem abre é o aparelho. O servidor continua sem ver nada.
- **Só leitura**, fecha sozinho em 5 minutos, gera alerta de acesso e e-mail.
- Criar/editar continua no aparelho pareado (ele é a fonte da verdade: evita duas cópias diferentes do cofre).
- **Free**: a tela explica que o cofre fica só no aparelho pareado e mostra os caminhos.

## 2. Perdi minha CCP (`/perdi-ccp`, todos os planos)
| Situação | O que fazer | O que se perde |
|---|---|---|
| Perdi a CCP, **estou com o dispositivo** | O dispositivo cria uma CCP nova (`POST /api/vault/ccp/reset`) com o token do dispositivo **+ a senha do site** | Nada |
| Tenho a CCP, **perdi o dispositivo** | Bloqueio Remoto (Kill Switch, Pro) e vincular um aparelho novo | Nada |
| **Perdi a CCP e o dispositivo** | **Abandonar o cofre**: senha + código de 6 dígitos por e-mail (`/api/vault/abandon/request` e `/confirm`) | O cofre antigo (ninguém conseguiria abri-lo mesmo) |

Por que é seguro:
- A CCP continua nunca saindo do aparelho; o servidor guarda só a prova dela.
- CCP nova exige **o dispositivo (que já tem a chave do cofre) E a senha**: um ladrão só com o aparelho não consegue.
- Abandonar exige **senha + código do e-mail** e **não revela nada**: o backup é apagado sem ser aberto.
  Quem tiver a senha da conta poderia, no máximo, apagar um cofre que já estava perdido, e o dono recebe e-mail.
- Depois de abandonar, a conta, o plano e as compras continuam. **v1.2.0: cada cofre tem as suas chaves** —
  o cofre novo começa vazio (nada do antigo é copiado, nem do aparelho; a senha de acesso e os pontos de
  restauração do cofre antigo também são apagados).
- Um Krypta físico comprado volta a "Pronto para parear" (comando `reset` no firmware gera chave nova).

## 3. Chaves com tipos, campos e ícones de marcas
- **Tipos**: Login, Cartão, Endereço, Wi-Fi, Documento, Nota segura, Personalizado.
  Cada tipo começa com os campos dele; **"Adicionar campo"** cria quantos precisar; cada campo pode ser **secreto**.
  **v1.2.0:** no Free ficam Login (nome, usuário e senha), Wi-Fi e Nota segura; Cartão, Endereço, Documento,
  Personalizado e "Adicionar campo" (5+ campos) são do Pro. O editor agora também abre no modo Web
  (`/cofre/chaves` e `/cofre/nova-chave`).
- **Ícones**: o nome da chave é reconhecido ("Epic Games" → logo da Epic). A biblioteca vem do pacote livre
  **simple-icons** (CC0), gerada no `npm install` em `src/mobile/icones/marcas.gerado.json` (~300 marcas).
  Sem a marca, o Krypta escolhe um **ícone padrão** pelo sentido (banco, jogo, e-mail, Wi-Fi, escola...).
  Toque no ícone para escolher outro (aba Marcas ou Ícones do Krypta).
- Os logos saem do próprio site: nenhum pedido vai para fora com o nome dos seus serviços.
- Mais marcas: edite a lista em `scripts/gerar-icones.mjs` e rode `npm run icones` (ou `npm run icones -- --todas`).

## Migração
`server/sql/006_cofre_multiaparelho_abandono.sql` (depois da 005).

## Teste
`npm run sim -- testar-tudo` (inclui `acesso`) ou `npm run sim -- acesso <email> <senha>`.
