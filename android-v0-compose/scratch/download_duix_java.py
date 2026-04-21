import urllib.request
import json
import os
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

tree_url = "https://api.github.com/repos/duixcom/Duix-Mobile/git/trees/4957e4079ddb7a1bb175cd0f92119fef89878420?recursive=1"
req = urllib.request.Request(tree_url, headers={'User-Agent': 'Mozilla/5.0'})
response = urllib.request.urlopen(req, context=ctx)
data = json.loads(response.read().decode('utf-8'))

base_dir = "/Users/linxiong/Documents/GitHub/AI-Interview-System/android-v0-compose/duix-sdk/src"

for item in data.get('tree', []):
    if item['type'] == 'blob' and item['path'].startswith('main/java') and item['path'].endswith('.java'):
        file_path = os.path.join(base_dir, item['path'])
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        # We need raw github content URL since blobs API returns base64
        # Original repo: duixcom/Duix-Mobile, branch: main, path in repo: duix-android/dh_aigc_android/duix-sdk/src/...
        raw_url = f"https://raw.githubusercontent.com/duixcom/Duix-Mobile/main/duix-android/dh_aigc_android/duix-sdk/src/{item['path']}"
        print(f"Downloading {raw_url} to {file_path}")
        file_req = urllib.request.Request(raw_url, headers={'User-Agent': 'Mozilla/5.0'})
        file_resp = urllib.request.urlopen(file_req, context=ctx)
        with open(file_path, 'wb') as f:
            f.write(file_resp.read())

print("Done.")
