# Security change candidate — not deployed

2026-10-23. Branch: `codex/security-hardening-20261022`.

This branch contains the legacy Next application candidate and the separately built AMAMI homepage candidate. No production deployment or remote push was performed for this remediation. The old production Worker's source/build adapter must be matched before replacing it. Turnstile and existing server credentials must be configured and tested before enabling the new form handlers.

Validation: 252 legacy tests; typecheck; lint; Next build (269 generated pages). Homepage-only source: 113 tests and release scope/hash checks. Two tests requiring local TCP were excluded in the isolated sandbox. An extracted compiled homepage release passed five smoke checks with mock upstream services. Native device tests, real provider delivery, Cloudflare adapter build and production rollback are not covered by those results.

Use Node 22.23.4 / npm 11.21.1 and the committed lockfiles. The remaining dependency warnings are documented in the local security-audit remediation report; no forced downgrade was applied. The GitHub Actions validation workflow is manual and has not been activated remotely; Dependabot configuration is also not active until installed in the repository's default branch.

The homepage-only build under `amami-life` produces `dist/release` with a manifest and account/route/service scope checks. The complete AMAMI development ZIP also contains unpublished analytics and mobile source and must never be used as public deployment assets. `recovery-static` is an undeployed static fallback with official links, not a replacement for live hazard/transport information or authentication/data services.

Detailed local handoff: `outputs/amami-life/docs/security-audit/REMEDIATION_REPORT.md`, `REMEDIATION_STATUS.csv`, `OWNER_ACTIONS.md` and `REMEDIATION_RUNBOOK.md` in the task workspace. Secrets and private databases are deliberately excluded from source backups.
