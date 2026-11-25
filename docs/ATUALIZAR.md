# Como publicar uma versão nova do Krypta

Vale para qualquer versão (exemplo: **1.3.0**). Tudo é feito pelo **GitHub Desktop**, pelos painéis da
**Hostinger** e do **Render** e pelo site do **GitHub**. Não precisa de Git nem de Node no terminal.

> Repositório público: nunca coloque senhas, `.env` ou dados do banco em arquivos do projeto.

## Resumo

| Parte | O que você faz | Atualiza sozinho? |
|---|---|---|
| Banco (MySQL da Hostinger) | Roda a migração nova no phpMyAdmin **antes do push** | ❌ manual |
| Código | Copia os arquivos e faz **Commit + Push** no GitHub Desktop | — |
| Site `krypta.website` | Nada (a Hostinger remonta após o push) | ✅ |
| API `krypta-api.onrender.com` | Nada (o Render remonta após o push) | ✅ |
| App do celular (PWA) | Nada (atualiza na próxima abertura) | ✅ |
| App do Windows (.exe) | **Actions → Run workflow** no GitHub e instala por cima | ❌ manual |

---

## 1. Banco de dados (só se a versão tiver migração nova)

As migrações ficam em `server/sql/` e são numeradas. Cada uma roda **uma vez só**, na ordem.

1. hPanel da Hostinger → **Bancos de dados** → **phpMyAdmin** do banco do Krypta.
2. Clique no banco (à esquerda) → aba **SQL**.
3. Abra o arquivo da migração no Bloco de Notas, copie tudo, cole e clique **Executar**.
4. Deve aparecer "MySQL retornou um conjunto vazio" ou "X linhas afetadas" — está certo.

Rode **antes** do push: a API nova pode precisar da coluna nova assim que subir.

| Versão | Migração |
|---|---|
| 1.2.0 | `007_acesso_remoto_pontos.sql` |
| 1.3.0 | `008_avatar_perfil.sql` (foto de perfil) |
| 1.4.0 | nenhuma |

## 2. Código → GitHub (site e API atualizam sozinhos)

1. Extraia o zip da versão **por cima** da pasta do projeto (aceite substituir os arquivos).
2. Abra o **GitHub Desktop**: os arquivos mudados aparecem na lista.
   Confira que **não** aparece nenhum `.env` (se aparecer, desmarque).
3. Em *Summary* escreva, por exemplo, `v1.3.0 — trava do cofre, Kody e notificações` → **Commit to main**.
4. Clique **Push origin**.

Em seguida:
- **Hostinger** → *Websites* → `krypta.website` → **Implantações**: aparece um build novo. Espere "Concluído" (2–4 min).
- **Render** → serviço `krypta-api` → **Events**: "Deploy live" (3–6 min). Os **Logs** devem mostrar `✅ Conectado ao MySQL`.
- Teste: abra `https://krypta-api.onrender.com/health` e depois o site com **Ctrl + F5**.

Se o build da Hostinger falhar, abra o log da implantação e procure a primeira linha com `error`
(o erro mais comum é nome de arquivo com maiúscula/minúscula diferente: o Linux diferencia).

## 3. App do celular (PWA)

Não precisa fazer nada. O app instalado é o próprio site: na próxima vez que abrir, ele baixa a versão nova
(em **Ajustes → Atualizações** aparece "Atualizar agora" se ele já estava aberto).

## 4. App do Windows (.exe)

1. Site do GitHub → repositório → aba **Actions** → **App desktop (Windows)** → **Run workflow** → **Run workflow**.
2. Espere ficar verde (10–20 min; o primeiro com plugin novo demora mais).
3. Aba **Releases**: sai uma versão com `Krypta-Setup.exe`. O botão **Aplicações → Baixar para Windows** já aponta para ela.
4. No PC: baixe e instale **por cima** da versão antiga. Conta e cofre continuam (estão no servidor e no aparelho).

A versão do app vem do `package.json` (`"version"`). Suba o número a cada versão para o Windows reconhecer como atualização.

## 5. Conferência rápida depois de publicar

- [ ] `/health` responde `OK`
- [ ] Site abre e o rodapé/Ajustes mostram a versão nova
- [ ] Login funciona no site e no celular
- [ ] Abrir o cofre, criar uma chave de teste e apagar
- [ ] App do Windows instalado abre e entra na conta

---

## Notas da versão 1.3.0

- **Migração:** `008_avatar_perfil.sql` (rode antes do push).
- **Trava do cofre:** quem já tem cofre vai ver, no primeiro acesso, o cartão **"Proteja o cofre neste aparelho"**
  pedindo para criar o PIN (precisa da **chave de contingência**). É obrigatório: sem o PIN o cofre não abre na v1.3.0.
  Avise a equipe e os usuários de teste para terem a chave de contingência à mão.
- **Windows:** o app ganhou o plugin de notificações (`tauri-plugin-notification`). Precisa gerar o `.exe` de novo
  (passo 4) para as notificações funcionarem no Windows. Na primeira vez o Windows pode pedir permissão.
- **Biometria:** funciona no Chrome/Edge com Windows Hello, Android com digital e iPhone/Mac recentes.
  Onde o navegador não oferece, o botão avisa e o PIN continua valendo.
- Variáveis de ambiente: **nenhuma nova** (Hostinger, Render e GitHub continuam iguais).

## Notas da versão 1.4.0

- **Banco:** nada novo (a `008` da v1.3.0 já cobre os avatares). Se ainda não rodou a `008`, rode antes.
- **API (Render):** muda só a validação da foto (aceita os avatares do Kody). Atualiza sozinha com o push.
- **Windows:** gere o `.exe` de novo (Run workflow) para o app ter o Kody novo e o Início novo.
- Variáveis de ambiente: nenhuma nova.
