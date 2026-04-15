const https = require('https');
const fs   = require('fs');
const crypto = require('crypto');
const path = require('path');

const TOKEN = 'vcp_1ZxX2DHyOaRv99vqpfHmOPGrFzWupiFH0HKRXCB8BOzBgdPkht1hsg5C';
const FILE  = path.join(__dirname, 'CanvasPreview.html');
const content = fs.readFileSync(FILE);
const sha1    = crypto.createHash('sha1').update(content).digest('hex');

function req(method, urlPath, data, extraHeaders) {
  return new Promise((resolve, reject) => {
    const headers = { Authorization: `Bearer ${TOKEN}`, ...extraHeaders };
    if (data && typeof data !== 'string' && !Buffer.isBuffer(data)) {
      data = JSON.stringify(data);
      headers['Content-Type'] = 'application/json';
    }
    if (data) headers['Content-Length'] = Buffer.byteLength(data);
    const r = https.request({ hostname:'api.vercel.com', path:urlPath, method, headers }, res => {
      let d=''; res.on('data',c=>d+=c);
      res.on('end',()=>{ try{resolve({s:res.statusCode,b:JSON.parse(d)});}catch(e){resolve({s:res.statusCode,b:d});} });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

async function deploy() {
  console.log('\n🚀 Album Preview — Déploiement Vercel\n');

  // 1. Verify token
  const me = await req('GET', '/v2/user');
  if (!me.b?.user) { console.error('❌ Token invalide:', JSON.stringify(me.b).slice(0,200)); process.exit(1); }
  console.log('✅ Connecté en tant que:', me.b.user.username || me.b.user.email);

  // 2. Upload file
  process.stdout.write('📤 Upload du fichier... ');
  const up = await req('POST', '/v2/files', content, {
    'Content-Type': 'application/octet-stream',
    'x-vercel-digest': sha1,
    'Content-Length': content.length
  });
  if (up.s !== 200 && up.s !== 204) {
    // 200/204 means ok, or file already exists (which is fine)
    if (up.s !== 200) console.log(`(status ${up.s} — fichier déjà connu)`);
  } else { console.log('OK'); }

  // 3. Create deployment
  process.stdout.write('🌐 Création du déploiement... ');
  const dep = await req('POST', '/v13/deployments', {
    name: 'album-preview',
    files: [{ file: 'index.html', sha: sha1, size: content.length }],
    projectSettings: { framework: null, buildCommand: null, outputDirectory: null },
    target: 'production'
  });

  if (dep.b?.url) {
    const url = 'https://' + dep.b.url;
    console.log('\n\n✨ ============================================');
    console.log('   DÉPLOYÉ ! Ton lien Vercel :');
    console.log('   ' + url);
    console.log('   ============================================\n');
    // Save URL to file
    fs.writeFileSync(path.join(__dirname, 'vercel-url.txt'), url + '\n');
    console.log('💾 URL sauvegardée dans vercel-url.txt');
  } else {
    console.log('\nRéponse:', JSON.stringify(dep.b).slice(0, 400));
  }
}

deploy().catch(e => { console.error('Erreur:', e.message); process.exit(1); });
