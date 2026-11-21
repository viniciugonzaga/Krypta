// ============================================================
// npm run icones   (roda sozinho depois do "npm install")
//
// Monta a biblioteca de LOGOS DE MARCAS do cofre a partir do pacote
// "simple-icons" (ícones livres, licença CC0). Gera um arquivo pequeno só
// com as marcas da lista abaixo: src/mobile/icones/marcas.gerado.json
// O app carrega esse arquivo do próprio site (nenhum pedido sai para fora,
// então ninguém de fora fica sabendo quais serviços você guarda).
//
// Quer mais marcas? Acrescente o "slug" (nome do arquivo no simpleicons.org)
// na lista e rode: npm run icones
// Quer TODAS (~3.300, arquivo maior)? Rode: npm run icones -- --todas
// ============================================================
import { mkdirSync, writeFileSync } from 'node:fs';

const MARCAS = `
netflix primevideo amazonprime hbo hbomax max disneyplus hulu crunchyroll paramountplus appletv globoplay plex mubi pluto tidal
spotify applemusic deezer soundcloud youtubemusic amazonmusic audible
youtube twitch kick tiktok instagram facebook messenger whatsapp telegram signal discord x twitter threads bluesky mastodon snapchat pinterest reddit linkedin tumblr quora medium substack patreon kofi onlyfans
google gmail googledrive googlephotos googlecalendar googlekeep googlemaps googlemeet googlepay googleplay googlecloud googlegemini googleauthenticator
apple icloud appstore applepay
microsoft microsoftoutlook microsoftteams microsoftoffice microsoftonedrive microsoftazure microsoftedge outlook onedrive xbox windows skype
yahoo protonmail proton tutanota tuta zoho
steam epicgames playstation playstationnetwork nintendo nintendoswitch battledotnet blizzard riotgames leagueoflegends valorant roblox minecraft ea origin ubisoft gog itchdotio rockstargames fortnite twitch faceit
github gitlab bitbucket stackoverflow npm docker kubernetes amazonwebservices amazonaws digitalocean heroku vercel netlify cloudflare hostinger godaddy namecheap firebase supabase mongodb mysql postgresql jira confluence jetbrains intellijidea visualstudiocode replit codepen
openai chatgpt anthropic claude perplexity
dropbox mega box wetransfer pcloud notion obsidian evernote todoist trello asana slack zoom figma canva adobe adobecreativecloud adobephotoshop dribbble behance miro clickup monday airtable
paypal stripe mercadopago mercadolivre nubank picpay revolut wise n26 visa mastercard americanexpress itau bradesco santander caixa bancodobrasil c6bank inter bancointer neon
binance coinbase bitcoin ethereum metamask kraken
amazon ebay etsy aliexpress shopee shein magalu americanas olx shopify
ifood uber ubereats rappi airbnb bookingdotcom tripadvisor latam azul gol decolar 99
duolingo coursera udemy khanacademy alura edx
wordpress wix squarespace blogger
lastpass 1password bitwarden dashlane keepassxc authy okta auth0 nordvpn expressvpn protonvpn surfshark
firefoxbrowser googlechrome brave opera vivaldi torproject
samsung xiaomi huawei motorola oneplus vivo claro tim
strava nike adidas garmin fitbit
tinder bumble
wikipedia imdb letterboxd goodreads kindle scribd pocket
starbucks mcdonalds burgerking
`.split(/\s+/).filter(Boolean);

const todas = process.argv.includes('--todas');

let icones;
try {
  icones = await import('simple-icons');
} catch {
  console.warn('⚠️  Pacote "simple-icons" não instalado: rode "npm install". O cofre usa os ícones padrão do Krypta.');
  process.exit(0);
}

const lista = Object.values(icones).filter((i) => i && typeof i === 'object' && 'slug' in i && 'path' in i);
const porSlug = new Map(lista.map((i) => [i.slug, i]));
const escolhidas = todas ? lista : [...new Set(MARCAS)].map((s) => porSlug.get(s)).filter(Boolean);
const faltando = todas ? [] : [...new Set(MARCAS)].filter((s) => !porSlug.has(s));

const dados = escolhidas
  .map((i) => ({ s: i.slug, t: i.title, h: i.hex, p: i.path }))
  .sort((a, b) => a.t.localeCompare(b.t));

mkdirSync('src/mobile/icones', { recursive: true });
writeFileSync('src/mobile/icones/marcas.gerado.json', JSON.stringify(dados));
console.log(`✅ ${dados.length} logos de marcas em src/mobile/icones/marcas.gerado.json`);
if (faltando.length) console.log(`   (não existem no simple-icons instalado, usam ícone padrão: ${faltando.join(', ')})`);
