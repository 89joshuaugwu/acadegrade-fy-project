# UI preview (dev only)

Lets us design and screenshot the signed-in student and admin screens without an account and without touching the backend.

## Start

```powershell
$env:AG_UI_PREVIEW='1'; npm.cmd run dev
```

Or keep your usual `npm.cmd run dev` and create an empty `.ag-ui-preview` file in the project root (git-ignored); Next restarts itself when `next.config.ts` changes, so touch that file too if the server is already running. Delete `.ag-ui-preview` to turn it off.

Without the variable or the file (and in every `next build`) nothing here is bundled: `next.config.ts` only adds the hook in dev when one of them is present.

## Use

Open any signed-in page with `?ag-preview=student` or `?ag-preview=admin`, for example:

- http://localhost:3000/dashboard?ag-preview=student
- http://localhost:3000/admin/dashboard?ag-preview=admin

The choice is kept in a cookie for that browser. `?ag-preview=off` leaves preview mode. Public pages are unaffected unless the cookie is set.

## How it works

- `next.config.ts` swaps `firebase/auth`, `firebase/firestore`, `firebase/database` and `firebase/messaging` for `preview/mocks/*`.
- Each mock calls the real SDK unless the browser opted in (`preview/runtime.ts`). Then:
  - auth: a signed-in fake student (`preview-student`) or admin (`preview-admin`);
  - Firestore: an in-memory store seeded from `preview/fixtures/firestore.ts` (writes change memory only and update listeners);
  - `/api/*` fetches: answered from `preview/fixtures/api/*` in the browser (`preview/fetch-shim.ts`). Nothing reaches the server. Unknown GETs return 404 and log `[ag-preview] no fixture for GET …` in the console; unknown writes return `{ ok: true }`.
- Server components still render normally on the server.

## Adding fixtures

Read the real route under `app/api/...` and return the same JSON shape. Admin endpoints go in `preview/fixtures/api/admin.ts`, student endpoints in `student.ts`. Keep sample data realistic (Nigerian names, real course codes, numbers that add up) and never use real student data.
