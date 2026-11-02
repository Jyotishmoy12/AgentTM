# Desktop onboarding preview (Windows)

Launch from an initialized AgentTM repository. The native desktop preview opens
that repository; project selection before startup and installer integration are
not implemented yet.

To build and run from source:

```powershell
cd C:\dev\AgentTM
.\scripts\desktop.ps1
```

The first launch shows five steps: Welcome, Your workspace, Install Codex,
Sign in & verify, and First recording. The header's **Setup guide** button
reopens the guide. **Explore history for now** dismisses it without requiring
Codex. Finishing setup records a local preference; a later failed startup check
reopens the guide.

The native bridge checks executable discovery, version/JSON capability, and
`codex login status`. It discards raw diagnostic output. These checks do not
confirm model access or network connectivity. Installation and login commands
are copied for users to run themselves, never executed by the guide.

Installing Codex or changing PATH may require fully closing AgentTM and opening
it from a fresh terminal. **Check again** can observe login changes, but cannot
refresh the environment inherited by an already running process.

Installation/sign-in guidance follows the [official Codex CLI guide](https://developers.openai.com/codex/cli)
and [authentication documentation](https://developers.openai.com/codex/auth).
