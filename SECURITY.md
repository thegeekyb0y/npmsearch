# Security Policy

## Supported versions

npmsearch is a continuously deployed web application. Only the latest `main`
branch is supported with security fixes.

## Reporting a vulnerability

Please **do not open a public issue** for a vulnerability.

Use GitHub's private reporting flow:

1. Go to the repository's **Security** tab.
2. Choose **Report a vulnerability** (Security Advisories).
3. Include the affected URL, a reproduction, and the impact you expect.

If the advisory flow is unavailable, contact the maintainer
[@thegeekyb0y](https://github.com/thegeekyb0y) privately on GitHub.

Please avoid accessing other users' data, disrupting the service, or testing
against production with automated scanners.

## What is in scope

- The Next.js application and its API routes
- The README rendering pipeline (sanitization, URL rewriting)
- Cache key handling and stale-while-revalidate behaviour
- Rate limiting and upstream request construction
- Any secret or token exposure

## What is out of scope

- Vulnerabilities in npm, jsDelivr, GitHub, Upstash or Vercel themselves
- Issues that require a compromised browser or account
- Missing security headers without a demonstrated impact

## Our commitment

We will acknowledge a report as soon as possible, keep you updated on the fix,
and credit you in the advisory if you would like.
