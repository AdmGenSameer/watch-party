#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOTNET_BIN="${HOME}/.dotnet/dotnet"
if ! command -v "$DOTNET_BIN" &> /dev/null && command -v dotnet &> /dev/null; then
    DOTNET_BIN="dotnet"
fi

echo "=========================================================="
echo "  Jellyfin WatchParty & Tokoshan UI Plugin Build Script   "
echo "  Targeting Jellyfin 10.11 (.NET 9.0)                     "
echo "=========================================================="

echo "[1/4] Building React 19 Frontend SPA..."
cd "${SCRIPT_DIR}/jellyfin-netflix-ui"
npm run build

echo "[2/4] Compiling .NET 9 Plugin DLL..."
cd "${SCRIPT_DIR}/Jellyfin.Plugin.WatchParty"
"$DOTNET_BIN" build -c Release

DLL_PATH="${SCRIPT_DIR}/Jellyfin.Plugin.WatchParty/bin/Release/net9.0/Jellyfin.Plugin.WatchParty.dll"
META_PATH="${SCRIPT_DIR}/Jellyfin.Plugin.WatchParty/meta.json"

if [ ! -f "$DLL_PATH" ]; then
    echo "ERROR: DLL not found at $DLL_PATH"
    exit 1
fi

echo "[3/4] Packaging Clean Plugin ZIP Archive (DLL + meta.json)..."
OUTPUT_ZIP="${SCRIPT_DIR}/Jellyfin.Plugin.WatchParty_1.0.0.zip"
rm -f "$OUTPUT_ZIP"

python3 -c "
import zipfile
import hashlib
import json

zip_path = '${OUTPUT_ZIP}'
dll_path = '${DLL_PATH}'
meta_path = '${META_PATH}'

# Compress exactly DLL and meta.json (JellyBridge standard)
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as z:
    z.write(dll_path, 'Jellyfin.Plugin.WatchParty.dll')
    z.write(meta_path, 'meta.json')

# Compute MD5
with open(zip_path, 'rb') as f:
    checksum = hashlib.md5(f.read()).hexdigest()

print(f'Zip created at: {zip_path}')
print(f'MD5 Checksum: {checksum}')

# Update manifest.json
manifest_file = '${SCRIPT_DIR}/manifest.json'
with open(manifest_file, 'r') as f:
    manifest = json.load(f)

manifest[0]['versions'][0]['checksum'] = checksum
manifest[0]['versions'][0]['targetAbi'] = '10.11.0.0'

with open(manifest_file, 'w') as f:
    json.dump(manifest, f, indent=2)

print(f'Updated manifest.json with checksum {checksum}')
"

echo "[4/4] Verifying Package Archive..."
unzip -l "$OUTPUT_ZIP"

echo "=========================================================="
echo "  BUILD SUCCESSFUL!                                       "
echo "  Package: Jellyfin.Plugin.WatchParty_1.0.0.zip           "
echo "=========================================================="
