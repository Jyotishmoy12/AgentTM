import { GuideLink } from '../molecules/GuideLink';
import { Note } from '../molecules/Note';
import { Step } from '../molecules/Step';

export function DocsContentContent6() {
  return (
    <>
      <p className="doc-lead">
        A session is one managed recording. Events describe received activity; checkpoints contain
        captured workspace states. They are related, but are not the same thing.
      </p>
      <Step number={1} title="Choose a session in History">
        <p>
          Select the recording you want. Follow the timeline to find prompts, reported tool
          activity, failures, and captured workspace milestones. Longer loaded histories can show
          activity bars based on real event timestamps; click a populated bar to jump to that
          segment.
        </p>
      </Step>
      <Step number={2} title="Inspect a captured state">
        <p>
          Choose <strong>Inspect checkpoint</strong> on a milestone. In the Explorer, search for a
          captured file and select it. The code viewer is read-only. An event without a checkpoint
          does not create a new file state.
        </p>
        <img
          className="doc-product-image"
          src={`${import.meta.env.BASE_URL}images/explorer-detail.png`}
          alt="Current read-only Checkpoint Explorer in a disposable demo project"
          loading="lazy"
        />
      </Step>
      <Step number={3} title="Compare supported changes">
        <p>
          Open <strong>Changes</strong> to compare the selected checkpoint with its recorded parent.
          Use inline or split views where supported. Technical IDs and capture metadata are
          available through <strong>Details</strong>.
        </p>
        <Note caution>
          A partial capture omitted some paths. Open the omissions list before assuming a file was
          saved. Workspace scans are observations, not necessarily atomic snapshots or proof that a
          particular agent action caused each line change.
        </Note>
      </Step>
      <GuideLink topic="restore">Next: restore a checkpoint safely</GuideLink>
    </>
  );
}
