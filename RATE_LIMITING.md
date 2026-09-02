# AI API abuse protection

All costly AI routes now require a valid Firebase ID token and use Firestore transaction counters. The counters are stored in `_api_rate_limits` and cannot be read or written by web/mobile clients.

## Active limits

| Endpoint | Burst limit | Daily limit | Cache/special rule |
| --- | ---: | ---: | --- |
| `/api/results/extract` | 5 per 15 minutes | 20 per day | 10 MB maximum file, image/PDF only |
| `/api/ai/forecast` | 2 per hour | 8 per day | Identical input cached for 1 hour unless explicitly refreshed |
| `/api/ai/whatif` | 3 per 5 minutes | 20 per day | Only provider-backed guidance consumes quota; impossible/already-secured math does not |
| `/api/ai/insights` | 2 per hour | 3 per day | Normal requests cache for 24 hours; forced regeneration is blocked for 12 hours |

Blocked requests return HTTP `429`, a JSON `retryAfterSeconds` value, and a standard `Retry-After` header. Both web and mobile clients surface this duration to the user.

## Firebase deployment

Publish `firestore.rules` so `_api_rate_limits` remains explicitly inaccessible to clients. Firebase Admin API routes bypass these client rules.

The limiter works without a TTL policy. To keep old counter documents cleaned up automatically, enable Firestore TTL for:

```text
Collection group: _api_rate_limits
Timestamp field: expiresAt
```

No additional Vercel environment variable or paid rate-limit service is required. Firestore reads/writes from the limiter count toward normal Firebase usage.

## Further hardening

Firebase App Check is a useful second layer against scripted account creation and stolen public configuration, but it does not replace authentication or rate limiting. Enable it only after registering the production Android/iOS apps and testing enforcement in monitoring mode.
