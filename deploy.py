import urllib.request, urllib.error, json, hashlib, sys, os, base64

TOKEN = 'vcp_1ZxX2DHyOaRv99vqpfHmOPGrFzWupiFH0HKRXCB8BOzBgdPkht1hsg5C'
FILE  = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'CanvasPreview.html')

with open(FILE, 'rb') as f:
    content = f.read()

sha1 = hashlib.sha1(content).hexdigest()

def api(method, path, data=None, extra_headers=None):
    headers = {'Authorization': f'Bearer {TOKEN}'}
    if extra_headers:
        headers.update(extra_headers)
    if data is not None and not isinstance(data, (bytes, bytearray)):
        data = json.dumps(data).encode()
        headers['Content-Type'] = 'application/json'
    if data is not None:
        headers['Content-Length'] = str(len(data))
    req = urllib.request.Request(f'https://api.vercel.com{path}', data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())

print('\n🚀 Album Preview — Déploiement Vercel\n')

# 1. Verify token
s, b = api('GET', '/v2/user')
user = b.get('user', b)
if not user.get('username') and not user.get('email'):
    print('❌ Token invalide:', str(b)[:200]); sys.exit(1)
print('✅ Connecté:', user.get('username') or user.get('email'))

# 2. Upload file
print('📤 Upload du fichier...')
s, b = api('POST', '/v2/files', content, {
    'Content-Type': 'application/octet-stream',
    'x-vercel-digest': sha1,
    'Content-Length': str(len(content))
})
print(f'   Status: {s}')

# 3. Deploy
print('🌐 Création du déploiement...')
s, b = api('POST', '/v13/deployments', {
    'name': 'album-preview',
    'files': [{'file': 'index.html', 'sha': sha1, 'size': len(content)}],
    'projectSettings': {'framework': None, 'buildCommand': None, 'outputDirectory': None},
    'target': 'production'
})

if b.get('url'):
    url = 'https://' + b['url']
    print(f'\n✨ ============================================')
    print(f'   DÉPLOYÉ ! Ton lien Vercel :')
    print(f'   {url}')
    print(f'   ============================================\n')
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'vercel-url.txt')
    with open(out, 'w') as f:
        f.write(url + '\n')
    print(f'💾 URL sauvegardée dans vercel-url.txt')
else:
    print('Réponse:', str(b)[:400])
