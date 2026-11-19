// server/src/jobs/ttlJob.ts
// Roda a varredura de inatividade 30 s depois de subir e a cada 6 horas.
// Instância única de API (como no XAMPP e na Hostinger): setInterval basta,
// e a varredura é idempotente (rodar duas vezes não manda aviso duplicado).
import { TtlService } from '../services/TtlService.js';

const INTERVALO_MS = 6 * 60 * 60 * 1000;
let rodando = false;

export async function rodarVarredura(): Promise<void> {
  if (rodando) return; // sem execuções sobrepostas
  rodando = true;
  try {
    const r = await TtlService.executarVarredura();
    if (r.avisosEnviados || r.avisosPendentes || r.excluidas) {
      console.log(
        `TTL: ${r.avisosEnviados} aviso(s) enviado(s), ${r.avisosPendentes} pendente(s), ${r.excluidas} conta(s) excluída(s).`
      );
    }
  } catch (err) {
    console.error('TTL: falha na varredura:', err);
  } finally {
    rodando = false;
  }
}

export function iniciarTtlJob(): void {
  setTimeout(rodarVarredura, 30 * 1000).unref();
  setInterval(rodarVarredura, INTERVALO_MS).unref();
}
