# Auth Session Management Endpoints

These endpoints provide self-service session visibility and revocation for authenticated users.

## List sessions
- Method: GET
- Route: /api/auth/sessions
- Auth: required
- Response:
  - sessions: array of `{ id, expires, isCurrent }`
  - total: number

## Revoke other sessions
- Method: DELETE
- Route: /api/auth/sessions?scope=others
- Auth: required
- Effect: revokes all sessions except the current cookie session token when present.

## Revoke all sessions
- Method: DELETE
- Route: /api/auth/sessions?scope=all
- Auth: required
- Effect: revokes all sessions including current session.

## Revoke a specific session
- Method: DELETE
- Route: /api/auth/sessions/:id
- Auth: required
- Effect: revokes a session only when owned by the authenticated user.

## Notes
- All revocation operations are ownership-scoped by userId in the database layer.
- Current-session detection uses standard NextAuth session cookies:
  - next-auth.session-token
  - __Secure-next-auth.session-token
  - authjs.session-token
  - __Secure-authjs.session-token
