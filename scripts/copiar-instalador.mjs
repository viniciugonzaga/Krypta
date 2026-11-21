// ============================================================
// npm run desktop:copiar
// Opção SEM GitHub: copia o instalador gerado pelo "npm run desktop:build"
// para public/downloads/Krypta-Setup.exe. No próximo "npm run build" do site,
// ele vai junto e fica em https://seusite/downloads/Krypta-Setup.exe.
// No .env do site:  VITE_DESKTOP_DOWNLOAD_URL=/downloads/Krypta-Setup.exe
// ============================================================
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const pasta = 'src-tauri/target/release/bundle/nsis';
if (!existsSync(pasta)) {
  console.error('\n❌ Nenhum instalador encontrado. Rode antes: npm run desktop:build\n');
  process.exit(1);
}
const instalador = readdirSync(pasta)
  .filter((f) => f.endsWith('-setup.exe'))
  .map((f) => join(pasta, f))
  .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
if (!instalador) {
  console.error('\n❌ Nenhum *-setup.exe em ' + pasta + '\n');
  process.exit(1);
}
mkdirSync('public/downloads', { recursive: true });
copyFileSync(instalador, 'public/downloads/Krypta-Setup.exe');
console.log(`\n✅ ${instalador} → public/downloads/Krypta-Setup.exe`);
console.log('   No .env do site: VITE_DESKTOP_DOWNLOAD_URL=/downloads/Krypta-Setup.exe\n');
