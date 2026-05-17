#!/usr/bin/env python3
"""Refresh the Contributors section in README.md from git history.

Pulls authors + ``Co-Authored-By`` trailers from the full commit log,
dedupes by email, and rewrites the section between the
``<!-- CONTRIBUTORS:START -->`` / ``<!-- CONTRIBUTORS:END -->`` markers
as a small HTML ``<table>`` of avatar cards.

Why a script rather than a third-party Action:
- We trust the diff that lands in ``main`` more than an opaque dep tree.
- No tokens beyond ``GITHUB_TOKEN`` needed.
- ``Co-Authored-By: Claude <noreply@anthropic.com>`` is rendered with
  Anthropic's org avatar (special-cased), so Claude shows up in the
  README even though the noreply email isn't linked to any GitHub user.

Run from the repo root: ``python3 .github/scripts/update_contributors.py``.
"""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

START = "<!-- CONTRIBUTORS:START -->"
END = "<!-- CONTRIBUTORS:END -->"
ROOT = Path(__file__).resolve().parents[2]
README = ROOT / "README.md"
COLUMNS = 6

# Emails that don't map to a GitHub user but should still render as a
# named avatar card. Keep the avatar URLs to stable, public endpoints
# (org logos) so the table doesn't 404 silently in the rendered README.
SPECIAL_CARDS: dict[str, tuple[str, str, str]] = {
    # email → (display name, profile link, avatar URL)
    "tpligne12@gmail.com": (
        "ligne12",
        "https://github.com/ligne12",
        "https://github.com/ligne12.png?size=80",
    ),
    "noreply@anthropic.com": (
        "Claude",
        "https://github.com/anthropics",
        "https://github.com/anthropics.png?size=80",
    ),
    "claude@anthropic.com": (
        "Claude",
        "https://github.com/anthropics",
        "https://github.com/anthropics.png?size=80",
    ),
}


def run(cmd: list[str]) -> str:
    return subprocess.check_output(cmd, text=True, cwd=ROOT)


def gather() -> list[tuple[str, str]]:
    """Return ``(name, email)`` pairs from authors + Co-Authored-By trailers."""
    authors = run(["git", "log", "--pretty=format:%an|%ae"])
    coauthors = run(
        [
            "git",
            "log",
            "--pretty=format:%(trailers:key=Co-authored-by,valueonly,separator=%x1f)",
        ]
    )

    seen: dict[str, tuple[str, str]] = {}

    for line in authors.splitlines():
        if "|" not in line:
            continue
        name, email = line.split("|", 1)
        email = email.strip().lower()
        if email and email not in seen:
            seen[email] = (name.strip(), email)

    for raw in coauthors.split("\x1f"):
        line = raw.strip()
        if not line:
            continue
        match = re.match(r"^(.+?)\s*<(.+?)>\s*$", line)
        if not match:
            continue
        name = match.group(1).strip()
        email = match.group(2).strip().lower()
        if email and email not in seen:
            seen[email] = (name, email)

    return sorted(seen.values(), key=lambda x: (x[0].lower(), x[1]))


def github_handle(email: str) -> str | None:
    if email.endswith("@users.noreply.github.com"):
        local = email.split("@", 1)[0]
        # GitHub uses ``<id>+<username>@users.noreply.github.com`` for new
        # accounts and the older bare ``<username>@…`` for legacy ones.
        if "+" in local:
            return local.split("+", 1)[1]
        return local
    if email.endswith("@github.com") and email != "noreply@github.com":
        return email.split("@", 1)[0]
    return None


def card(name: str, email: str) -> str:
    """Render one ``<td>`` avatar card."""
    if email in SPECIAL_CARDS:
        display, link, avatar = SPECIAL_CARDS[email]
        return (
            f'<td align="center" width="120">'
            f'<a href="{link}"><img src="{avatar}" width="80" height="80" '
            f'alt="{display}" style="border-radius: 50%" /></a><br />'
            f"<sub><b>{display}</b></sub></td>"
        )
    handle = github_handle(email)
    if handle:
        link = f"https://github.com/{handle}"
        avatar = f"https://github.com/{handle}.png?size=80"
        return (
            f'<td align="center" width="120">'
            f'<a href="{link}"><img src="{avatar}" width="80" height="80" '
            f'alt="{handle}" style="border-radius: 50%" /></a><br />'
            f"<sub><b>{name}</b></sub></td>"
        )
    return (
        f'<td align="center" width="120">'
        f"<sub><b>{name}</b></sub><br />"
        f'<sub><i>{email}</i></sub></td>'
    )


def render(contributors: list[tuple[str, str]]) -> str:
    cards = [card(name, email) for name, email in contributors]
    rows = [cards[i : i + COLUMNS] for i in range(0, len(cards), COLUMNS)]
    body = (
        "<table>\n"
        + "\n".join("  <tr>" + "".join(row) + "</tr>" for row in rows)
        + "\n</table>"
    )
    return body


def main() -> int:
    text = README.read_text(encoding="utf-8")
    if START not in text or END not in text:
        print(
            f"README markers not found: place {START!r} and {END!r} where you want the table rendered.",
            file=sys.stderr,
        )
        return 1

    contributors = gather()
    if not contributors:
        print("No contributors found in git log — leaving README untouched.", file=sys.stderr)
        return 0

    section = f"{START}\n{render(contributors)}\n{END}"
    new_text = re.sub(
        rf"{re.escape(START)}.*?{re.escape(END)}",
        section,
        text,
        count=1,
        flags=re.S,
    )
    if new_text == text:
        print("Contributors section already up to date.")
        return 0

    README.write_text(new_text, encoding="utf-8")
    print(f"Updated README with {len(contributors)} contributors.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
