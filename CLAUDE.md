# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Static mirror of judyleeofficial.com (Judy Lee, actor/model portfolio), hosted on GitHub Pages at https://judyleeofficial.com. The site was originally built on WordPress/Divi via Upanduphosting and mirrored with `wget --mirror`. DNS is managed via Cloudflare, pointing to GitHub Pages.

## Structure

- `index.html` — Home page
- `about/`, `portfolio/`, `reel/`, `contact/` — each contains an `index.html`
- `wp-content/` — CSS, JS, images, and fonts from the original WordPress install (Divi theme)
- `wp-includes/` — jQuery and a few WordPress JS utilities
- `CNAME` — contains `judyleeofficial.com` for GitHub Pages custom domain

## Important conventions

**URLs must be relative.** All `href`, `src`, and CSS `url()` references must use relative paths (e.g. `../wp-content/...` from subpages, `wp-content/...` from root). No `https://judyleeofficial.com/` absolute URLs — they break on GitHub Pages.

**No build step.** Edit HTML files directly. Changes go live after pushing to `main` (GitHub Pages deploys automatically).

**Version query strings are stripped.** Asset filenames have no `?ver=xxx` suffix — those were removed during the initial mirror so GitHub Pages can serve them as static files.

## Reel page videos

The two YouTube embeds on `reel/index.html` are plain `<iframe>` tags (not the original Divi JS carousel, which required a server). Video IDs:
- Film reel: `0FlCA0Vl7S8`
- Commercial reel: `rR3CsBQbOVQ`

## Deploying

Push to `main`. No CI needed — GitHub Pages picks it up automatically.

## DNS

Cloudflare zone `judyleeofficial.com` (zone ID `7c877330cfb9cc1934860e8e45509e32`). Nameservers: `ada.ns.cloudflare.com`, `ignat.ns.cloudflare.com`. Cloudflare API token is in 1Password under "CloudFlare DNS Edit API Token".
