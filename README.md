# vinext-starter

A clean full-stack starter running on
[vinext](https://github.com/cloudflare/vinext), with optional Cloudflare D1 and
Drizzle support.

## Prerequisites

- Node.js `>=22.13.0`

## Quick Start

```bash
npm install
npm run dev
npm run build
```

## Static production deployment

The production site is exported as static files for
`https://chemistry-wow.com/worldline-detector/`. Build and validate the
deployable package with:

```bash
nvm use
npm run deploy:static
```

The reusable build script writes the site to `dist/client`, checks that the
HTML does not contain the Vite development client, and verifies that generated
JS, CSS, image, and font URLs map to files in that directory. Nginx serves this
directory directly; no Node production process or `npm start` command is
required.

### Serving under another path

The build targets `/worldline-detector/` by default. To serve the same site
under another prefix, set `WORLDLINE_BASE_PATH` for the build and map that
prefix onto `dist/client`:

```bash
WORLDLINE_BASE_PATH=/p/worldline/ npm run build
```

Script, stylesheet, font, and image URLs then start with that prefix and carry
no origin. The value needs a leading slash; the trailing slash is optional.
Leaving it unset (or empty) produces the default production package unchanged.
The social preview image in the page metadata keeps pointing at
`https://chemistry-wow.com/worldline-detector/og.png` either way.

This starter does not use `wrangler.jsonc`.

## Desktop wallpaper mode

Appending `?wallpaper=1` (or `#wallpaper`) strips the page down to the device
filling the screen, so a wallpaper host can point straight at the deployed URL:

```
https://chemistry-wow.com/worldline-detector/?wallpaper=1
```

- macOS: [Plash](https://github.com/sindresorhus/Plash) — add the URL as a website.
- Windows: [Lively Wallpaper](https://github.com/rocksdanister/lively) or
  Wallpaper Engine — add the URL as a web wallpaper.

Because the scene then renders all day it drops to 30fps, requests the low-power
GPU, caps its pixel ratio at 1.5, and refreshes shadows only once the device has
visibly turned. A wallpaper never sees a cursor for most of the day, so an
untouched device sways on its own; hosts that forward the desktop cursor take
over the tilt again. The host app is also the only thing that can pause the
scene while it is covered, so enable its own "pause when occluded" setting.

## Included Shape

- edit site code under `app/`
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `db/schema.ts` starts intentionally empty
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Workspace Auth Headers

Signed-in visitors receive both `oai-authenticated-user-id` and `oai-authenticated-user-email`. Private Sites require every visitor to sign in; public Sites may also have anonymous visitors, for whom neither header is present.

The user ID is stable for the same user on the same Site and different across Sites. Email and name are intended for display or contact purposes.

SIWC-authenticated workspace sites may also receive
`oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty
`name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by
`oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const userId = requestHeaders.get("oai-authenticated-user-id");
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs
optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send
  anonymous visitors through Sign in with ChatGPT.
- Use `chatGPTSignInPath(returnTo)` and `chatGPTSignOutPath(returnTo)` for
  browser links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in
  or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because
  they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the
OAuth cookies, and identity header injection. Do not implement app routes for
those reserved paths. Routes that do not import and call the helper remain
anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the
Sites hosting platform's access policy controls for workspace-wide restrictions,
or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write
actions tied to the current ChatGPT user. Leave public content anonymous.

## Useful Commands

- `npm run dev`: start local development
- `npm run build`: create and validate the static production package
- `npm run deploy:static`: rebuild the Nginx-served static package
- `npm test`: build the starter and verify its rendered loading skeleton
- `npm run db:generate`: generate Drizzle migrations after schema changes

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
