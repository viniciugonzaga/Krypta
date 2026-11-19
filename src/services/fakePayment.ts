// src/services/fakePayment.ts
// ============================================================
// GATEWAY DE PAGAMENTO SIMULADO — "Krypta Pay"
// Nada aqui cobra dinheiro de verdade. Ele imita o comportamento de um
// gateway real (validação de cartão, token da transação, etapas de
// autorização, recusa) para deixar a experiência de compra realista.
// ============================================================

export type PaymentMethod = 'card' | 'pix' | 'apple' | 'google';
export type OrderKind = 'plan' | 'product';
export type CardBrand = 'visa' | 'master' | 'amex' | 'elo' | 'discover';

export interface OrderItem {
  id: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

export interface ShippingInfo {
  cep: string;
  address: string;
  number: string;
}

export interface SimulatedOrder {
  id: string; // ex.: KRY-2611-7F3A9C
  token: string; // token da transação, ex.: tok_kp_9f2c...
  kind: OrderKind;
  items: OrderItem[];
  total: number;
  method: PaymentMethod;
  installments: number;
  cardBrand?: CardBrand | null;
  cardLast4?: string;
  isAnnual?: boolean;
  shipping?: ShippingInfo;
  /** Números de série dos dispositivos comprados (pedido de produto) */
  serials?: string[];
  createdAt: string; // ISO
}

// ------------------------------------------------------------
// CARTÕES DE TESTE (iguais ao padrão usado por gateways reais)
// ------------------------------------------------------------
export const TEST_CARDS = {
  approved: '4242 4242 4242 4242',
  declined: '4000 0000 0000 0002',
};

// ------------------------------------------------------------
// FORMATAÇÃO
// ------------------------------------------------------------
export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** "R$25" → 25 | "R$599,00" → 599 | "R$1.234,56" → 1234.56 */
export function parsePrice(value: string | number | null | undefined): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  const clean = String(value).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const n = Number(clean);
  return Number.isFinite(n) ? n : 0;
}

export const onlyDigits = (v: string) => v.replace(/\D/g, '');

export function formatCardNumber(v: string): string {
  const d = onlyDigits(v).slice(0, 16);
  return d.replace(/(.{4})/g, '$1 ').trim();
}

export function formatExpiry(v: string): string {
  const d = onlyDigits(v).slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

export function formatCvv(v: string, brand: CardBrand | null): string {
  return onlyDigits(v).slice(0, brand === 'amex' ? 4 : 3);
}

export function formatCep(v: string): string {
  const d = onlyDigits(v).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

// ------------------------------------------------------------
// CARTÃO
// ------------------------------------------------------------
export function detectBrand(number: string): CardBrand | null {
  const d = onlyDigits(number);
  if (!d) return null;
  if (/^(4011|4312|4389|4514|4576|5041|5066|5067|509|6277|6362|6363|650|6516|6550)/.test(d)) return 'elo';
  if (/^4/.test(d)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(d)) return 'master';
  if (/^3[47]/.test(d)) return 'amex';
  if (/^(6011|65|64[4-9])/.test(d)) return 'discover';
  return null;
}

export const BRAND_LABEL: Record<CardBrand, string> = {
  visa: 'VISA',
  master: 'Mastercard',
  amex: 'AMEX',
  elo: 'ELO',
  discover: 'Discover',
};

/** Algoritmo de Luhn — o mesmo que os bancos usam para validar o número */
export function luhnCheck(number: string): boolean {
  const d = onlyDigits(number);
  if (d.length < 13) return false;
  let sum = 0;
  let double = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = Number(d[i]);
    if (double) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    double = !double;
  }
  return sum % 10 === 0;
}

export function validateCard(input: {
  number: string;
  holder: string;
  expiry: string;
  cvv: string;
}): string | null {
  const brand = detectBrand(input.number);
  if (!luhnCheck(input.number)) return 'Número do cartão inválido. Use o cartão de teste se quiser.';
  if (input.holder.trim().length < 3) return 'Informe o nome impresso no cartão.';

  const [mm, yy] = input.expiry.split('/');
  const month = Number(mm);
  const year = 2000 + Number(yy);
  if (!mm || !yy || yy.length !== 2 || month < 1 || month > 12) return 'Data de validade inválida (MM/AA).';
  const now = new Date();
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);
  if (endOfMonth < now) return 'Este cartão está vencido.';

  const cvvLen = brand === 'amex' ? 4 : 3;
  if (onlyDigits(input.cvv).length !== cvvLen) return `O código de segurança deve ter ${cvvLen} dígitos.`;
  return null;
}

// ------------------------------------------------------------
// IDs / TOKENS
// ------------------------------------------------------------
function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(arr);
  else for (let i = 0; i < bytes; i++) arr[i] = Math.floor(Math.random() * 256);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function generateOrderId(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `KRY-${yy}${mm}-${randomHex(3).toUpperCase()}`;
}

/** Token da transação (equivalente ao "charge id" de um gateway real) */
export function generatePaymentToken(): string {
  return `tok_kp_${randomHex(12)}`;
}

export function maskToken(token: string): string {
  if (token.length <= 14) return token;
  return `${token.slice(0, 10)}••••${token.slice(-4)}`;
}

/** Código PIX "copia e cola" fictício, no formato parecido com o real */
export function generatePixCode(orderId: string, total: number): string {
  const amount = total.toFixed(2);
  const body =
    `00020101021226850014br.gov.bcb.pix2563pix.krypta.dev/qr/v2/${orderId.toLowerCase()}` +
    `52040000530398654${String(amount.length).padStart(2, '0')}${amount}` +
    `5802BR5913KRYPTA SEGURA6009SAO PAULO62070503***6304`;
  return body + randomHex(2).toUpperCase();
}

// ------------------------------------------------------------
// PROCESSAMENTO
// ------------------------------------------------------------
export const PROCESSING_STEPS: Record<PaymentMethod, string[]> = {
  card: [
    'Criptografando dados do cartão (AES-256)',
    'Conectando ao gateway Krypta Pay',
    'Autorizando com o banco emissor',
    'Gerando token da transação',
  ],
  pix: [
    'Lendo confirmação do PIX',
    'Conferindo com o banco recebedor',
    'Gerando token da transação',
  ],
  apple: [
    'Abrindo Apple Pay',
    'Confirmando com Face ID / Touch ID',
    'Gerando token da transação',
  ],
  google: [
    'Abrindo Google Pay',
    'Confirmando identidade na carteira',
    'Gerando token da transação',
  ],
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class PaymentDeclinedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaymentDeclinedError';
  }
}

/**
 * Simula a autorização. Chama onStep(i) a cada etapa concluída.
 * O cartão de teste de recusa (4000 0000 0000 0002) sempre é recusado.
 * Retorna o token da transação.
 */
export async function simulatePayment(
  input: { method: PaymentMethod; cardNumber?: string },
  onStep: (index: number) => void
): Promise<{ token: string }> {
  const steps = PROCESSING_STEPS[input.method];

  for (let i = 0; i < steps.length; i++) {
    onStep(i);
    await wait(750 + Math.random() * 550);

    // Recusa na etapa de autorização do banco
    if (
      input.method === 'card' &&
      i === 2 &&
      onlyDigits(input.cardNumber ?? '') === onlyDigits(TEST_CARDS.declined)
    ) {
      throw new PaymentDeclinedError(
        'O banco emissor recusou a transação (saldo insuficiente na simulação). Tente outro cartão.'
      );
    }
  }

  onStep(steps.length);
  await wait(350);
  return { token: generatePaymentToken() };
}

// ------------------------------------------------------------
// HISTÓRICO LOCAL DE PEDIDOS (só neste navegador)
// ------------------------------------------------------------
const ORDERS_KEY = 'krypta_orders';

export function saveOrder(order: SimulatedOrder): void {
  try {
    const list = getOrders();
    list.unshift(order);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(list.slice(0, 30)));
  } catch {
    /* armazenamento indisponível: ignora */
  }
}

export function getOrders(): SimulatedOrder[] {
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    return raw ? (JSON.parse(raw) as SimulatedOrder[]) : [];
  } catch {
    return [];
  }
}