# KC Communication – Zero-Cost Fallback

Default order: Push -> E-Mail -> WhatsApp -> SMS.

Rules:
- `zero_cost_only=true` by default.
- Push/Web Push is production-ready and zero-cost.
- Resend E-Mail is technically ready but remains test-only until a verified sender domain exists.
- WhatsApp and SMS are prepared in the provider registry but `cost_locked` and disabled.
- Paid channels may never be selected while the zero-cost lock is active.
- The central router (`kc-communication-router`) owns fallback selection. Fachprogramme only raise events / provide recipients and message variables.
- Direct app-to-provider integrations are not allowed.
- Global dispatch remains an independent kill switch.

Fallback semantics:
1. Check provider eligibility and cost lock.
2. Check recipient capability (active push device, e-mail address, etc.).
3. Attempt selected channel.
4. If it fails, continue with the next eligible channel.
5. Stop after first successful send.
6. Record every skipped, blocked, failed and successful attempt.
