import { Sparkles, TriangleAlert } from 'lucide-react';
import type { BuffNotice as Notice } from '../lib/arcade';

export default function BuffNotice({ notice }: { notice?: Notice | null }) {
  if (!notice) return null;
  const Icon = notice.tone === 'good' ? Sparkles : TriangleAlert;
  return (
    <div key={`${notice.id}-${notice.serial}`} className="buff-feedback">
      <i className={`buff-aura ${notice.tone}`} aria-hidden="true" />
      <div className={`buff-notice ${notice.tone}`} role="status">
        <Icon size={17} />
        <span>{notice.label}</span>
      </div>
    </div>
  );
}
