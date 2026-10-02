import creditsMd from '../../CREDITS.md?raw';
import { Modal } from './overlays';

/** Privacy policy and terms live as static pages (public/*.html) so the web and the app show the same text. */
export function LegalPage({ page, onClose }: { page: 'privacy' | 'terms'; onClose: () => void }) {
  const file = page === 'privacy' ? './privacy.html' : './terms.html';
  const title = page === 'privacy' ? 'Privacy policy' : 'Terms of use';
  return (
    <Modal label={title} onClose={onClose} className="drawer legal">
      <h2>{title}</h2>
      <iframe className="legal-frame" src={file} title={title} />
      <p className="small">
        <a href={file} target="_blank" rel="noopener noreferrer">
          Open in a new tab
        </a>
      </p>
    </Modal>
  );
}

/** A small Markdown subset (headings, paragraphs, tables, bold, code, bare links) for CREDITS.md. */
function inline(text: string) {
  const parts: (string | JSX.Element)[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|https?:\/\/[^\s)|]+)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const t = m[0];
    if (t.startsWith('**')) parts.push(<b key={k++}>{t.slice(2, -2)}</b>);
    else if (t.startsWith('`')) parts.push(<code key={k++}>{t.slice(1, -1)}</code>);
    else
      parts.push(
        <a key={k++} href={t} target="_blank" rel="noopener noreferrer">
          {t.replace(/^https?:\/\//, '')}
        </a>,
      );
    last = m.index + t.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function renderMarkdown(md: string) {
  const out: JSX.Element[] = [];
  const lines = md.split('\n');
  let i = 0;
  let k = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('# ')) out.push(<h2 key={k++}>{line.slice(2)}</h2>);
    else if (line.startsWith('## ')) out.push(<h3 key={k++}>{line.slice(3)}</h3>);
    else if (line.startsWith('|')) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        const cells = lines[i].slice(1, -1).split('|').map((c) => c.trim());
        if (!cells.every((c) => /^-+$/.test(c))) rows.push(cells);
        i++;
      }
      const [head, ...body] = rows;
      out.push(
        <table key={k++} className="credits-table">
          <thead>
            <tr>
              {head.map((c, j) => (
                <th key={j}>{inline(c)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((r, j) => (
              <tr key={j}>
                {r.map((c, jj) => (
                  <td key={jj}>{inline(c)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>,
      );
      continue;
    } else if (line.trim()) out.push(<p key={k++}>{inline(line)}</p>);
    i++;
  }
  return out;
}

export function CreditsPage({ onClose }: { onClose: () => void }) {
  return (
    <Modal label="Credits" onClose={onClose} className="drawer legal">
      <div className="credits">{renderMarkdown(creditsMd)}</div>
    </Modal>
  );
}
