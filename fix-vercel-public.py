import urllib.request, urllib.error, json, sys

TOKEN = 'vcp_1ZxX2DHyOaRv99vqpfHmOPGrFzWupiFH0HKRXCB8BOzBgdPkht1hsg5C'

def api(method, path, data=None):
    headers = {'Authorization': f'Bearer {TOKEN}', 'Content-Type': 'application/json'}
    body = json.dumps(data).encode() if data is not None else None
    if body: headers['Content-Length'] = str(len(body))
    req = urllib.request.Request(f'https://api.vercel.com{path}', data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())

print('\n🔧 Fix Album Preview — rendre public sur Vercel\n')

# 1. Find the project
s, b = api('GET', '/v9/projects/album-preview')
if s != 200:
    print('❌ Projet introuvable:', b); sys.exit(1)

project_id = b['id']
print(f'✅ Projet trouvé: {b["name"]} (id: {project_id})')

# 2. Disable all protection (Vercel Auth, password, SSO)
print('🔓 Désactivation de la protection d\'accès...')
s, b2 = api('PATCH', f'/v9/projects/{project_id}', {
    "ssoProtection": None,
    "passwordProtection": None,
    "trustedIps": None
})
print(f'   Status: {s}')

# 3. Also disable deployment protection via project settings
s, b3 = api('PATCH', f'/v9/projects/{project_id}', {
    "enablePreviewFeedback": False,
    "autoExposeSystemEnvs": True
})

# 4. Get all domains / aliases for the project
print('\n🌐 Récupération des domaines publics...')
s, domains = api('GET', f'/v9/projects/{project_id}/domains')

if s == 200 and domains.get('domains'):
    print('\n✨ ============================================')
    print('   LIENS PUBLICS DE TON APP :')
    for d in domains['domains']:
        name = d.get('name','')
        if name:
            print(f'   https://{name}')
    print('   ============================================\n')
    # Save to file
    urls = [f"https://{d['name']}" for d in domains['domains'] if d.get('name')]
    with open('vercel-url.txt', 'w') as f:
        f.write('\n'.join(urls) + '\n')
    print('💾 URLs sauvegardées dans vercel-url.txt')
else:
    # Fallback: list deployments and get production URL
    print('   Récupération des déploiements...')
    s, deps = api('GET', f'/v6/deployments?projectId={project_id}&target=production&limit=5')
    if s == 200 and deps.get('deployments'):
        print('\n✨ Déploiements production:')
        for dep in deps['deployments']:
            url = dep.get('url','')
            aliases = dep.get('alias', [])
            if aliases:
                for a in aliases:
                    print(f'   https://{a}')
            elif url:
                print(f'   https://{url}')
    print('\nRéponse domains:', str(domains)[:300])
