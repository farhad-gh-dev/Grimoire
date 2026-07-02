import { useFocusTrap } from './useFocusTrap';

interface Props {
  onAck: () => void;
}

export function PrivacyNotice({ onAck }: Props) {
  const ref = useFocusTrap<HTMLDivElement>();
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-title"
      className="scrim"
    >
      <div ref={ref} className="dialog max-w-lg">
        <h2 id="privacy-title" className="text-md text-text-primary mb-3">Where your prompts live</h2>
        <ul className="text-sm text-text-secondary space-y-2 list-disc pl-5 mb-5 marker:text-text-muted">
          <li>Prompts and collections are stored only in this browser. Clearing site data deletes them.</li>
          <li>Nothing is ever uploaded — there is no server component at all.</li>
          <li>No accounts, no tracking, no third-party analytics.</li>
          <li>Use <span className="text-text-primary">Settings → Export</span> to back up your library to a JSON file.</li>
        </ul>
        <div className="flex justify-end">
          <button onClick={onAck} className="btn-primary" autoFocus>Got it</button>
        </div>
      </div>
    </div>
  );
}
