"use client"

import * as React from "react"
import { EditorContent, EditorContext, useEditor } from "@tiptap/react"
import { toast } from "sonner"

// --- Tiptap Core Extensions ---
import { StarterKit } from "@tiptap/starter-kit"
import { Highlight } from "@tiptap/extension-highlight"
import { Placeholder } from "@tiptap/extension-placeholder"

// --- UI Primitives ---
import { Button as TiptapButton } from "@/components/rich-text-editor/tiptap-ui-primitive/button"
import { Button } from "@/components/ui/button"
import { Spacer } from "@/components/rich-text-editor/tiptap-ui-primitive/spacer"
import {
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
} from "@/components/rich-text-editor/tiptap-ui-primitive/toolbar"

// --- Tiptap UI ---
import { HeadingDropdownMenu } from "@/components/rich-text-editor/tiptap-ui/heading-dropdown-menu"
import { ListDropdownMenu } from "@/components/rich-text-editor/tiptap-ui/list-dropdown-menu"
import { MarkButton } from "@/components/rich-text-editor/tiptap-ui/mark-button"
import {
  ColorHighlightPopover,
} from "@/components/rich-text-editor/tiptap-ui/color-highlight-popover"



// --- Styles ---
import "./simple-rich-text-editor.scss"

interface SimpleRichTextEditorProps {
  value: string;
  onChange: (html: string, plainText: string) => void;
  placeholder?: string;
  className?: string;
  cardType?: 'source' | 'question' | 'insight' | 'thought' | 'claim';
  onSave?: () => void;
  showSaveButton?: boolean;
}

const MainToolbarContent = ({
  editor,
}: {
  editor: any
}) => {
  return (
    <div className="flex items-center min-w-0 overflow-hidden gap-1">
      <ToolbarGroup className="flex-shrink-0">
        <HeadingDropdownMenu levels={[1, 2, 3]} portal={false} />
        <ListDropdownMenu
          types={["bulletList", "orderedList"]}
          portal={false}
        />
      </ToolbarGroup>

      <ToolbarSeparator className="flex-shrink-0" />

      <ToolbarGroup className="flex-shrink-0">
        <MarkButton type="bold" />
        <MarkButton type="italic" />
        <ColorHighlightPopover editor={editor} hideWhenUnavailable={false} onApplied={() => {}} />
      </ToolbarGroup>
    </div>
  )
}



export default function SimpleRichTextEditor({ 
  value, 
  onChange, 
  placeholder, 
  className,
  cardType = 'source',
  onSave,
  showSaveButton = false
}: SimpleRichTextEditorProps) {

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: {
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
        "aria-label": "Main content area, start typing to enter text.",
        class: "tiptap-editor",
      },
    },
    extensions: [
      StarterKit.configure({
        horizontalRule: false,
        link: false,
        codeBlock: false,
        blockquote: false,
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({
        placeholder: placeholder || 'Start typing...',
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const plainText = editor.getText();
      onChange(html, plainText);
    },
  })

  // Update editor content when value prop changes
  React.useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [editor, value])

  if (!editor) {
    return null
  }

  return (
    <div className={`border border-gray-300 rounded-md overflow-hidden w-full max-w-full flex flex-col min-h-[200px] max-h-[500px] ${className || ''}`}>
      <EditorContext.Provider value={{ editor }}>
        <Toolbar variant="fixed" className={`border-b border-gray-200 bg-gray-50 p-1 sm:p-2 card-type-${cardType} w-full max-w-full flex-shrink-0`}>
          <div className="flex items-center w-full max-w-full">
            <div className="flex items-center min-w-0 flex-1 overflow-hidden max-w-full">
              <MainToolbarContent editor={editor} />
            </div>
            {showSaveButton && onSave && (
              <Button
                onClick={() => {
                  onSave();
                  toast.success("Your changes have been saved!");
                }}
                className="ml-2 flex-shrink-0"
                size="sm"
              >
                Save
              </Button>
            )}
          </div>  
        </Toolbar>

        <div 
          className="flex-1 overflow-y-auto p-3"
          onClick={() => editor.commands.focus()}
          style={{ cursor: 'text' }}
        >
          <EditorContent
            editor={editor}
            role="presentation"
            className="prose prose-sm max-w-none focus:outline-none h-full"
          />
        </div>
      </EditorContext.Provider>
    </div>
  )
} 