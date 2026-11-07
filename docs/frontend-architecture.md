# Frontend architecture

Both `web/src` (desktop and browser dashboard) and `website/src` (public site
and documentation) use Atomic Design for UI composition:

| Directory | Responsibility | Examples |
| --- | --- | --- |
| `components/atoms` | Small visual primitives | Icons, badges, buttons |
| `components/molecules` | Small combinations of primitives | Code blocks, model picker, guide steps |
| `components/organisms` | Complete interface sections | Sidebar, conversation composer, history timeline |
| `components/templates` | Page structure and composition | Dashboard shell, workspace, marketing layout |
| `pages` | Page-specific composition and state wiring | Overview, Chat, History, public home, documentation |
| `hooks` | Stateful workflows and lifecycle cleanup | History polling, chat continuation, transcript scrolling |
| `handlers` | HTTP, native bridge, and clipboard access | Sessions, checkpoints, restoration, desktop actions |
| `types`, `data`, `utils` | Contracts, static content, and pure helpers | Event types, navigation, date formatting |
| `styles` | Ordered, focused stylesheet modules | Overview, chat, history, documentation |

Atoms and molecules must not import organisms, templates, or pages. Components
reuse existing application workflows; this organization does not change API
contracts or recording semantics. UI state stays in React hooks. HTTP handlers
retain same-origin credentials, cancellation signals, pagination, and CSRF
headers. Native calls preserve capability checks and method receiver binding.
The public website has no application API: its clipboard handler wraps browser
clipboard access.

Existing flat component paths remain as compatibility exports. New code should
import the atomic module directly. The original CSS entry paths import ordered
chunks from `styles`; their order preserves the cascade. Keep global stylesheet
imports in the entry modules, rather than copying them into individual components.

Maintained frontend source, configuration, scripts, and tests have a maximum of
200 lines per file. Dependency lockfiles, generated builds, reports, and binary
assets are excluded. Shared test fixtures keep browser specifications focused.

Run these commands separately in `web`:

```powershell
npm ci
npm run check:architecture
npm run lint
npm run format:check
npm test
npm run build
npm run test:e2e
```

The dashboard browser suite needs a Go-built CLI containing the current UI.
Build it after `npm run build`, from the repository root:

```powershell
go build -o bin/frontend-refactor/agenttm.exe ./cmd/agenttm
```

Then, in the same PowerShell window, point the browser suite at that isolated
binary and run the tests from `web`:

```powershell
$env:AGENTTM_E2E_BINARY = 'C:\dev\AgentTM\bin\frontend-refactor\agenttm.exe'
```

Use your checkout's actual absolute path. Without this environment variable,
the suite uses the existing `bin/agenttm.exe` on Windows or `bin/agenttm` on Unix.
Tests seed disposable repositories in `.test-work`.

Run these commands separately in `website`:

```powershell
npm ci
npm run check:architecture
npm run lint
npm run format:check
npm run build
npm test
```

Both browser suites use Playwright. Install its browser before running locally,
or use the supported local Chrome configuration. For the public website,
`AGENTTM_BROWSER_PATH` can select an existing Chrome executable. Dashboard tests
use Chrome locally and Playwright Chromium in CI.

Use `npm run format` in either frontend to apply Prettier. CI runs lint,
formatting verification, architecture checks, builds, and browser tests without
changing the manually triggered workflow policy.
