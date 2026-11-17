#!/usr/bin/env python3
"""Inspect, test, and report the LunaRecycle Node/Python build."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent
SITE = ROOT / "GITREPOVSLOCAL"
REPORT = ROOT / "final.main.luna.eu" / "inspection.json"


def command(names: list[str]) -> tuple[str, str] | None:
    for name in names:
        path = shutil.which(name)
        if path:
            return name, path
    return None


def run(command_line: list[str], cwd: Path, timeout: int = 180) -> dict[str, Any]:
    try:
        result = subprocess.run(command_line, cwd=cwd, capture_output=True, text=True, timeout=timeout, check=False)
        return {
            "command": command_line,
            "exitCode": result.returncode,
            "stdout": result.stdout[-12000:],
            "stderr": result.stderr[-12000:],
            "passed": result.returncode == 0,
        }
    except (OSError, subprocess.TimeoutExpired) as error:
        return {"command": command_line, "exitCode": None, "error": str(error), "passed": False}


def inspect() -> dict[str, Any]:
    node = command(["node"])
    npm = command(["npm.cmd", "npm"])
    python = command(["python", "python3"])
    site_files = [path for path in SITE.rglob("*") if path.is_file()]
    checks: list[dict[str, Any]] = []

    required = [
        SITE / "index.html",
        SITE / "admin.html",
        SITE / "launch.html",
        SITE / "post" / "index.html",
        SITE / "netbot-context.json",
        SITE / "networkbuster" / "app.js",
        SITE / "imported-programs" / "index.html",
    ]
    missing = [str(path.relative_to(ROOT)) for path in required if not path.is_file()]
    checks.append({"name": "required-files", "passed": not missing, "missing": missing})

    if node:
        js_files = [path for path in SITE.rglob("*.js")]
        checks.extend(run([node[1], "--check", str(path)], ROOT) | {"name": f"syntax:{path.relative_to(SITE)}"} for path in js_files)

    if python:
        checks.append(run([python[1], "-m", "compileall", "-q", str(ROOT / "node.py")], ROOT) | {"name": "python:compile"})
        snippet = (
            "from html.parser import HTMLParser; "
            "from pathlib import Path; "
            f"[HTMLParser().feed(p.read_text(encoding='utf-8', errors='replace')) for p in Path({str(SITE)!r}).rglob('*.html')]; "
            "print('HTML validated')"
        )
        checks.append(run([python[1], "-c", snippet], ROOT) | {"name": "html:parse"})

    manifest = {
        "build": "final.main.luna.eu",
        "owner": "cleanskiier27",
        "generatedUtc": datetime.now(timezone.utc).isoformat(),
        "environment": {"node": node[1] if node else None, "npm": npm[1] if npm else None, "python": python[1] if python else None},
        "siteFileCount": len(site_files),
        "siteSha256": hashlib.sha256(b"".join(path.read_bytes() for path in sorted(site_files))).hexdigest(),
        "checks": checks,
        "passed": all(check["passed"] for check in checks),
    }
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return manifest


def publish(args: argparse.Namespace) -> int:
    output = ROOT / "final.main.luna.eu" / "luna.eu-final.zip"
    output.parent.mkdir(parents=True, exist_ok=True)
    if output.exists():
        output.unlink()
    shutil.make_archive(str(output.with_suffix("")), "zip", ROOT, "GITREPOVSLOCAL")
    commit = os.environ.get("GITHUB_SHA", "local")
    print(json.dumps({"archive": str(output), "bytes": output.stat().st_size, "sourceCommit": commit}))
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", nargs="?", choices=("inspect", "publish"), default="inspect")
    args = parser.parse_args()
    if args.action == "publish":
        return publish(args)
    report = inspect()
    print(json.dumps({"report": str(REPORT), "passed": report["passed"], "checks": len(report["checks"])}))
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
