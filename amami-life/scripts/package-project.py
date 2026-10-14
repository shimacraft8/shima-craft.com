#!/usr/bin/env python3
"""Create a local handoff ZIP; no upload, Git or deployment operations."""
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo
import hashlib
import json
import re
import zipfile

root = Path(__file__).resolve().parents[1]
stamp = datetime.now(ZoneInfo("Asia/Tokyo")).strftime("%Y%m%d")
target = root.parent / f"amami-life-{stamp}.zip"
skip_dirs = {"node_modules", ".git", ".expo", ".wrangler", "__pycache__", ".cache"}
skip_names = {".DS_Store", ".npmrc", "credentials.json", "google-services.json", "GoogleService-Info.plist"}
skip_suffixes = {".key", ".pem", ".p8", ".p12", ".jks", ".mobileprovision", ".tsbuildinfo"}
files = []
excluded = 0
for path in sorted(root.rglob("*")):
    relative = path.relative_to(root)
    if any(part in skip_dirs for part in relative.parts):
        continue
    if not path.is_file():
        continue
    if path.is_symlink():
        raise SystemExit("Packaging refuses symlinks: " + str(relative))
    if path.name == "PACKAGE_MANIFEST.json":
        continue
    if (path.name in skip_names or path.suffix in skip_suffixes
            or (path.name.startswith(".env") and path.name != ".env.example")):
        excluded += 1
        continue
    files.append(path)

# Catch common credential forms without printing matched values.
secret_pattern = re.compile(rb"(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)")
entries = []
for path in files:
    data = path.read_bytes()
    if secret_pattern.search(data):
        raise SystemExit("Potential credential: review " + str(path.relative_to(root)))
    entries.append({"path": path.relative_to(root).as_posix(), "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()})
required = {"README.md", "package-lock.json", "design-system/tokens.json", "docs/DEVICE_QA.md", "docs/PUBLICATION_RUNBOOK.md", "research/all-tests.txt", "server/data/O9-2026.txt"}
if not required.issubset({entry["path"] for entry in entries}):
    raise SystemExit("Required handoff files missing")
manifest = {"generatedAt": datetime.now(ZoneInfo("Asia/Tokyo")).isoformat(), "project": "AMAMI LIFE source and public web release", "isInstallableApp": False, "excludedSensitiveFiles": excluded, "dependencyRestore": "npm ci", "files": entries}
manifest_path = root / "PACKAGE_MANIFEST.json"
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
    for path in files + [manifest_path]:
        archive.write(path, root.name + "/" + path.relative_to(root).as_posix())
with zipfile.ZipFile(target) as archive:
    if archive.testzip() is not None:
        raise SystemExit("ZIP integrity failed")
    for entry in entries:
        name = root.name + "/" + entry["path"]
        if hashlib.sha256(archive.read(name)).hexdigest() != entry["sha256"]:
            raise SystemExit("ZIP content hash mismatch: " + name)
digest = hashlib.sha256(target.read_bytes()).hexdigest()
target.with_suffix(".zip.sha256").write_text(digest + "  " + target.name + "\n")
report = {"archive": target.name, "sourceFiles": len(entries), "bytes": target.stat().st_size, "sha256": digest, "zipCRC": "passed", "allFileHashes": "passed", "requiredFiles": "passed", "excludedSensitiveFiles": excluded, "uploaded": False}
target.with_name(target.stem + "-package-check.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
print(json.dumps(report, ensure_ascii=False))
