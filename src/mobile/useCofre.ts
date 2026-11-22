// src/mobile/useCofre.ts
// Estado do cofre para as telas (modo Mobile e site): conta no servidor +
// dispositivo de software deste aparelho + (v1.2.0) a SESSÃO REMOTA aberta com
// a senha de acesso. Usa as MESMAS funções do site (services/vaultFlows.ts).
//
//  • aqui      → este aparelho é o dispositivo pareado
//  • remoto    → o cofre foi aberto aqui com a senha de acesso (Pro)
//  • pronto    → dá para ver E editar o cofre neste aparelho (aqui ou remoto)
//  • credenciais → a lista atual, venha de onde vier
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { VaultAPI, handleApiError, type ContaCofre } from '../services/api';
import { VirtualDevice, type EstadoDispositivo } from '../services/virtualDevice';
import * as Flows from '../services/vaultFlows';
import { SessaoCofre, type SessaoPublica } from '../services/cofreRemoto';
import type { Credencial } from '../crypto/kryptaCrypto';

export function useCofre() {
  const { user, refreshUser } = useAuth();
  const contaId = user?.id ?? '';
  const [conta, setConta] = useState<ContaCofre | null>(null);
  const [dispositivo, setDispositivo] = useState<EstadoDispositivo | null>(null);
  const [remoto, setRemoto] = useState<SessaoPublica | null>(() => (contaId ? SessaoCofre.atual(contaId) : null));
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Sessão remota: acompanha abrir / fechar / salvar / expirar
  useEffect(() => {
    if (!contaId) return;
    setRemoto(SessaoCofre.atual(contaId));
    return SessaoCofre.assinar(() => setRemoto(SessaoCofre.atual(contaId)));
  }, [contaId]);

  const recarregar = useCallback(async () => {
    if (!contaId) return;
    setErro(null);
    try {
      const c = await VaultAPI.account();
      setConta(c);
      let d = VirtualDevice.carregar(contaId);
      // v1.2.0: o dispositivo pareado puxa o que outro aparelho editou
      if (d && c.status === 'ATIVA' && d.publicKey === c.public_key && d.chaveCofre) {
        try {
          d = (await Flows.sincronizarDispositivo(contaId)).dispositivo;
        } catch {
          /* sem rede: segue com o que está no aparelho */
        }
      }
      setDispositivo(d);
    } catch (err) {
      setErro(handleApiError(err).message);
    } finally {
      setCarregando(false);
    }
  }, [contaId]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  /** O dispositivo deste aparelho é o que está pareado na conta? */
  const aqui = !!dispositivo && !!conta && dispositivo.publicKey === conta.public_key;
  const ativo = conta?.status === 'ATIVA';
  const local = aqui && ativo;
  const pronto = local || (!!remoto && ativo);
  const credenciais: Credencial[] = local ? dispositivo!.credenciais : remoto?.credenciais ?? [];

  /** Grava a alteração: no dispositivo pareado, ou pela sessão remota (senha de acesso) */
  const salvar = useCallback(
    async (mudanca: Flows.MudancaCofre) => {
      if (local) {
        try {
          const novo = await Flows.salvarCofre(contaId, mudanca);
          setDispositivo(novo);
          refreshUser().catch(() => undefined);
          return novo.credenciais;
        } catch (e) {
          if (e instanceof Flows.CofreMudouError) setDispositivo(VirtualDevice.carregar(contaId));
          throw e;
        }
      }
      if (SessaoCofre.atual(contaId)) return (await SessaoCofre.salvar(mudanca)).credenciais;
      throw new Error('O cofre não está aberto neste aparelho.');
    },
    [contaId, local, refreshUser]
  );

  return { contaId, conta, dispositivo, carregando, erro, aqui, ativo, pronto, local, remoto, credenciais, recarregar, salvar, setDispositivo };
}

/** Senha forte para o botão "Gerar" */
export function gerarSenhaForte(tam = 18): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*?-_';
  const r = new Uint32Array(tam);
  crypto.getRandomValues(r);
  return Array.from(r, (n) => chars[n % chars.length]).join('');
}
