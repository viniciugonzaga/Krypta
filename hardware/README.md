# Krypta — Hardware (ESP32)

> Parte do projeto [Krypta](../README.md). Arquitetura geral: [docs/ARQUITETURA.md](../docs/ARQUITETURA.md).

> **Vai ligar a placa?** Siga o passo a passo completo em [GUIA-CONEXAO.md](GUIA-CONEXAO.md).

## Fase 1 (este firmware)
- Identidade Ed25519 gerada no próprio ESP32 (a chave privada nunca sai do chip).
- Apresentação ao servidor (`POST /api/hardware/announce`) com o número de série.
- Pareamento feito pelo dono no site, conferindo o **código de 6 dígitos** da tela.
- Cartão NFC do dono (o primeiro cartão aproximado depois do pareamento).
- Login do cofre por challenge-response (`/api/auth/challenge` → `/api/auth/verify`).
- Tela mostra "BLOQUEADO" depois de um Kill Switch.

## Ligações
| Peça | Pino do ESP32 |
|---|---|
| PN532 SDA | 21 |
| PN532 SCL | 19 |
| PN532 VCC / GND | 3V3 / GND (chaves da placa PN532 no modo **I2C**) |
| GC9A01 RST / DC / CS | 27 / 25 / 26 |
| GC9A01 SCL / SDA (SPI) | 18 / 23 (SPI padrão do ESP32) |
| GC9A01 VCC / GND | 3V3 / GND |

## Como usar
1. Abra `krypta-esp32/krypta-esp32.ino` na IDE Arduino (a pasta só pode ter esse sketch).
2. Instale as bibliotecas: Adafruit PN532, DIYables TFT Round, ArduinoJson, Crypto (Rhys Weatherley).
3. Grave na placa e abra o Monitor Serial (115200, "Nova linha"):
   ```
   wifi NomeDaRede SenhaDaRede
   api http://IP-DO-SEU-PC:3333/api      (online: api https://endereco-da-api/api)
   serial KRY-XXXX-XXXX-XXXX
   ```
   O IP do PC aparece no `ipconfig` (IPv4). Libere a porta 3333 no Firewall do Windows.
4. No site: Minhas compras → "Recebi" → Meu Krypta → escolha o número de série →
   marque "Usar o hardware real" e confira o código com a tela → gere a CCP → Parear.
5. A tela muda para "Aproxime o cartão": o primeiro cartão vira o cartão do dono.

## Próximas fases
- Fase 2: o cofre dentro do ESP32 (AES-GCM, credenciais na flash cifrada) e envio do backup com o token do dispositivo.
- Fase 3: app/PWA conversando com o ESP32 por USB ou Bluetooth (o ESP32 assina, o app mostra).
- Produção: Flash Encryption + Secure Boot do ESP32, certificado raiz do servidor (HTTPS) e cartão NFC com desafio criptográfico (NTAG 424 / DESFire) no lugar do UID.
