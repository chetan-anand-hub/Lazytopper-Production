import { toBlob } from 'html-to-image';

export type ShareResult = {
  ok: boolean;
  method: 'native-share' | 'clipboard' | 'download' | 'none';
  error?: string;
};

export type ShareNodeOptions = {
  fileName: string;
  title?: string;
  text?: string;
};

const DEFAULT_TITLE = 'Weekly Wrapped';
const DEFAULT_TEXT = 'My LazyTopper Weekly Wrapped';

export async function shareNodeAsImage(
  node: HTMLElement | null,
  opts: ShareNodeOptions
): Promise<ShareResult> {
  if (!node) {
    return { ok: false, method: 'none', error: 'capture node missing' };
  }

  try {
    const blob = await toBlob(node, {
      cacheBust: true,
      pixelRatio: 2,
    });

    if (!blob) {
      return { ok: false, method: 'none', error: 'could not generate image' };
    }

    const file = new File([blob], opts.fileName, { type: 'image/png' });

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        const canShare =
          typeof navigator.canShare === 'function'
            ? navigator.canShare({ files: [file] })
            : true;

        if (canShare) {
          await navigator.share({
            files: [file],
            title: opts.title ?? DEFAULT_TITLE,
            text: opts.text ?? DEFAULT_TEXT,
          });
          return { ok: true, method: 'native-share' };
        }
      } catch {
        // continue to next fallback
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      const ClipboardItemCtor = typeof window !== 'undefined' ? (window as any).ClipboardItem : undefined;
      if (ClipboardItemCtor) {
        try {
          await navigator.clipboard.write([new ClipboardItemCtor({ 'image/png': blob })]);
          return { ok: true, method: 'clipboard' };
        } catch {
          // fallback to download
        }
      }
    }

    const url = URL.createObjectURL(blob);
    try {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = opts.fileName;
      anchor.rel = 'noopener';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      return { ok: true, method: 'download' };
    } catch {
      return { ok: false, method: 'none', error: 'download failed' };
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    return {
      ok: false,
      method: 'none',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
