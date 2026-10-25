#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOTNET_BIN="${HOME}/.dotnet/dotnet"
if ! command -v "$DOTNET_BIN" &> /dev/null && command -v dotnet &> /dev/null; then
    DOTNET_BIN="dotnet"
fi

echo "=========================================================="
echo "  Jellyfin WatchParty & Tokoshan UI Plugin Build Script   "
echo "=========================================================="

echo "[1/4] Building React 19 Frontend SPA..."
cd "${SCRIPT_DIR}/jellyfin-netflix-ui"
npm run build

echo "[2/4] Compiling & Publishing .NET 10 Plugin DLL..."
cd "${SCRIPT_DIR}/Jellyfin.Plugin.WatchParty"
rm -rf ./bin/publish
"$DOTNET_BIN" publish -c Release -o ./bin/publish

echo "[3/4] Copying Plugin Manifest..."
cp meta.json ./bin/publish/

echo "[4/4] Packaging Plugin ZIP Archive..."
cd ./bin/publish
rm -f *.pdb *.xml
rm -rf runtimes
rm -f Emby.* Jellyfin.Database.* Jellyfin.Data.* Jellyfin.Extensions.* Jellyfin.MediaEncoding.*
python3 -c "
import zipfile, os, shutil
output_zip = 'Jellyfin.Plugin.WatchParty_1.0.0.zip'
with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as z:
    for root, dirs, files in os.walk('.'):
        for file in files:
            if file.endswith('.pdb') or file.endswith('.zip') or file.endswith('.xml'):
                continue
            filepath = os.path.join(root, file)
            arcname = os.path.relpath(filepath, '.')
            z.write(filepath, arcname)
shutil.copyfile(output_zip, '${SCRIPT_DIR}/Jellyfin.Plugin.WatchParty_1.0.0.zip')
shutil.copyfile(output_zip, '../Jellyfin.Plugin.WatchParty_1.0.0.zip')
print(f'Archive created: ${SCRIPT_DIR}/Jellyfin.Plugin.WatchParty_1.0.0.zip')
"

echo "=========================================================="
echo "  BUILD SUCCESSFUL!                                       "
echo "  Package: Jellyfin.Plugin.WatchParty_1.0.0.zip           "
echo "=========================================================="
echo "Installation Instructions:"
echo "1. Go to Jellyfin Dashboard -> Admin -> Plugins -> Repositories / Upload"
echo "2. Upload Jellyfin.Plugin.WatchParty_1.0.0.zip or copy to plugins/ folder"
echo "3. Restart Jellyfin"
echo "4. Open http://<jellyfin-host>:8096/tokoshan/ in your browser"
echo "=========================================================="
