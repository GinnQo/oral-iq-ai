# Placeholder Endpoint Inventory

Scope: endpoints currently returning HTTP 501 and intentionally left unimplemented in this phase.

| Endpoint | Methods | Current UI usage | Authorization status | Feature-flag recommendation | Future priority |
| --- | --- | --- | --- | --- | --- |
| /api/ai/feedback | GET | No direct UI calls found in app/components/lib | AUTHENTICATED_PLUS_SUBSCRIPTION (teacher-capable roles) | Yes. Gate with `feature_ai_feedback` before wiring UI. | Medium |
| /api/ai/grading | GET | No direct UI calls found in app/components/lib | AUTHENTICATED_PLUS_SUBSCRIPTION (teacher-capable roles) | Yes. Gate with `feature_ai_grading_v2` for staged rollout. | Medium |
| /api/ai/reports | GET | No direct UI calls found in app/components/lib | AUTHENTICATED_PLUS_SUBSCRIPTION (teacher-capable roles) | Yes. Gate with `feature_ai_reports` to avoid exposing unfinished analytics. | Medium |
| /api/speech/analyze | POST | No direct UI calls found in app/components/lib | AUTHENTICATED_PLUS_SUBSCRIPTION (teacher-capable roles) | Yes. Gate with `feature_speech_analyze` until service contract is finalized. | Low-Medium |
| /api/speech/transcribe | POST | No direct UI calls found in app/components/lib | AUTHENTICATED_PLUS_SUBSCRIPTION (teacher-capable roles) | Yes. Gate with `feature_speech_transcribe` before adding client integration. | Low-Medium |

Notes:
- These endpoints are now authorization-protected and no longer publicly callable.
- Business logic implementation is intentionally deferred per project instruction.
