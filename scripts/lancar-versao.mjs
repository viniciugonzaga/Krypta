// ============================================================
// npm run desktop:lancar
// Publica a versão do package.json no GitHub: cria a tag vX.Y.Z e envia.
// O GitHub Actions gera o instalador e o botão "Baixar para Windows"
// (menu Aplicações) passa a baixar essa versão sozinho.
// ============================================================
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8'));
const tag = `v${version}`;
const rodar = (cmd) => execSync(cmd, { stdio: 'inherit' });

try {
  const tags = execSync('git tag --list', { encoding: 'utf-8' }).split(/\r?\n/);
  if (tags.includes(tag)) {
    console.error(`\n❌ A versão ${tag} já foi lançada. Aumente "version" no package.json (ex.: 1.0.1) e rode de novo.\n`);
    process.exit(1);
  }
  const pendente = execSync('git status --porcelain', { encoding: 'utf-8' }).trim();
  if (pendente) {
    console.error('\n❌ Há arquivos sem commit. Faça o commit e o push antes de lançar a versão.\n');
    process.exit(1);
  }
  rodar('git push');
  rodar(`git tag ${tag}`);
  rodar(`git push origin ${tag}`);
  console.log(`\n✅ Versão ${tag} enviada. Acompanhe em GitHub → Actions → "App desktop (Windows)".`);
  console.log('   Em ~10 minutos o botão "Baixar para Windows" do site já baixa esta versão.\n');
} catch {
  process.exit(1);
}
