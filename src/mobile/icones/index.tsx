// src/mobile/icones/index.tsx
// ============================================================
// ÍCONES DAS CHAVES DO COFRE
//
// 1. LOGOS DE MARCAS (Netflix, GitHub, Epic Games...): vêm do pacote livre
//    "simple-icons" (licença CC0), num arquivo gerado no "npm install"
//    (scripts/gerar-icones.mjs → marcas.gerado.json). Carregado do próprio
//    site: nenhum pedido sai para fora com o nome dos seus serviços.
// 2. ÍCONES PADRÃO DO KRYPTA: quando a marca não existe na biblioteca, o
//    Krypta escolhe pelo sentido do nome (banco, jogo, e-mail, Wi-Fi...).
//
// Escolha salva na credencial (campo "icone"):
//   undefined        → automático (procura pela marca e depois pelo sentido)
//   "marca:netflix"  → logo da marca
//   "padrao:banco"   → ícone padrão do Krypta
// ============================================================
import { useEffect, useState } from 'react';
import {
  Bitcoin,
  Briefcase,
  Building2,
  Car,
  Cloud,
  Code,
  CreditCard,
  FileText,
  Gamepad2,
  GraduationCap,
  HeartPulse,
  Home,
  KeyRound,
  Landmark,
  Mail,
  MapPin,
  Music,
  Plane,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  StickyNote,
  Tv,
  Users,
  Utensils,
  Wifi,
} from 'lucide-react';

export interface Marca {
  s: string; // slug
  t: string; // nome
  h: string; // cor (hex sem #)
  p: string; // desenho SVG (path 24x24)
}

// ------------------------------------------------------------
// Biblioteca de marcas (carregada uma vez, sob demanda)
// ------------------------------------------------------------
const arquivos = import.meta.glob('./marcas.gerado.json', { import: 'default' });
let cache: Marca[] | null = null;
let carregando: Promise<Marca[]> | null = null;

export function carregarMarcas(): Promise<Marca[]> {
  if (cache) return Promise.resolve(cache);
  if (!carregando) {
    const carregar = arquivos['./marcas.gerado.json'];
    carregando = (carregar ? (carregar() as Promise<Marca[]>) : Promise.resolve([] as Marca[]))
      .then((m) => (cache = Array.isArray(m) ? m : []))
      .catch(() => (cache = []));
  }
  return carregando;
}

/** Hook: lista de marcas (vazia enquanto carrega ou se a biblioteca não foi gerada) */
export function useMarcas(): Marca[] {
  const [marcas, setMarcas] = useState<Marca[]>(cache ?? []);
  useEffect(() => {
    if (!cache) carregarMarcas().then(setMarcas);
  }, []);
  return marcas;
}

// ------------------------------------------------------------
// Ícones padrão do Krypta (com as palavras que levam a cada um)
// ------------------------------------------------------------
export const PADRAO = {
  banco: { rotulo: 'Banco', icone: Landmark, palavras: ['banco', 'bank', 'conta corrente', 'pix', 'poupanca', 'caixa', 'itau', 'bradesco', 'santander', 'sicredi', 'sicoob'] },
  cartao: { rotulo: 'Cartão', icone: CreditCard, palavras: ['cartao', 'card', 'credito', 'debito', 'visa', 'master', 'elo', 'hipercard'] },
  email: { rotulo: 'E-mail', icone: Mail, palavras: ['email', 'e-mail', 'mail', 'hotmail', 'bol', 'uol', 'terra'] },
  social: { rotulo: 'Rede social', icone: Users, palavras: ['rede social', 'social', 'perfil', 'insta', 'face', 'forum', 'comunidade'] },
  jogo: { rotulo: 'Jogo', icone: Gamepad2, palavras: ['jogo', 'game', 'games', 'gamer', 'play', 'console', 'conta da epic', 'lol', 'free fire', 'freefire', 'clash'] },
  video: { rotulo: 'Filmes e séries', icone: Tv, palavras: ['filme', 'serie', 'stream', 'tv', 'video', 'globo', 'canal', 'anime'] },
  musica: { rotulo: 'Música', icone: Music, palavras: ['musica', 'som', 'radio', 'podcast'] },
  compras: { rotulo: 'Compras', icone: ShoppingCart, palavras: ['loja', 'compra', 'shop', 'mercado', 'marketplace', 'ecommerce', 'casas bahia', 'kabum', 'netshoes'] },
  trabalho: { rotulo: 'Trabalho', icone: Briefcase, palavras: ['trabalho', 'empresa', 'corporativo', 'job', 'work', 'rh', 'ponto', 'intranet', 'vpn da empresa'] },
  estudo: { rotulo: 'Estudos', icone: GraduationCap, palavras: ['escola', 'faculdade', 'curso', 'estudo', 'universidade', 'aula', 'ead', 'senai', 'senac', 'etec', 'fatec', 'usp', 'unicamp', 'enem', 'portal do aluno'] },
  nuvem: { rotulo: 'Nuvem', icone: Cloud, palavras: ['nuvem', 'cloud', 'drive', 'backup', 'armazenamento', 'servidor de arquivos'] },
  wifi: { rotulo: 'Wi-Fi', icone: Wifi, palavras: ['wifi', 'wi-fi', 'roteador', 'internet', 'modem'] },
  casa: { rotulo: 'Casa', icone: Home, palavras: ['casa', 'residencia', 'apartamento', 'condominio', 'alarme', 'portao'] },
  endereco: { rotulo: 'Endereço', icone: MapPin, palavras: ['endereco', 'cep', 'rua', 'avenida', 'localizacao'] },
  documento: { rotulo: 'Documento', icone: FileText, palavras: ['documento', 'rg', 'cpf', 'cnh', 'passaporte', 'certidao', 'titulo de eleitor', 'carteira de trabalho'] },
  saude: { rotulo: 'Saúde', icone: HeartPulse, palavras: ['saude', 'hospital', 'clinica', 'medico', 'unimed', 'hapvida', 'farmacia', 'drogasil', 'convenio'] },
  carro: { rotulo: 'Veículo', icone: Car, palavras: ['carro', 'veiculo', 'detran', 'moto', 'estacionamento', 'combustivel', 'sem parar', 'veloe'] },
  viagem: { rotulo: 'Viagem', icone: Plane, palavras: ['viagem', 'voo', 'hotel', 'passagem', 'milhas', 'smiles', 'livelo', 'turismo'] },
  comida: { rotulo: 'Comida', icone: Utensils, palavras: ['comida', 'restaurante', 'delivery', 'lanche', 'pizza', 'mercado'] },
  codigo: { rotulo: 'Programação', icone: Code, palavras: ['git', 'codigo', 'dev', 'api', 'servidor', 'server', 'ssh', 'sql', 'banco de dados', 'token', 'hospedagem', 'deploy'] },
  celular: { rotulo: 'Celular', icone: Smartphone, palavras: ['celular', 'telefone', 'chip', 'operadora', 'sim', 'pin do chip', 'puk'] },
  governo: { rotulo: 'Governo', icone: Building2, palavras: ['gov', 'governo', 'receita', 'inss', 'sus', 'prefeitura', 'fgts', 'meu inss', 'serasa', 'detran'] },
  cripto: { rotulo: 'Cripto', icone: Bitcoin, palavras: ['cripto', 'crypto', 'carteira', 'wallet', 'btc', 'eth', 'seed', 'frase de recuperacao'] },
  seguranca: { rotulo: 'Segurança', icone: ShieldCheck, palavras: ['seguranca', 'antivirus', 'autenticador', '2fa', 'codigo de backup', 'vpn'] },
  nota: { rotulo: 'Nota', icone: StickyNote, palavras: ['nota', 'anotacao', 'lembrete', 'segredo'] },
  chave: { rotulo: 'Chave', icone: KeyRound, palavras: [] as string[] },
} as const;
export type IconePadrao = keyof typeof PADRAO;

// ------------------------------------------------------------
// Reconhecer o serviço pelo nome
// ------------------------------------------------------------
export const normalizar = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const compacto = (t: string) => normalizar(t).replace(/ /g, '');

// Nomes populares que não batem direto com o nome da marca
const APELIDOS: Record<string, string> = {
  bb: 'bancodobrasil', 'banco do brasil': 'bancodobrasil', nu: 'nubank', 'nu bank': 'nubank', 'mercado livre': 'mercadolivre', ml: 'mercadolivre',
  'mercado pago': 'mercadopago', 'prime video': 'primevideo', 'amazon prime': 'amazonprime', 'disney': 'disneyplus', 'disney plus': 'disneyplus',
  hbo: 'max', 'hbo max': 'max', 'globo play': 'globoplay', 'epic': 'epicgames', 'epic games': 'epicgames', 'fortnite': 'epicgames',
  ps: 'playstation', psn: 'playstation', 'play station': 'playstation', lol: 'leagueoflegends', 'league of legends': 'leagueoflegends',
  riot: 'riotgames', 'battle net': 'battledotnet', battlenet: 'battledotnet', 'ea app': 'ea', 'twitter': 'x', zap: 'whatsapp', 'whats': 'whatsapp',
  insta: 'instagram', face: 'facebook', fb: 'facebook', yt: 'youtube', 'chat gpt': 'openai', chatgpt: 'openai', gpt: 'openai',
  aws: 'amazonwebservices', 'vs code': 'visualstudiocode', vscode: 'visualstudiocode', outlook: 'microsoftoutlook', hotmail: 'microsoftoutlook',
  teams: 'microsoftteams', office: 'microsoftoffice', onedrive: 'microsoftonedrive', 'one drive': 'microsoftonedrive', 'proton mail': 'protonmail',
  'uber eats': 'ubereats', booking: 'bookingdotcom', 'apple id': 'apple', 'conta apple': 'apple', 'play store': 'googleplay', 'google play': 'googleplay',
  drive: 'googledrive', 'google drive': 'googledrive', agenda: 'googlecalendar', 'banco inter': 'inter', c6: 'c6bank', 'c6 bank': 'c6bank', caixa: 'caixa',
}; 

export type IconeResolvido = { tipo: 'marca'; marca: Marca } | { tipo: 'padrao'; chave: IconePadrao };

/** Escolhe o ícone: o que a pessoa escolheu → a marca pelo nome → o sentido do nome → chave */
export function resolverIcone(nome: string, escolha: string | undefined, marcas: Marca[], tipoCredencial?: string): IconeResolvido {
  if (escolha?.startsWith('padrao:')) {
    const k = escolha.slice(7) as IconePadrao;
    if (k in PADRAO) return { tipo: 'padrao', chave: k };
  }
  if (escolha?.startsWith('marca:')) {
    const m = marcas.find((x) => x.s === escolha.slice(6));
    if (m) return { tipo: 'marca', marca: m };
  }

  const n = normalizar(nome);
  const c = n.replace(/ /g, '');
  if (marcas.length && n) {
    const apelido = APELIDOS[n];
    const porApelido = apelido ? marcas.find((m) => m.s === apelido) : undefined;
    if (porApelido) return { tipo: 'marca', marca: porApelido };
    const exata = marcas.find((m) => m.s === c || compacto(m.t) === c);
    if (exata) return { tipo: 'marca', marca: exata };
    // "Senha da Netflix da família" → Netflix (a marca de nome mais longo que aparece no texto)
    const contida = marcas
      .filter((m) => compacto(m.t).length >= 4 && (` ${n} `.includes(` ${normalizar(m.t)} `) || c.includes(compacto(m.t))))
      .sort((a, b) => b.t.length - a.t.length)[0];
    if (contida) return { tipo: 'marca', marca: contida };
  }

  // Tipo da credencial ajuda (cartão, endereço, Wi-Fi, documento, nota)
  const porTipo: Record<string, IconePadrao> = { cartao: 'cartao', endereco: 'endereco', wifi: 'wifi', documento: 'documento', nota: 'nota' };
  if (tipoCredencial && porTipo[tipoCredencial]) return { tipo: 'padrao', chave: porTipo[tipoCredencial] };

  for (const [chave, info] of Object.entries(PADRAO) as Array<[IconePadrao, (typeof PADRAO)[IconePadrao]]>) {
    if (info.palavras.some((p) => ` ${n} `.includes(` ${normalizar(p)} `) || (p.length >= 5 && n.includes(normalizar(p))))) {
      return { tipo: 'padrao', chave };
    }
  }
  return { tipo: 'padrao', chave: 'chave' };
}

/** Cor clara demais (ex.: amarelo) pede desenho escuro */
function corClara(hex: string) {
  const n = parseInt(hex.slice(0, 6), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 186;
}

// ------------------------------------------------------------
// Componente
// ------------------------------------------------------------
export function IconeServico({
  nome,
  icone,
  tipo,
  tamanho = 36,
  resolvido,
}: {
  nome: string;
  icone?: string;
  tipo?: string;
  tamanho?: number;
  resolvido?: IconeResolvido;
}) {
  const marcas = useMarcas();
  const r = resolvido ?? resolverIcone(nome, icone, marcas, tipo);
  const raio = Math.round(tamanho * 0.28);

  if (r.tipo === 'marca') {
    const fundo = `#${r.marca.h}`;
    return (
      <span
        className="flex items-center justify-center shrink-0"
        style={{ width: tamanho, height: tamanho, borderRadius: raio, background: fundo, boxShadow: '0 2px 8px rgba(0,0,0,0.18)' }}
        title={r.marca.t}
      >
        <svg viewBox="0 0 24 24" width={tamanho * 0.58} height={tamanho * 0.58} aria-hidden="true">
          <path d={r.marca.p} fill={corClara(r.marca.h) ? '#111111' : '#FFFFFF'} />
        </svg>
      </span>
    );
  }
  const Icone = PADRAO[r.chave].icone;
  return (
    <span
      className="flex items-center justify-center shrink-0 text-white"
      style={{ width: tamanho, height: tamanho, borderRadius: raio, background: 'linear-gradient(135deg, #5100BD 0%, #8d51ff 100%)' }}
      title={PADRAO[r.chave].rotulo}
    >
      <Icone style={{ width: tamanho * 0.52, height: tamanho * 0.52 }} />
    </span>
  );
}
