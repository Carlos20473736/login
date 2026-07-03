# Bug Fix Notes

## Login Bug - Root Cause
The `sdk.createSessionToken(openId)` was called WITHOUT passing a `name` option.
The SDK's `signSession` puts `name: options.name || ""` into the JWT payload.
Then `verifySession` checks `isNonEmptyString(name)` which requires name.length > 0.
Since name was empty string "", verification always failed with "Session payload missing required fields".

## Fix Applied
Pass `{ name: user.name || user.email || 'User' }` as second argument to `sdk.createSessionToken()` in both login and register mutations.

## Cookie Issue
Also added `app.set('trust proxy', 1)` in server/_core/index.ts so that `req.protocol` correctly reports "https" behind the Manus proxy, allowing `secure: true` cookies to be set properly.

## Verified
- Register creates user, sets cookie, auth.me returns user ✓
- Login sets cookie, auth.me returns user ✓
- The issue was the empty `name` field in JWT, not the cookie transport
