// src/mobile/useCofre.ts
// Estado do cofre para as telas do modo Mobile: conta no servidor +
// dispositivo de software deste aparelho. Usa as MESMAS funções do site
// (services/vaultFlows.ts), então tudo continua sincronizado.
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { VaultAPI, handleApiError, type ContaCofre } from '../services/api';
import { VirtualDevice, type EstadoDispositivo } from '../services/virtualDevice';
import * as Flows from '../services/vaultFlows';
import type { Credencial } from '../crypto/kryptaCrypto';

export function useCofre() {
  const { user, refreshUser } = useAuth();
  const contaId = user?.id ?? '';
  const [conta, setConta] = useState<ContaCofre | null>(null);
  const [dispositivo, setDispositivo] = useState<EstadoDispositivo | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    if (!contaId) return;
    setErro(null);
    try {
      setConta(await VaultAPI.account());
      setDispositivo(VirtualDevice.carregar(contaId));
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
  const pronto = aqui && ativo;

  /** Grava as credenciais no dispositivo e envia o backup cifrado */
  const salvar = useCallback(
    async (credenciais: Credencial[]) => {
      const novo = await Flows.salvarCofre(contaId, credenciais);
      setDispositivo(novo);
      refreshUser().catch(() => undefined);
      return novo;
    },
    [contaId, refreshUser]
  );

  return { contaId, conta, dispositivo, carregando, erro, aqui, ativo, pronto, recarregar, salvar, setDispositivo };
}

/** Senha forte para o botão "Gerar" */
export function gerarSenhaForte(tam = 18): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*?-_';
  const r = new Uint32Array(tam);
  crypto.getRandomValues(r);
  return Array.from(r, (n) => chars[n % chars.length]).join('');
}
