"""Dump the FastAPI OpenAPI schema to stdout as JSON.

Usage::

    uv run python scripts/export_openapi.py > openapi.json

Imports the app factory and calls ``app.openapi()`` — no HTTP server
needed, so this runs fast in CI without spinning up Docker.
"""

from __future__ import annotations

import json
import sys

from axolotl.main import app


def main() -> None:
    schema = app.openapi()
    json.dump(schema, sys.stdout, indent=2, sort_keys=True)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
