# Public repository and proprietary terms

AgentTM's implementation repository remains public at
https://github.com/Jyotishmoy12/AgentTM . Public visibility is separate from
open-source licensing. Original AgentTM code is proprietary under
[LICENSE](../LICENSE), with ownership information in [NOTICE](../NOTICE).

## Permissions and limits

- Official binaries may be used for personal and internal business purposes;
  installation and backup copies are permitted.
- General original source reuse, modification, redistribution, resale, and
  third-party hosted services require separate written permission, except where
  applicable law, GitHub's terms, or existing grants permit them.
- GitHub users can view and fork a public repository under its platform terms.
  A proprietary notice does not cancel those rights or make exposed code
  technically impossible to copy. See [GitHub licensing guidance](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository).
- Source files, history, and GitHub's automatically generated source archives
  remain publicly accessible. There is no private-source/public-download split.
- Third-party components keep their own licenses. These terms do not claim
  ownership of dependencies, outside contributions, user files, or agent outputs,
  and do not retroactively revoke prior grants.

The prepared proprietary terms should receive legal review before commercial
publication. They are not a guarantee against copying or a claim that all code
and dependencies belong exclusively to one owner.

## Releases

The existing manual release workflow continues to publish to the same public
repository after native validation. It uses the repository GitHub token; no
separate public repository, migration, or cross-repository token is required.
Application archives now include LICENSE, NOTICE, and THIRD_PARTY_NOTICES.txt.
The compiled React dashboard is still embedded in the executable and its
JavaScript is inspectable in the browser or desktop WebView.

Historical published archives are not silently changed. New terms in local
packages do not retroactively replace the contents of v0.1.0/v0.3.0 assets.

## Feedback and contributions

Use public issues for bug reports and feature requests, with sanitized examples.
Do not submit original implementation changes without first agreeing on written
contribution and usage terms with the owner. GitHub fork functionality alone is
not a general license to commercialize or redistribute the implementation.
