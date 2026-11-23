# Guia de conexão: Dispositivo Krypta (ESP32) com o sistema

Este guia é para quem vai ligar a placa física ao Krypta pela primeira vez.
Siga as partes na ordem. Cada parte termina com um **✅ Confira**: só passe
para a próxima quando o que está ali acontecer.

Tempo estimado: 1 a 2 horas na primeira vez.

> **Atualizado na v1.2.1:** o Krypta está no ar (site `https://krypta.website`, API
> `https://krypta-api.onrender.com/api`). A placa pode usar a **API online** (mais simples: não precisa
> de servidor ligado no PC nem de mexer no firewall) ou um **servidor no seu PC** (para desenvolvimento).
> Veja a parte 6.

---

## Sumário

1. [O que você vai precisar](#1-o-que-você-vai-precisar)
2. [Como tudo se conecta (visão geral)](#2-como-tudo-se-conecta-visão-geral)
3. [Montar as ligações](#3-montar-as-ligações)
4. [Preparar a IDE Arduino](#4-preparar-a-ide-arduino)
5. [Gravar o firmware na placa](#5-gravar-o-firmware-na-placa)
6. [Escolher o servidor: online ou no PC](#6-escolher-o-servidor-online-ou-no-pc)
7. [Configurar a placa pelo Monitor Serial](#7-configurar-a-placa-pelo-monitor-serial)
8. [Parear no site](#8-parear-no-site)
9. [Testar o cartão e o Kill Switch](#9-testar-o-cartão-e-o-kill-switch)
10. [Quando algo dá errado](#10-quando-algo-dá-errado)
11. [Referência rápida](#11-referência-rápida)

---

## 1. O que você vai precisar

**Peças**
- 1 placa **ESP32** (modelo "ESP32 DevKit" / "ESP32 Dev Module", com Wi-Fi)
- 1 leitor **PN532** (NFC), de preferência a versão vermelha com chavinhas de modo
- 1 tela redonda **GC9A01** (1,28", 240×240)
- 1 cartão ou chaveiro NFC (MIFARE, aqueles que vêm junto com o PN532)
- Fios jumper fêmea-fêmea e um cabo **USB de dados** (alguns cabos só carregam: se a placa não aparecer no PC, troque o cabo)

**No computador**
- A IDE Arduino 2 (baixe em arduino.cc → Software)
- Uma conta com plano **Pro** no site que a placa vai usar: `https://krypta.website` (API online) ou o site local
- Só no modo servidor no PC: o projeto rodando (`npm run dev` na pasta `server` e na raiz)

**Rede**
- Um Wi-Fi de **2,4 GHz** com internet (o ESP32 não conecta em 5 GHz). Pode ser o roteador de casa ou o do celular.
- Só no modo servidor no PC: o ESP32 e o computador precisam estar **na mesma rede**.

---

## 2. Como tudo se conecta (visão geral)

```
 [Cartão NFC] ──► [PN532] ──I2C──► [ESP32] ──SPI──► [Tela redonda]
                                      │
                                Wi-Fi (HTTPS)
                                      │
             [API Krypta: online no Render  OU  no seu PC]  ◄──►  [Site: Meu Krypta]
```

O que acontece, em ordem:

1. No primeiro boot, o ESP32 cria uma **chave própria** (Ed25519) e guarda na memória dele. A parte secreta nunca sai da placa.
2. Ele conecta no Wi-Fi e **se apresenta** ao servidor com o número de série.
3. A tela mostra um **código de 6 dígitos**. O site mostra o mesmo código.
4. Você confere se os códigos batem e **pareia pelo site**.
5. A tela passa a mostrar "Aproxime o cartão". O primeiro cartão vira o **cartão do dono**.
6. Com o cartão certo, a placa **entra no cofre** (o servidor manda um desafio e a placa assina).
7. Se alguém acionar o **Kill Switch** no site, a tela mostra **BLOQUEADO**.

---

## 3. Montar as ligações

> ⚠️ Faça as ligações com a placa **desconectada** do USB.

### Leitor NFC PN532 (modo I2C)

Na placa PN532 vermelha há duas chavinhas. Para **I2C**: chave 1 em **ON** e chave 2 em **OFF**.

| PN532 | ESP32 |
|---|---|
| VCC | 3V3 |
| GND | GND |
| SDA | GPIO **21** |
| SCL | GPIO **19** |

### Tela redonda GC9A01

| Tela | ESP32 |
|---|---|
| VCC | 3V3 |
| GND | GND |
| SCL (ou SCK) | GPIO **18** |
| SDA (ou MOSI) | GPIO **23** |
| RST (ou RES) | GPIO **27** |
| DC | GPIO **25** |
| CS | GPIO **26** |
| BL (se tiver) | 3V3 |

> Os pinos do PN532 e os de RST/DC/CS são os mesmos do teste antigo (`sketch_oct6a`). Se a equipe mudar algum fio, mude também no começo do firmware (`#define SDA_PIN`, etc.).

**✅ Confira:** cada fio sai do pino certo. Dois fios em GND e dois em 3V3 é normal (use os vários pinos GND/3V3 da placa ou uma protoboard).

---

## 4. Preparar a IDE Arduino

### 4.1 Instalar o suporte ao ESP32

1. Abra a IDE Arduino.
2. **File → Preferences** (Arquivo → Preferências).
3. Em **Additional boards manager URLs**, cole:
   ```
   https://espressif.github.io/arduino-esp32/package_esp32_index.json
   ```
4. Clique em **OK**.
5. Abra o **Boards Manager** (ícone de placa na barra da esquerda), pesquise **esp32** e instale **"esp32 by Espressif Systems"**. Demora alguns minutos.

### 4.2 Instalar as bibliotecas

Abra o **Library Manager** (ícone de livros na barra da esquerda) e instale cada uma. Se perguntar sobre dependências, clique em **Install All**.

| Pesquise | Instale |
|---|---|
| `Adafruit PN532` | **Adafruit PN532** (by Adafruit) |
| `DIYables TFT Round` | **DIYables_TFT_Round** (by DIYables) |
| `ArduinoJson` | **ArduinoJson** (by Benoit Blanchon), versão **7** |
| `Crypto` | **Crypto** (by **Rhys Weatherley**). Atenção: existem outras com nome parecido. |

**✅ Confira:** as quatro aparecem como "INSTALLED".

---

## 5. Gravar o firmware na placa

1. Na IDE Arduino: **File → Open** → abra `hardware/krypta-esp32/krypta-esp32.ino` (dentro da pasta do projeto Krypta).
   - A pasta `krypta-esp32` deve ter **só esse arquivo**. Não coloque o `sketch_oct6a.cpp` ou outro sketch junto, senão dá erro de "função duplicada".
2. Ligue o ESP32 no USB.
3. No topo da IDE, em **Select Board**:
   - Placa: **ESP32 Dev Module**
   - Porta: a que apareceu quando você ligou a placa (no Windows é algo como **COM3**, **COM5**...)
   - Se nenhuma porta aparecer, instale o driver USB da placa: **CP210x** (Silicon Labs) ou **CH340**, conforme o chip escrito perto do conector USB.
4. Clique em **Upload** (a seta →).
5. Se travar em `Connecting........`, **segure o botão BOOT** da placa até começar a gravar e depois solte.

**✅ Confira:** no fim aparece `Hard resetting via RTS pin...` e a tela redonda mostra **KRYPTA** e depois **"Configure pelo USB"**.

---

## 6. Escolher o servidor: online ou no PC

> ⚠️ A placa e o site precisam usar **o mesmo servidor** (e portanto o mesmo banco).
> Placa na API online → parear em `https://krypta.website`. Placa no PC → parear no site local (`http://localhost:5173`).

### 6.0 Opção A — API online (recomendado)

Não precisa preparar nada no computador. O endereço da API é:

```
https://krypta-api.onrender.com/api
```

**✅ Confira:** no celular, abra `https://krypta-api.onrender.com/health`. Deve aparecer `"status":"OK"`.
Se demorar até 1 minuto, é a API "acordando" (plano grátis do Render); depois fica rápida.
Com a opção A, pule para a parte 7 e use esse endereço no comando `api`.

### Opção B — Servidor no seu PC

A placa precisa encontrar o servidor pela rede. `localhost` não serve, porque para a placa "localhost" é ela mesma.

### 6.1 Descobrir o IP do computador

1. No Windows, abra o **PowerShell** e digite:
   ```
   ipconfig
   ```
2. Procure o adaptador que está em uso (**Wi-Fi** ou **Ethernet**) e anote o **Endereço IPv4**. Exemplo: `192.168.0.15`.

### 6.2 Deixar a porta 3333 aberta no firewall

1. Abra o **PowerShell como Administrador** (botão direito → Executar como administrador).
2. Cole:
   ```
   netsh advfirewall firewall add rule name="Krypta API 3333" dir=in action=allow protocol=TCP localport=3333
   ```
3. Confira se a rede do Windows está como **Rede privada** (Configurações → Rede e Internet → Wi-Fi → nome da rede → Perfil de rede: **Privada**).

### 6.3 Servidor ligado e banco atualizado

1. No phpMyAdmin, confirme que as migrações **001 a 007** já foram executadas no banco `krypta` (a 004 adiciona a coluna `chave_anunciada` na tabela `dispositivos`).
2. Na pasta `server`: `npm run dev`.

**✅ Confira:** no **celular conectado no mesmo Wi-Fi**, abra o navegador em
`http://SEU-IP:3333/health` (ex.: `http://192.168.0.15:3333/health`).
Deve aparecer `"status":"OK"`. Se o celular abre, a placa também vai conseguir.

---

## 7. Configurar a placa pelo Monitor Serial

### 7.1 Pegar o número de série

1. No site (`https://krypta.website` na opção A, ou o local na opção B), entre na conta **Pro** que vai usar a placa.
2. Se ainda não tiver um dispositivo: **Produtos → Comprar** (o pagamento é simulado).
3. Vá em **Minhas compras** e clique em **"Recebi meu dispositivo"**.
4. Clique no ícone de copiar ao lado do número de série (formato `KRY-XXXX-XXXX-XXXX`).

### 7.2 Abrir o Monitor Serial

1. Na IDE Arduino: **Tools → Serial Monitor** (ou o ícone de lupa no canto superior direito).
2. Embaixo, ajuste:
   - velocidade: **115200 baud**
   - fim de linha: **New Line** (Nova linha)
3. Aperte o botão **EN/RST** da placa para ver o começo das mensagens.

### 7.3 Digitar os 3 comandos

Digite **um por vez** na caixa do Monitor Serial e aperte **Enter**:

```
wifi NomeDaRede SenhaDaRede
```
> Se o nome da rede tiver espaço, use dois comandos no lugar deste:
> ```
> rede Casa do Joao
> senha 12345678
> ```

```
api https://krypta-api.onrender.com/api
```
> Opção A (API online): use exatamente o endereço acima.
> Opção B (PC): `api http://SEU-IP:3333/api`, com o IP do passo 6.1. Exemplo: `api http://192.168.0.15:3333/api`.
> Nos dois casos: com `/api` no fim e **sem** barra depois.

```
serial KRY-XXXX-XXXX-XXXX
```
> Cole o número de série copiado no passo 7.1.

Depois digite:
```
status
```

**✅ Confira:** o Monitor mostra algo assim:
```
Conectando no Wi-Fi MinhaCasa.... ok, IP 192.168.0.42
Servidor: AGUARDANDO_PAREAMENTO · codigo 482 117
------ KRYPTA ------
Serie:   KRY-7F3A-9C1B-04D2
API:     https://krypta-api.onrender.com/api
Wi-Fi:   MinhaCasa (conectado)
Codigo:  482 117
Estado:  AGUARDANDO_PAREAMENTO
```
E a tela mostra **"PAREAR NO SITE"** com o código de 6 dígitos.

> A configuração fica salva na placa. Depois de desligar e ligar, ela reconecta sozinha.

---

## 8. Parear no site

1. Abra **Meu Krypta** (menu Krypta) com a mesma conta Pro, **no mesmo site** do servidor escolhido na parte 6.
   - O cofre precisa estar **aguardando pareamento** (conta que ainda não pareou nenhum dispositivo). Se a conta já tem cofre, use uma conta nova Pro para este teste.
2. Em **"1. Escolha o dispositivo"**, marque o número de série. Ele aparece com **"● ligado"** em verde (a página confere sozinha a cada 5 segundos).
3. Aparece o quadro **"Usar o hardware real"** com um código grande.
   **Compare com a tela da placa.** Se os 6 dígitos forem iguais, deixe marcado. Se forem diferentes, **não pareie** (veja a seção 10).
4. Em **"2. Gere sua chave de contingência"**, gere a CCP, **anote em papel**, confirme e clique em **Parear**.

**✅ Confira:**
- O site mostra o cofre **ATIVO** e o quadro verde **"Cofre no hardware real"**.
- Em até 10 segundos, a tela da placa muda para **KRYPTA / "Cadastre seu cartão"**.
- Em **Minhas compras**, o dispositivo aparece como **Pareado · Hardware real no cofre**.

---

## 9. Testar o cartão e o Kill Switch

### 9.1 Cadastrar o cartão do dono

1. Aproxime o cartão NFC do PN532.
2. A tela mostra **"CARTÃO SALVO"**.

### 9.2 Entrar no cofre

1. Aproxime o **mesmo** cartão de novo.
2. A tela mostra **"ENTRANDO..."** e depois **"LIBERADO"**.
3. O Monitor Serial mostra `Login no cofre OK`.
4. Teste com outro cartão: a tela mostra **"RECUSADO"**.

### 9.3 Kill Switch (perdi o dispositivo)

1. No site, em **Meu Krypta → Perdi o dispositivo (Kill Switch)**, digite a CCP e confirme.
2. Aproxime o cartão na placa: a tela mostra **BLOQUEADO**.
   (Sem cartão, a placa também descobre sozinha na próxima conferência, em até 5 minutos, ou na hora se você apertar EN/RST.)
3. Para usar essa placa de novo depois de um Kill Switch, digite `reset` no Monitor Serial. Isso cria uma chave nova (a antiga fica banida para sempre) e a placa volta a mostrar um código para parear.

**✅ Confira:** se os três testes funcionaram, a placa está ligada ao sistema. 🎉

---

## 10. Quando algo dá errado

| O que aparece | Causa provável | O que fazer |
|---|---|---|
| Tela **"ERRO: PN532"** e `PN532 NAO ENCONTRADO` | Fio SDA/SCL trocado, chavinhas fora do modo I2C ou PN532 sem energia | Confira a tabela da seção 3, chave 1 ON e chave 2 OFF, depois aperte EN/RST |
| Tela preta | Fios da tela, ou BL sem energia | Confira SCL=18, SDA=23, RST=27, DC=25, CS=26 e BL em 3V3 |
| **"SEM WI-FI"** | Nome ou senha errados, rede 5 GHz | Repita `wifi Nome Senha` (ou `rede` + `senha` se o nome tiver espaço). Use uma rede 2,4 GHz |
| **"SEM SERVIDOR"** + `connection refused` | Opção B: servidor desligado ou IP errado | Rode `npm run dev` em `server`. Confira o IP com `ipconfig` e repita o comando `api` |
| **"SEM SERVIDOR"** + `read Timeout` na API online | A API estava "dormindo" (Render grátis) | Espere 1 minuto: a placa tenta de novo sozinha a cada 10 s. Confira `/health` no celular |
| O site não mostra **"● ligado"**, mas a placa diz `AGUARDANDO_PAREAMENTO` | Placa e site em servidores diferentes (um online, outro no PC) | Use o mesmo servidor nos dois (parte 6) |
| **"SEM SERVIDOR"** + `read Timeout` ou `connection lost` | Firewall bloqueando, rede "Pública" ou PC em outra rede | Refaça a seção 6.2 e teste o `/health` no celular |
| **"SEM SERVIDOR"** + `404 Dispositivo não encontrado` | Número de série digitado errado ou de outro banco | Copie de novo em Minhas compras e repita `serial ...` |
| **"SEM SERVIDOR"** + `409 ... pareado com outra chave` | Esse número de série já foi pareado com o dispositivo virtual (navegador) | Compre outro dispositivo em Produtos e use o número novo |
| **"SEM SERVIDOR"** + `409 ... chave foi revogada` | Essa placa sofreu Kill Switch | Digite `reset` |
| **"SEM SERVIDOR"** + `429` | Muitas tentativas seguidas | Espere 1 minuto (ou aumente `RATE_LIMIT_MULT` no `.env` do servidor durante os testes) |
| O site não mostra **"● ligado"** | O site está aberto numa conta diferente da dona do número de série, ou a placa não conseguiu se apresentar | Confira a conta. No Monitor, digite `status` e veja o Estado |
| **Os códigos do site e da tela são diferentes** | Outra placa se apresentou com esse número de série | **Não pareie.** Digite `reset` na sua placa e confira de novo |
| Upload trava em `Connecting...` | A placa não entrou no modo de gravação | Segure BOOT durante o upload |
| Nenhuma porta COM aparece | Cabo só de carga ou falta de driver | Troque o cabo, instale o driver CP210x ou CH340 |
| `Ed25519.h: No such file or directory` | Biblioteca Crypto errada ou não instalada | Instale **Crypto by Rhys Weatherley** (seção 4.2) |
| VS Code sublinha os `#include` de vermelho | O VS Code não conhece as bibliotecas do Arduino | Pode ignorar: quem compila é a IDE Arduino |

---

## 11. Referência rápida

### Comandos do Monitor Serial (115200, New Line)

| Comando | O que faz |
|---|---|
| `wifi <rede> <senha>` | Salva o Wi-Fi e conecta |
| `rede <nome>` e depois `senha <senha>` | O mesmo, para nome de rede com espaço |
| `api <url>` | Salva o endereço do servidor (online: `https://krypta-api.onrender.com/api` · PC: `http://192.168.0.15:3333/api`) |
| `serial <KRY-...>` | Salva o número de série do dispositivo comprado |
| `status` | Mostra configuração, chave pública, código e estado |
| `cartao` | Esquece o cartão do dono (o próximo cartão aproximado vira o novo) |
| `reset` | Cria uma identidade nova (use depois de um Kill Switch) |
| `ajuda` | Lista os comandos |

### Telas da placa

| Tela | Significado |
|---|---|
| KRYPTA / Configure pelo USB | Faltam Wi-Fi, API ou número de série |
| SEM WI-FI | Não conectou na rede |
| SEM SERVIDOR | Conectou na rede, mas o servidor não respondeu ou recusou |
| PAREAR NO SITE + código | Esperando o dono parear no Meu Krypta |
| KRYPTA / Aproxime o cartão | Pareado e pronto |
| CARTÃO SALVO / LIBERADO / RECUSADO | Resultado do cartão |
| BLOQUEADO | Kill Switch acionado |

### Rotas que a placa usa

| Rota | Quando |
|---|---|
| `POST /api/hardware/announce` | Ao ligar, a cada 10 s enquanto espera o pareamento, e a cada 5 min depois |
| `POST /api/auth/challenge` | Ao aproximar o cartão certo (pede um desafio) |
| `POST /api/auth/verify` | Logo depois (manda o desafio assinado e recebe o token do cofre) |

### Testar sem a placa

Na pasta `server`, com o servidor ligado:
```
npm run sim -- esp32
```
Para testar contra a API online (PowerShell): `$env:SIM_API="https://krypta-api.onrender.com/api"; npm run sim -- esp32`.
Ele faz exatamente o que a placa faz (com chaves de verdade) e mostra cada passo. Se esse teste passa e a placa não, o problema está na placa, nos fios ou na rede, não no sistema.
