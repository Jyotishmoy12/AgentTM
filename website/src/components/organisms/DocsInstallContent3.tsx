import { platforms } from '../../content';
import { CodeBlock } from '../molecules/CodeBlock';

export function DocsInstallContent3() {
  return (
    <>
      <h3>One binary. A local browser dashboard.</h3>
      <p>
        Choose your platform’s CLI archive from the release Assets. The compiled React dashboard is
        embedded in the executable.
      </p>
      <ol className="prose-steps">
        <li>
          Download one matching CLI archive, its platform installer, and <code>SHA256SUMS</code>{' '}
          from the same release.
        </li>
        <li>
          Verify the checksum and follow the platform guide. Do not use the CLI installer with a
          desktop ZIP.
        </li>
        <li>Open a fresh terminal after changing PATH, then check your installation.</li>
      </ol>
      <CodeBlock command="agenttm version" />
      <CodeBlock command="agenttm doctor" />
      <p>
        <code>doctor</code> checks project storage; run it inside an initialized Git project.
      </p>
      <div className="platform-guides">
        {Object.entries(platforms).map(([key, value]) => (
          <a href={value.href} key={key}>
            {value.label} guide <span aria-hidden="true">↗</span>
          </a>
        ))}
      </div>
    </>
  );
}
