"use client"

import * as React from "react"

// --- Lib ---
import { parseShortcutKeys } from "@/components/rich-text-editor/tiptap-utils"

// --- Hooks ---
import { useTiptapEditor } from "@/components/rich-text-editor/use-tiptap-editor"

// --- Tiptap UI ---
import type { Mark, UseMarkConfig } from "@/components/rich-text-editor/tiptap-ui/mark-button"
import { MARK_SHORTCUT_KEYS, useMark } from "@/components/rich-text-editor/tiptap-ui/mark-button"

// --- UI Primitives ---
import type { ButtonProps } from "@/components/rich-text-editor/tiptap-ui-primitive/button"
import { Button } from "@/components/rich-text-editor/tiptap-ui-primitive/button"
// Badge import removed - not used in our simple editor

export interface MarkButtonProps
  extends Omit<ButtonProps, "type">,
    UseMarkConfig {
  /**
   * Optional text to display alongside the icon.
   */
  text?: string
  /**
   * Optional show shortcut keys in the button.
   * @default false
   */
  showShortcut?: boolean
}

// MarkShortcutBadge removed - not used in our simple editor

/**
 * Button component for toggling marks in a Tiptap editor.
 *
 * For custom button implementations, use the `useMark` hook instead.
 */
export const MarkButton = React.forwardRef<HTMLButtonElement, MarkButtonProps>(
  (
    {
      editor: providedEditor,
      type,
      text,
      hideWhenUnavailable = false,
      onToggled,
      showShortcut = false,
      onClick,
      children,
      ...buttonProps
    },
    ref
  ) => {
    const { editor } = useTiptapEditor(providedEditor)
    const {
      isVisible,
      handleMark,
      label,
      canToggle,
      isActive,
      Icon,
      shortcutKeys,
    } = useMark({
      editor,
      type,
      hideWhenUnavailable,
      onToggled,
    })

    const handleClick = React.useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event)
        if (event.defaultPrevented) return
        handleMark()
      },
      [handleMark, onClick]
    )

    if (!isVisible) {
      return null
    }

    return (
      <Button
        type="button"
        disabled={!canToggle}
        data-style="ghost"
        data-active-state={isActive ? "on" : "off"}
        data-disabled={!canToggle}
        role="button"
        tabIndex={-1}
        aria-label={label}
        aria-pressed={isActive}
        tooltip={label}
        onClick={handleClick}
        {...buttonProps}
        ref={ref}
      >
        {children ?? (
          <>
            <Icon className="tiptap-button-icon" />
            {text && <span className="tiptap-button-text">{text}</span>}
            {/* Shortcut badge removed - not used in our simple editor */}
          </>
        )}
      </Button>
    )
  }
)

MarkButton.displayName = "MarkButton"
