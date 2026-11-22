# Simulador e testes (`server/scripts/`)

`simular-dispositivo.ts` faz o papel de um **ESP32 de verdade** (chaves Ed25519 reais com `tweetnacl`)
e conversa com a API exatamente como o app/hardware. Serve como **teste ponta a ponta**.

Com a API rodando (`npm run dev`), em outro terminal, dentro de `server/`:

| Comando | Testa |
|---|---|
| `npm run sim -- testar-tudo` | **Tudo**, numa conta nova criada na hora |
| `npm run sim -- testar-tudo <email> <senha>` | Tudo numa conta que você já pareou |
| `npm run sim -- parear <email> <senha>` | Pareamento |
| `npm run sim -- login` | Login do dispositivo (challenge-response) |
| `npm run sim -- backup` | Backup cifrado, anti-rollback, bloqueios por estado |
| `npm run sim -- recuperar` | "Esqueci a senha mestre" |
| `npm run sim -- trocar-ccp` | Troca da CCP |
| `npm run sim -- heranca` / `resgatar` | Herança digital e resgate pelo herdeiro |
| `npm run sim -- kill-switch <email> <senha>` | Kill Switch + dispositivo novo |
| `npm run sim -- planos <email> <senha>` | Travas do Free e assinatura do Pro |
| `npm run sim -- conta <email> <senha>` | Cancelar Pro, contato, sair de tudo |
| `npm run sim -- mobile <email> <senha>` | Identificação do cliente e plano recomendado |
| `npm run sim -- acesso <email> <senha>` | Ver com a CCP, CCP esquecida, abandonar (até o código) |
| `npm run sim -- remoto <email> <senha>` | v1.2.0: senha de acesso, edição remota, sincronia, relatório, pontos |
| `npm run sim -- esp32` | Papel do ESP32 real (apresentação, código, login) |
| `npm run sim -- limpar` | Exclui a conta de teste |
| `npm run sim -- status` / `esquecer` | Mostra / apaga as chaves locais do simulador |

As chaves do simulador ficam em `scripts/.sim-keys.json` (fora do Git).

**Testar a API online:** defina `SIM_API` antes.
PowerShell: `$env:SIM_API="https://sua-api/api"; npm run sim -- testar-tudo`

`testar-inatividade.ts` (`npm run ttl`) testa a rotina de avisos e exclusão por inatividade.
