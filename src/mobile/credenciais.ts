// src/mobile/credenciais.ts
// Tipos de chave do cofre e os campos que cada um começa tendo.
// A pessoa pode adicionar ou remover campos à vontade (tudo vai cifrado).
import type { CampoCredencial, Credencial } from '../crypto/kryptaCrypto';

export type TipoCredencial = 'login' | 'cartao' | 'endereco' | 'wifi' | 'documento' | 'nota' | 'personalizado';

type Modelo = { rotulo: string; secreto?: boolean };

export const TIPOS: Record<TipoCredencial, { rotulo: string; desc: string; campos: Modelo[] }> = {
  login: { rotulo: 'Login', desc: 'Usuário e senha de um site ou app', campos: [] },
  cartao: {
    rotulo: 'Cartão',
    desc: 'Crédito, débito ou benefício',
    campos: [
      { rotulo: 'Nome no cartão' },
      { rotulo: 'Número do cartão', secreto: true },
      { rotulo: 'Validade (MM/AA)' },
      { rotulo: 'Código de segurança (CVV)', secreto: true },
      { rotulo: 'Senha / PIN', secreto: true },
    ],
  },
  endereco: {
    rotulo: 'Endereço',
    desc: 'Casa, trabalho, entrega',
    campos: [{ rotulo: 'CEP' }, { rotulo: 'Rua' }, { rotulo: 'Número' }, { rotulo: 'Complemento' }, { rotulo: 'Bairro' }, { rotulo: 'Cidade' }, { rotulo: 'Estado' }],
  },
  wifi: { rotulo: 'Wi-Fi', desc: 'Rede e senha', campos: [{ rotulo: 'Nome da rede' }, { rotulo: 'Senha da rede', secreto: true }, { rotulo: 'Tipo de segurança' }] },
  documento: {
    rotulo: 'Documento',
    desc: 'RG, CPF, CNH, passaporte',
    campos: [{ rotulo: 'Tipo de documento' }, { rotulo: 'Número', secreto: true }, { rotulo: 'Data de emissão' }, { rotulo: 'Validade' }],
  },
  nota: { rotulo: 'Nota segura', desc: 'Texto livre protegido', campos: [{ rotulo: 'Texto', secreto: true }] },
  personalizado: { rotulo: 'Personalizado', desc: 'Monte com os campos que quiser', campos: [{ rotulo: 'Campo 1' }] },
};

/** Tipos do plano Free (até 3 campos cada). Os outros e os campos extras são do Pro. */
export const TIPOS_FREE: TipoCredencial[] = ['login', 'wifi', 'nota'];

export const novoCampo = (rotulo = '', secreto = false): CampoCredencial => ({ id: crypto.randomUUID(), rotulo, valor: '', secreto });

export const camposDoTipo = (tipo: TipoCredencial): CampoCredencial[] => TIPOS[tipo].campos.map((m) => novoCampo(m.rotulo, !!m.secreto));

export const tipoDe = (c: Credencial): TipoCredencial => (c.tipo && c.tipo in TIPOS ? (c.tipo as TipoCredencial) : 'login');

/** Todos os campos de uma credencial, na ordem de exibição (login primeiro) */
export function camposParaMostrar(c: Credencial): CampoCredencial[] {
  const lista: CampoCredencial[] = [];
  if (c.usuario) lista.push({ id: 'usuario', rotulo: 'E-mail / usuário', valor: c.usuario });
  if (c.senha) lista.push({ id: 'senha', rotulo: 'Senha', valor: c.senha, secreto: true });
  for (const f of c.campos ?? []) if (f.valor) lista.push(f);
  if (c.nota) lista.push({ id: 'nota', rotulo: 'Informação adicional', valor: c.nota });
  return lista;
}

/** Texto curto embaixo do nome na lista */
export function resumo(c: Credencial): string {
  const t = tipoDe(c);
  if (t === 'login') return c.usuario || 'Login';
  const extras = (c.campos ?? []).filter((f) => f.valor).length;
  return `${TIPOS[t].rotulo}${extras ? ` · ${extras} campo${extras > 1 ? 's' : ''}` : ''}`;
}
