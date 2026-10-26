# Security changes — homepage published; legacy candidate pending

2026-10-26 production update: the independently built homepage Worker was deployed to `https://shima-craft.com/` in the verified `shimacraft8@gmail.com` Cloudflare account. Version: `39656689-fb45-43ed-b8f8-8ac87a34aedc`. Its predecessor for rollback is `ff8a38bb-706c-4747-b2b5-bcf3b90fa2e0`. The deployed artifact SHA-256 is `4b7cace8e5afa145bee63d2346316d07fa877a4432b6d316a1b40e25952fb5d5`. Public API rate limiting and homepage security headers are live. The route patterns, fail-closed settings and bindings retain their previous meaning. Forty public HTTP checks passed, including existing pages, asset hashes, observation/tide responses and exclusion of the unpublished analytics paths. This does not establish that all external information is fresh: the cyclone list returned `stale` and the browser correctly showed saved information.

Both Workers' pre-deployment compiled source was downloaded and hashed into private local recovery evidence. This resolves the earlier source-download failure; it does not establish a matching original build. The legacy production Worker remains at `117ff8f0-149d-4cfb-ae86-8a11aaf20c25`. It uses OpenNext and lacks the Firebase/Groq/Turnstile bindings required by this branch's legacy candidate. A historical migration branch contains OpenNext configuration, but its exact correspondence to the live build is not established. Do not replace the legacy service with the ordinary Next build or activate unconfigured forms. The legacy dependency, mail, authentication, image processing and CMS changes below remain unpublished. Analytics and Native remain unpublished.

GitHub target for the explicitly authorized push is `shimacraft8/shima-craft.com`, branch `codex/security-hardening-20261022`; no merge to `main` or automatic legacy deployment is part of this release. See `amami-life/docs/SECURITY_WEB_RELEASE_20261026.md` for the publication and rollback record.

## Historical local validation record

2026-10-23. Branch: `codex/security-hardening-20261022`.

This branch contains the legacy Next application candidate and the separately built AMAMI homepage candidate. No production deployment or remote push was performed for this remediation. The old production Worker's source/build adapter must be matched before replacing it. Turnstile and existing server credentials must be configured and tested before enabling the new form handlers.

Validation: 252 legacy tests; typecheck; lint; Next build (269 generated pages). Homepage-only source: 113 tests and release scope/hash checks. Two tests requiring local TCP were excluded in the isolated sandbox. An extracted compiled homepage release passed five smoke checks with mock upstream services. Native device tests, real provider delivery, Cloudflare adapter build and production rollback are not covered by those results.

Use Node 22.23.4 / npm 11.21.1 and the committed lockfiles. The remaining dependency warnings are documented in the local security-audit remediation report; no forced downgrade was applied. The GitHub Actions validation workflow is manual and has not been activated remotely; Dependabot configuration is also not active until installed in the repository's default branch.

The homepage-only build under `amami-life` produces `dist/release` with a manifest and account/route/service scope checks. The complete AMAMI development ZIP also contains unpublished analytics and mobile source and must never be used as public deployment assets. `recovery-static` is an undeployed static fallback with official links, not a replacement for live hazard/transport information or authentication/data services.

Detailed local handoff: `outputs/amami-life/docs/security-audit/REMEDIATION_REPORT.md`, `REMEDIATION_STATUS.csv`, `OWNER_ACTIONS.md` and `REMEDIATION_RUNBOOK.md` in the task workspace. Secrets and private databases are deliberately excluded from source backups.
