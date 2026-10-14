import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useState, useEffect, useRef } from 'react';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  onUploadImage?: (file: File, alt: string) => Promise<string>;
}

const TOOLBAR_BTN = 'px-2 py-1 text-sm rounded hover:bg-surfaceAlt border border-transparent hover:border-line disabled:opacity-40 disabled:cursor-not-allowed';
const ACTIVE_BTN = 'bg-primary/10 border-primary/30 text-primary';

export function RichTextEditor({ value, onChange, placeholder = 'Write your content here…', minHeight = '320px', onUploadImage }: Props) {
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [imgUrl, setImgUrl] = useState('');
  const [imgAlt, setImgAlt] = useState('');
  const [showImgInput, setShowImgInput] = useState(false);
  const [imageUploadError, setImageUploadError] = useState('');
  const imageFileRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
      Image.configure({ inline: false, allowBase64: false }),
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none px-4 py-3',
        style: `min-height: ${minHeight}`,
      },
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '');
    }
  }, [value, editor]);

  if (!editor) return null;

  const addLink = () => {
    if (!linkUrl) return;
    editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
    setLinkUrl('');
    setShowLinkInput(false);
  };

  const addImage = () => {
    if (!imgUrl || !imgAlt.trim()) return;
    editor.chain().focus().setImage({ src: imgUrl, alt: imgAlt.trim() }).run();
    setImgUrl('');
    setImgAlt('');
    setShowImgInput(false);
  };

  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !onUploadImage || !imgAlt.trim()) return;
    setImageUploadError('');
    try {
      const src = await onUploadImage(file, imgAlt.trim());
      editor.chain().focus().setImage({ src, alt: imgAlt.trim() }).run();
      setImgAlt('');
    } catch {
      setImageUploadError('Image upload failed. Please try again.');
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div className="border border-line rounded-lg overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 px-3 py-2 border-b border-line bg-surfaceAlt">
        <button type="button" className={`${TOOLBAR_BTN} font-bold ${editor.isActive('bold') ? ACTIVE_BTN : ''}`} onClick={() => editor.chain().focus().toggleBold().run()}>B</button>
        <button type="button" className={`${TOOLBAR_BTN} italic ${editor.isActive('italic') ? ACTIVE_BTN : ''}`} onClick={() => editor.chain().focus().toggleItalic().run()}>I</button>
        <button type="button" className={`${TOOLBAR_BTN} line-through ${editor.isActive('strike') ? ACTIVE_BTN : ''}`} onClick={() => editor.chain().focus().toggleStrike().run()}>S</button>
        <span className="w-px h-5 bg-line mx-1" />
        {([2, 3, 4] as const).map((level) => (
          <button key={level} type="button" className={`${TOOLBAR_BTN} text-xs font-bold ${editor.isActive('heading', { level }) ? ACTIVE_BTN : ''}`} onClick={() => editor.chain().focus().toggleHeading({ level }).run()}>H{level}</button>
        ))}
        <button type="button" className={`${TOOLBAR_BTN} text-xs ${editor.isActive('paragraph') ? ACTIVE_BTN : ''}`} onClick={() => editor.chain().focus().setParagraph().run()}>P</button>
        <span className="w-px h-5 bg-line mx-1" />
        <button type="button" className={`${TOOLBAR_BTN} text-xs ${editor.isActive('bulletList') ? ACTIVE_BTN : ''}`} onClick={() => editor.chain().focus().toggleBulletList().run()}>• List</button>
        <button type="button" className={`${TOOLBAR_BTN} text-xs ${editor.isActive('orderedList') ? ACTIVE_BTN : ''}`} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. List</button>
        <button type="button" className={`${TOOLBAR_BTN} text-xs ${editor.isActive('blockquote') ? ACTIVE_BTN : ''}`} onClick={() => editor.chain().focus().toggleBlockquote().run()}>" Quote</button>
        <button type="button" className={`${TOOLBAR_BTN} text-xs ${editor.isActive('code') ? ACTIVE_BTN : ''}`} title="Inline code" onClick={() => editor.chain().focus().toggleCode().run()}>Code</button>
        <button type="button" className={`${TOOLBAR_BTN} text-xs ${editor.isActive('codeBlock') ? ACTIVE_BTN : ''}`} title="Code block" onClick={() => editor.chain().focus().toggleCodeBlock().run()}>&lt;/&gt;</button>
        <button type="button" className={TOOLBAR_BTN} title="Horizontal rule" onClick={() => editor.chain().focus().setHorizontalRule().run()}>—</button>
        <span className="w-px h-5 bg-line mx-1" />
        {/* Link */}
        <button type="button" className={`${TOOLBAR_BTN} text-xs ${editor.isActive('link') ? ACTIVE_BTN : ''}`} onClick={() => { setShowLinkInput((v) => !v); setShowImgInput(false); }}>🔗 Link</button>
        {editor.isActive('link') && (
          <button type="button" className={`${TOOLBAR_BTN} text-xs text-danger`} onClick={() => editor.chain().focus().unsetLink().run()}>Remove link</button>
        )}
        <button type="button" className={`${TOOLBAR_BTN} text-xs`} title="Add image" onClick={() => { setShowImgInput((v) => !v); setShowLinkInput(false); }}>🖼 Image</button>
        <span className="w-px h-5 bg-line mx-1" />
        <button type="button" className={TOOLBAR_BTN} onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>↩</button>
        <button type="button" className={TOOLBAR_BTN} onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>↪</button>
      </div>

      {/* Link input */}
      {showLinkInput && (
        <div className="flex gap-2 px-3 py-2 border-b border-line bg-surfaceAlt">
          <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://example.com (for backlinks: use external domain)" className="input flex-1 text-sm" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLink())} />
          <button type="button" className="btn btn-primary text-sm px-3 py-1.5 rounded" onClick={addLink}>Apply</button>
          <button type="button" className="btn text-sm px-3 py-1.5 rounded text-ink-muted" onClick={() => setShowLinkInput(false)}>Cancel</button>
        </div>
      )}

      {/* Image input */}
      {showImgInput && (
        <div className="flex flex-wrap gap-2 px-3 py-2 border-b border-line bg-surfaceAlt">
          {onUploadImage && <input ref={imageFileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={uploadImage} />}
          <input value={imgUrl} onChange={(e) => setImgUrl(e.target.value)} placeholder="Image URL (optional)" className="input flex-1 min-w-48 text-sm" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addImage())} />
          <input value={imgAlt} onChange={(e) => setImgAlt(e.target.value)} placeholder="Image alt text (required)" className="input flex-1 min-w-48 text-sm" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addImage())} />
          {onUploadImage && <button type="button" className="btn btn-secondary text-sm px-3 py-1.5 rounded" disabled={!imgAlt.trim()} onClick={() => imageFileRef.current?.click()}>Upload file</button>}
          <button type="button" className="btn btn-primary text-sm px-3 py-1.5 rounded" disabled={!imgUrl || !imgAlt.trim()} onClick={addImage}>Insert URL</button>
          <button type="button" className="btn text-sm px-3 py-1.5 rounded text-ink-muted" onClick={() => setShowImgInput(false)}>Cancel</button>
        </div>
      )}

      {imageUploadError && <p className="px-3 py-2 text-xs text-danger border-b border-line">{imageUploadError}</p>}

      {/* Editor content */}
      <EditorContent editor={editor} />

    </div>
  );
}
