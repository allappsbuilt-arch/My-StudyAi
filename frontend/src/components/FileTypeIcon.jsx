/** Icon tile for a material's file type. */
import { FileText, FileVideo, FileImage, File } from 'lucide-react';

const MAP = {
  pdf: { icon: FileText, style: { background: 'var(--danger-soft)', color: 'var(--danger)' }, label: 'PDF' },
  video: { icon: FileVideo, style: { background: 'var(--warning-soft)', color: 'var(--warning)' }, label: 'Video' },
  image: { icon: FileImage, style: { background: 'var(--success-soft)', color: 'var(--success)' }, label: 'Image' },
  document: { icon: File, style: {}, label: 'Document' },
};

export function fileTypeLabel(type) {
  return MAP[type]?.label || 'File';
}

export default function FileTypeIcon({ type, size = 'md' }) {
  const entry = MAP[type] || MAP.document;
  const Icon = entry.icon;
  return (
    <div className={`icon-tile ${size === 'sm' ? 'sm' : ''}`} style={entry.style} aria-hidden="true">
      <Icon size={size === 'sm' ? 18 : 22} />
    </div>
  );
}
