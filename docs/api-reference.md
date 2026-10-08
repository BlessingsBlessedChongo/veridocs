# API Reference

Protected routes require `Authorization: Bearer <supabase-access-token>` unless noted otherwise.

| Method | Route | Access |
|---|---|---|
| `POST` | `/api/institutions/register` | Authenticated |
| `GET` | `/api/institutions/:institutionId` | Institution member |
| `POST` | `/api/institutions/:institutionId/members/invite` | Admin |
| `POST` | `/api/institutions/:institutionId/members/accept` | Authenticated invitee |
| `DELETE` | `/api/institutions/:institutionId/members/:userId` | Admin |
| `POST` | `/api/documents/sign` | Admin or issuer |
| `POST` | `/api/documents/:documentId/revoke` | Admin or issuer |
| `GET` | `/api/documents/verify/:documentId` | Public |
| `POST` | `/api/documents/verify-upload` | Public |
| `POST` | `/api/key-pairs/:keyPairId/rotate` | Admin |

Errors use `{ "success": false, "error": { "code": "...", "message": "..." } }`.