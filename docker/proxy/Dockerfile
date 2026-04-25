# =============================================================================
# Custom Caddy build with the Cloudflare DNS plugin.
#
# Why a custom build: Caddy ships with an HTTP-01 / TLS-ALPN-01 challenge
# solver out of the box, but those challenges need the host to be reachable
# on :80 / :443 from the public Internet. For a self-hosted stack behind NAT
# (or pinned to a LAN-only DNS A record), we use the DNS-01 challenge — Caddy
# proves domain ownership by writing a TXT record via the DNS provider's API.
#
# The Cloudflare DNS plugin (caddy-dns/cloudflare) is not in the default
# build, hence the multi-stage build below using the official `caddy:builder`
# image and `xcaddy`.
# =============================================================================

FROM caddy:2-builder AS builder

RUN xcaddy build \
    --with github.com/caddy-dns/cloudflare

FROM caddy:2-alpine

COPY --from=builder /usr/bin/caddy /usr/bin/caddy
