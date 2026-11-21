// ============================================================
// KRYPTA — FIRMWARE DO DISPOSITIVO (ESP32 + PN532 + tela redonda GC9A01)
// Fase 1: identidade do dispositivo, apresentação ao servidor, pareamento
//         conferido por código, cartão NFC do dono e login no cofre.
//
// O QUE ELE FAZ
//   1. No primeiro boot gera a CHAVE Ed25519 do dispositivo (a privada nunca
//      sai do chip) e guarda na memória NVS.
//   2. Conecta no Wi-Fi e se apresenta: POST /api/hardware/announce
//      { serial, public_key, assinatura("krypta-announce-v1:<serial>") }
//   3. A tela mostra o estado:
//        AGUARDANDO_PAREAMENTO → código de 6 dígitos (o mesmo aparece no site)
//        PAREADO               → "Aproxime o cartão"
//        REVOGADO              → "BLOQUEADO" (Kill Switch)
//   4. Pareado: o primeiro cartão aproximado vira o CARTÃO DO DONO.
//      Depois, o cartão certo faz o login do cofre:
//        POST /api/auth/challenge → assina o nonce → POST /api/auth/verify
//
// CONFIGURAÇÃO (Monitor Serial, 115200, "Nova linha"):
//   wifi <rede> <senha>       ex.: wifi MinhaCasa 12345678
//   rede <nome>  +  senha <senha>   (para nome de rede com espaço)
//   api <url>                 ex.: api http://192.168.0.15:3333/api
//   serial <numero>           ex.: serial KRY-7F3A-9C1B-04D2  (está em "Minhas compras")
//   status | cartao | reset | ajuda
//
// BIBLIOTECAS (Gerenciador de Bibliotecas da IDE Arduino):
//   • Adafruit PN532            • DIYables TFT Round
//   • ArduinoJson (v7)          • Crypto  (de Rhys Weatherley — traz Ed25519)
//   Placa: "ESP32 Dev Module" (pacote esp32 da Espressif). WiFi, HTTPClient,
//   Preferences e mbedtls já vêm com a placa.
// ============================================================
#include <Wire.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Preferences.h>
#include <ArduinoJson.h>
#include <Adafruit_PN532.h>
#include <DIYables_TFT_Round.h>
#include <Ed25519.h>
#include "mbedtls/base64.h"
#include "mbedtls/sha256.h"
#include "esp_random.h"

// --- Pinos (os mesmos do seu teste) ---
#define SDA_PIN 21
#define SCL_PIN 19
#define PIN_RST 27
#define PIN_DC 25
#define PIN_CS 26

// --- Cores ---
#define C_BLACK  DIYables_TFT::colorRGB(0, 0, 0)
#define C_WHITE  DIYables_TFT::colorRGB(255, 255, 255)
#define C_PURPLE DIYables_TFT::colorRGB(141, 81, 255)
#define C_LILAC  DIYables_TFT::colorRGB(198, 174, 248)
#define C_GREEN  DIYables_TFT::colorRGB(34, 197, 94)
#define C_RED    DIYables_TFT::colorRGB(248, 113, 113)
#define C_AMBER  DIYables_TFT::colorRGB(245, 158, 11)
#define C_GRAY   DIYables_TFT::colorRGB(120, 120, 140)

// --- Tempos ---
const uint32_t ANUNCIO_AGUARDANDO_MS = 10UL * 1000;   // esperando o pareamento no site
const uint32_t ANUNCIO_NORMAL_MS     = 5UL * 60 * 1000; // confere Kill Switch de tempos em tempos
const uint32_t TELA_RESULTADO_MS     = 3000;

Adafruit_PN532 nfc(-1, -1);  // modo I2C
DIYables_TFT_GC9A01_Round tela(PIN_RST, PIN_DC, PIN_CS);
Preferences nvs;

// --- Configuração e identidade (NVS) ---
String cfgSsid, cfgSenha, cfgApi, cfgSerial, cartaoDono;
uint8_t chavePrivada[32];
uint8_t chavePublica[32];
String chavePublicaB64;
String codigoConfirmacao;  // "123 456"

enum Estado { SEM_CONFIG, SEM_WIFI, SEM_SERVIDOR, AGUARDANDO_PAREAMENTO, PAREADO, REVOGADO };
Estado estado = SEM_CONFIG;
String ultimoErro;
uint32_t ultimoAnuncio = 0;
uint8_t quadroAnimacao = 0;
uint32_t ultimoQuadro = 0;

// ============================================================
// UTILITÁRIOS
// ============================================================
String paraBase64(const uint8_t *dados, size_t tam) {
  size_t saida = 0;
  unsigned char buf[128];
  mbedtls_base64_encode(buf, sizeof(buf), &saida, dados, tam);
  return String((char *)buf).substring(0, saida);
}

bool deBase64(const String &texto, uint8_t *dest, size_t esperado) {
  size_t saida = 0;
  int r = mbedtls_base64_decode(dest, esperado, &saida, (const unsigned char *)texto.c_str(), texto.length());
  return r == 0 && saida == esperado;
}

/** Mesmo cálculo do servidor: SHA-256(chave) → 4 primeiros bytes → % 1.000.000 */
String calcularCodigo(const uint8_t *pk) {
  uint8_t h[32];
  mbedtls_sha256(pk, 32, h, 0);
  uint32_t n = ((uint32_t)h[0] << 24) | ((uint32_t)h[1] << 16) | ((uint32_t)h[2] << 8) | h[3];
  char s[8];
  snprintf(s, sizeof(s), "%06lu", (unsigned long)(n % 1000000UL));
  String t(s);
  return t.substring(0, 3) + " " + t.substring(3);
}

// ============================================================
// TELA (240x240 redonda)
// ============================================================
void textoCentral(const String &txt, int y, uint8_t tamanho, uint16_t cor) {
  int largura = txt.length() * 6 * tamanho;
  tela.setTextSize(tamanho);
  tela.setTextColor(cor);
  tela.setCursor(max(0, (240 - largura) / 2), y);
  tela.print(txt);
}

void moldura(uint16_t cor) {
  tela.fillScreen(C_BLACK);
  tela.drawCircle(120, 120, 118, cor);
  tela.drawCircle(120, 120, 116, cor);
}

void desenharEstado() {
  switch (estado) {
    case SEM_CONFIG:
      moldura(C_AMBER);
      textoCentral("KRYPTA", 60, 3, C_PURPLE);
      textoCentral("Configure pelo USB", 115, 1, C_WHITE);
      textoCentral("Monitor Serial: ajuda", 135, 1, C_GRAY);
      break;
    case SEM_WIFI:
      moldura(C_AMBER);
      textoCentral("SEM WI-FI", 85, 2, C_AMBER);
      textoCentral(cfgSsid, 120, 1, C_WHITE);
      textoCentral("tentando de novo...", 140, 1, C_GRAY);
      break;
    case SEM_SERVIDOR:
      moldura(C_RED);
      textoCentral("SEM SERVIDOR", 80, 2, C_RED);
      textoCentral(ultimoErro.substring(0, 30), 120, 1, C_WHITE);
      textoCentral("tentando de novo...", 145, 1, C_GRAY);
      break;
    case AGUARDANDO_PAREAMENTO:
      moldura(C_PURPLE);
      textoCentral("PAREAR NO SITE", 55, 2, C_WHITE);
      textoCentral("Meu Krypta > confira:", 85, 1, C_GRAY);
      textoCentral(codigoConfirmacao, 105, 3, C_LILAC);
      textoCentral(cfgSerial, 150, 1, C_GRAY);
      break;
    case PAREADO:
      moldura(C_PURPLE);
      textoCentral("KRYPTA", 55, 3, C_PURPLE);
      textoCentral(cartaoDono.length() ? "Aproxime o cartao" : "Cadastre seu cartao", 110, 1, C_WHITE);
      textoCentral("cofre protegido", 175, 1, C_GREEN);
      break;
    case REVOGADO:
      moldura(C_RED);
      textoCentral("BLOQUEADO", 80, 3, C_RED);
      textoCentral("Kill Switch acionado", 125, 1, C_WHITE);
      textoCentral("comando: reset", 145, 1, C_GRAY);
      break;
  }
}

/** Animação de espera: 8 pontos girando (só nos estados de espera) */
void animar() {
  if (estado != PAREADO && estado != AGUARDANDO_PAREAMENTO) return;
  if (millis() - ultimoQuadro < 120) return;
  ultimoQuadro = millis();
  const int cx = 120, cy = estado == PAREADO ? 140 : 190, r = 14;
  for (uint8_t i = 0; i < 8; i++) {
    float a = i * PI / 4;
    int x = cx + r * cos(a), y = cy + r * sin(a);
    uint8_t dist = (i + 8 - quadroAnimacao) % 8;
    tela.fillCircle(x, y, 2, dist == 0 ? C_WHITE : dist < 3 ? C_LILAC : C_PURPLE);
  }
  quadroAnimacao = (quadroAnimacao + 1) % 8;
}

void telaResultado(const String &titulo, const String &linha, uint16_t cor) {
  moldura(cor);
  textoCentral(titulo, 90, 2, cor);
  textoCentral(linha, 130, 1, C_WHITE);
  delay(TELA_RESULTADO_MS);
  desenharEstado();
}

// ============================================================
// IDENTIDADE DO DISPOSITIVO (Ed25519)
// ============================================================
void carregarOuGerarChaves() {
  size_t lido = nvs.getBytes("priv", chavePrivada, 32);
  if (lido != 32) {
    esp_fill_random(chavePrivada, 32);  // gerador de números aleatórios do hardware
    nvs.putBytes("priv", chavePrivada, 32);
    Serial.println("Nova identidade gerada para este dispositivo.");
  }
  Ed25519::derivePublicKey(chavePublica, chavePrivada);
  chavePublicaB64 = paraBase64(chavePublica, 32);
  codigoConfirmacao = calcularCodigo(chavePublica);
}

String assinarBase64(const uint8_t *msg, size_t tam) {
  uint8_t assinatura[64];
  Ed25519::sign(assinatura, chavePrivada, chavePublica, msg, tam);
  return paraBase64(assinatura, 64);
}

// ============================================================
// HTTP
// ============================================================
/** POST JSON. Devolve o status HTTP (ou <0 se não conectou) e preenche `resposta` */
int postJson(const String &rota, JsonDocument &corpo, JsonDocument &resposta) {
  String url = cfgApi + rota;
  String payload;
  serializeJson(corpo, payload);

  HTTPClient http;
  WiFiClient cliente;
  WiFiClientSecure clienteSeguro;
  if (url.startsWith("https://")) {
    // TODO produção (Hostinger): troque por clienteSeguro.setCACert(CERTIFICADO_RAIZ)
    clienteSeguro.setInsecure();
    http.begin(clienteSeguro, url);
  } else {
    http.begin(cliente, url);
  }
  http.setTimeout(8000);
  http.addHeader("Content-Type", "application/json");
  int status = http.POST(payload);
  if (status > 0) {
    deserializeJson(resposta, http.getString());
  } else {
    ultimoErro = http.errorToString(status);
  }
  http.end();
  return status;
}

String mensagemErro(JsonDocument &resp, int status) {
  if (status < 0) return ultimoErro;
  const char *e = resp["error"] | "";
  return String(status) + " " + e;
}

// ============================================================
// APRESENTAÇÃO AO SERVIDOR
// ============================================================
void anunciar() {
  ultimoAnuncio = millis();
  if (cfgSerial.isEmpty() || cfgApi.isEmpty() || cfgSsid.isEmpty()) {
    estado = SEM_CONFIG;
    return;
  }
  if (WiFi.status() != WL_CONNECTED) {
    estado = SEM_WIFI;
    return;
  }

  String mensagem = "krypta-announce-v1:" + cfgSerial;
  JsonDocument corpo, resp;
  corpo["serial"] = cfgSerial;
  corpo["public_key"] = chavePublicaB64;
  corpo["assinatura"] = assinarBase64((const uint8_t *)mensagem.c_str(), mensagem.length());

  int status = postJson("/hardware/announce", corpo, resp);
  Estado anterior = estado;
  if (status == 200) {
    String e = resp["data"]["estado"] | "";
    if (e == "PAREADO") estado = PAREADO;
    else if (e == "REVOGADO") estado = REVOGADO;
    else estado = AGUARDANDO_PAREAMENTO;
    Serial.printf("Servidor: %s · codigo %s\n", e.c_str(), codigoConfirmacao.c_str());
  } else {
    ultimoErro = mensagemErro(resp, status);
    estado = SEM_SERVIDOR;
    Serial.println("Falha ao se apresentar: " + ultimoErro);
  }
  if (estado != anterior || estado == SEM_SERVIDOR) desenharEstado();
}

// ============================================================
// LOGIN DO COFRE (challenge-response)
// ============================================================
bool loginCofre() {
  JsonDocument corpo, resp;
  corpo["public_key"] = chavePublicaB64;
  int status = postJson("/auth/challenge", corpo, resp);
  if (status == 404) {  // a chave não está mais em nenhuma conta → Kill Switch ou herança
    anunciar();
    return false;
  }
  if (status != 200) {
    ultimoErro = mensagemErro(resp, status);
    return false;
  }

  // Assina os 32 BYTES do nonce (não o texto em base64)
  uint8_t nonce[32];
  if (!deBase64(resp["data"]["nonce"] | "", nonce, 32)) {
    ultimoErro = "nonce invalido";
    return false;
  }

  JsonDocument corpo2, resp2;
  corpo2["public_key"] = chavePublicaB64;
  corpo2["assinatura"] = assinarBase64(nonce, 32);
  status = postJson("/auth/verify", corpo2, resp2);
  if (status != 200) {
    ultimoErro = mensagemErro(resp2, status);
    return false;
  }
  // Token de 15 min (escopo hardware). Na próxima fase ele é usado para o backup.
  String token = resp2["data"]["token"] | "";
  Serial.printf("Login no cofre OK (token de %u caracteres)\n", token.length());
  return true;
}

// ============================================================
// NFC (cartão do dono)
// ============================================================
String lerCartao() {
  uint8_t uid[7] = {0};
  uint8_t tamanho = 0;
  if (!nfc.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, &tamanho, 50)) return "";
  String s;
  for (uint8_t i = 0; i < tamanho; i++) {
    if (uid[i] < 0x10) s += "0";
    s += String(uid[i], HEX);
  }
  s.toUpperCase();
  return s;
}

void tratarCartao(const String &uid) {
  if (estado != PAREADO) {
    telaResultado("AINDA NAO", estado == REVOGADO ? "dispositivo bloqueado" : "pareie no site antes", C_AMBER);
    return;
  }
  if (cartaoDono.isEmpty()) {
    cartaoDono = uid;
    nvs.putString("cartao", uid);
    Serial.println("Cartao do dono cadastrado.");
    telaResultado("CARTAO SALVO", "este e o seu cartao", C_GREEN);
    return;
  }
  if (uid != cartaoDono) {
    Serial.println("Cartao recusado.");
    telaResultado("RECUSADO", "cartao desconhecido", C_RED);
    return;
  }
  moldura(C_PURPLE);
  textoCentral("ENTRANDO...", 105, 2, C_WHITE);
  if (loginCofre()) telaResultado("LIBERADO", "cofre aberto", C_GREEN);
  else if (estado == REVOGADO) desenharEstado();
  else telaResultado("FALHOU", ultimoErro.substring(0, 30), C_RED);
}

// ============================================================
// CONFIGURAÇÃO PELO MONITOR SERIAL
// ============================================================
void carregarConfig() {
  cfgSsid = nvs.getString("ssid", "");
  cfgSenha = nvs.getString("senha", "");
  cfgApi = nvs.getString("api", "");
  cfgSerial = nvs.getString("serial", "");
  cartaoDono = nvs.getString("cartao", "");
}

void conectarWifi() {
  if (cfgSsid.isEmpty()) return;
  WiFi.mode(WIFI_STA);
  WiFi.begin(cfgSsid.c_str(), cfgSenha.c_str());
  Serial.print("Conectando no Wi-Fi " + cfgSsid);
  for (int i = 0; i < 30 && WiFi.status() != WL_CONNECTED; i++) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(WiFi.status() == WL_CONNECTED ? " ok, IP " + WiFi.localIP().toString() : " falhou");
}

void mostrarStatus() {
  Serial.println("------ KRYPTA ------");
  Serial.println("Serie:   " + (cfgSerial.length() ? cfgSerial : String("(falta)")));
  Serial.println("API:     " + (cfgApi.length() ? cfgApi : String("(falta)")));
  Serial.println("Wi-Fi:   " + (cfgSsid.length() ? cfgSsid : String("(falta)")) + (WiFi.status() == WL_CONNECTED ? " (conectado)" : ""));
  Serial.println("Chave:   " + chavePublicaB64);
  Serial.println("Codigo:  " + codigoConfirmacao);
  Serial.println("Cartao:  " + String(cartaoDono.length() ? "cadastrado" : "nenhum"));
  const char *nomes[] = {"SEM_CONFIG", "SEM_WIFI", "SEM_SERVIDOR", "AGUARDANDO_PAREAMENTO", "PAREADO", "REVOGADO"};
  Serial.println("Estado:  " + String(nomes[estado]));
}

void comandoSerial() {
  if (!Serial.available()) return;
  String linha = Serial.readStringUntil('\n');
  linha.trim();
  if (linha.isEmpty()) return;
  int esp = linha.indexOf(' ');
  String cmd = esp < 0 ? linha : linha.substring(0, esp);
  String arg = esp < 0 ? "" : linha.substring(esp + 1);
  cmd.toLowerCase();

  if (cmd == "wifi") {
    int e2 = arg.indexOf(' ');
    cfgSsid = e2 < 0 ? arg : arg.substring(0, e2);
    cfgSenha = e2 < 0 ? "" : arg.substring(e2 + 1);
    nvs.putString("ssid", cfgSsid);
    nvs.putString("senha", cfgSenha);
    conectarWifi();
    anunciar();
  } else if (cmd == "rede") {
    // Nome de rede com espaço: rede Casa do Joao  (depois: senha 12345678)
    cfgSsid = arg;
    nvs.putString("ssid", cfgSsid);
    Serial.println("Rede salva: " + cfgSsid + "  (agora digite: senha <senha da rede>)");
  } else if (cmd == "senha") {
    cfgSenha = arg;
    nvs.putString("senha", cfgSenha);
    conectarWifi();
    anunciar();
  } else if (cmd == "api") {
    arg.trim();
    if (arg.endsWith("/")) arg.remove(arg.length() - 1);
    cfgApi = arg;
    nvs.putString("api", cfgApi);
    Serial.println("API salva: " + cfgApi);
    anunciar();
  } else if (cmd == "serial") {
    arg.trim();
    arg.toUpperCase();
    cfgSerial = arg;
    nvs.putString("serial", cfgSerial);
    Serial.println("Numero de serie salvo: " + cfgSerial);
    anunciar();
  } else if (cmd == "cartao") {
    cartaoDono = "";
    nvs.remove("cartao");
    Serial.println("Aproxime o novo cartao do dono.");
    desenharEstado();
  } else if (cmd == "reset") {
    // Nova identidade: necessário depois de um Kill Switch (a chave antiga foi banida)
    nvs.remove("priv");
    nvs.remove("cartao");
    cartaoDono = "";
    carregarOuGerarChaves();
    Serial.println("Identidade nova. Codigo: " + codigoConfirmacao);
    anunciar();
  } else if (cmd == "status") {
    mostrarStatus();
  } else {
    Serial.println("Comandos: wifi <rede> <senha> | rede <nome> + senha <senha> | api <url> | serial <KRY-...> | status | cartao | reset");
  }
}

// ============================================================
// SETUP / LOOP
// ============================================================
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n=== KRYPTA — dispositivo (fase 1) ===");

  tela.begin();
  tela.setRotation(1);
  moldura(C_PURPLE);
  textoCentral("KRYPTA", 95, 3, C_PURPLE);
  textoCentral("iniciando...", 140, 1, C_GRAY);

  nvs.begin("krypta", false);
  carregarConfig();
  carregarOuGerarChaves();

  Wire.begin(SDA_PIN, SCL_PIN);
  delay(100);
  if (!nfc.getFirmwareVersion()) {
    Serial.println("PN532 NAO ENCONTRADO! Confira SDA/SCL e o modo I2C da placa.");
    moldura(C_RED);
    textoCentral("ERRO: PN532", 110, 2, C_RED);
    while (true) delay(1000);
  }
  nfc.SAMConfig();

  mostrarStatus();
  conectarWifi();
  anunciar();
  desenharEstado();
}

void loop() {
  comandoSerial();

  if (WiFi.status() != WL_CONNECTED && !cfgSsid.isEmpty() && estado != SEM_WIFI) {
    estado = SEM_WIFI;
    desenharEstado();
  }

  uint32_t intervalo = (estado == PAREADO || estado == REVOGADO) ? ANUNCIO_NORMAL_MS : ANUNCIO_AGUARDANDO_MS;
  if (millis() - ultimoAnuncio > intervalo) {
    if (WiFi.status() != WL_CONNECTED && !cfgSsid.isEmpty()) conectarWifi();
    anunciar();
  }

  String uid = lerCartao();
  if (uid.length()) tratarCartao(uid);

  animar();
  delay(20);
}
