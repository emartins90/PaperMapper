# Source List Feature Specification

## Overview

The **Source List** is a left side panel that displays a searchable, filterable list of all **citations** referenced in the current project's source cards. For each citation, users can see and interact with all associated source cards. The panel supports searching, tag and credibility filtering via a filter popover, in-place citation editing, and citation deletion with options for handling associated source cards.

---

## User Stories

- **As a user**, I want to see all citations referenced in my project, so I can quickly review and manage my sources.
- **As a user**, I want to search and filter citations by text, tags (from associated source cards), and credibility.
- **As a user**, I want to see which source cards are linked to each citation, and open/focus them from the list.
- **As a user**, I want to edit a citation's text and credibility, and have the changes reflected in all associated source cards.
- **As a user**, I want to delete citations with options to either delete just the citation or delete all associated source cards.
- **As a user**, I want the Source List's search and filter UI to match the Card List panel for consistency.

---

## UI/UX

### Entry Point

- The "Source List" button in the ProjectNav opens the Source List as a **left side panel**.
- Only one left side panel (Source List or Card List) can be open at a time.

### Layout

- **Header:** "Source List" title, close button (top right of the panel).
- **Search and Filter Bar:** 
  - Text input for searching by citation text, tags (from source cards), or credibility
  - Filter button with badge showing number of active filters
  - Filter popover (similar to Card List panel) containing:
    - Tag filter section with AND/OR toggle
    - Credibility filter section
    - Clear all filters button
- **Citation List:** Scrollable list of citation entries, each showing:
  - **Citation text** (editable inline; edit icon or click-to-edit)
  - **Credibility** (editable inline; dropdown or combobox)
  - **Tags:** Show all unique tags from associated source cards (as chips/badges)
  - **Linked Source Cards:** Show as badges displaying only the **source function** (e.g., "Background", "Evidence", "Counter-argument"). Should looks similar to the badges displaying uploaded files on source cards. 
    - Clicking a badge:
      - Opens the source card in the right side panel
      - Focuses/highlights the card on the canvas
  - **Actions:** Edit and Delete buttons/icons for each citation
- **Empty State:** If no citations, show a friendly message and a call-to-action to add a new source.

### Behavior

- **Search:** Filters citations by text, tags, or credibility (search bar matches any).
    - Search and filter UI is modeled after Card List Panel 
- **Filter Popover:**
  - Opens when clicking the filter button
  - Contains tag filter with AND/OR logic toggle
  - Contains credibility filter (multi-select)
  - Shows active filter count as badge on filter button
  - "Clear all filters" button to reset all filters
  - Closes when clicking outside or selecting filters
- **Tag Filter:** Filters citations to only those with at least one associated source card containing the selected tag(s).
- **Credibility Filter:** Filters citations to only those with at least one associated source card with the selected credibility.
- **Edit Citation:** 
  - Inline editing for citation text (e.g., click pencil icon or double-click citation text)
  - Dropdown/combobox for credibility selection
  - On save:
    - Updates the citation in the backend.
    - Updates all associated source cards in the frontend (and backend).
    - Shows a loading/saving indicator and error handling.
- **Delete Citation:** 
  - Clicking delete button shows a confirmation modal with two options:
    - "Delete citation only" (removes citation but keeps source cards)
    - "Delete citation and all associated source cards" (removes both citation and all linked source cards)
  - Modal shows count of associated source cards that will be affected
  - Requires explicit confirmation with appropriate warning text
- **Linked Source Card Badges:** Clicking a badge:
  - Opens the source card in the right side panel.
  - Focuses/highlights the card on the canvas (scrolls to and/or visually highlights), Similar to clicking a card in the card list panel. 
- **Panel Close:** Can be closed by clicking the close button or outside the panel.
- **Responsive:** Panel is scrollable and responsive for long lists.

---

## Data & Integration

- **Data Source:**
  - List of all `Citation` objects in the current project (from backend).
  - For each citation, fetch associated `SourceMaterial` cards (source cards) that reference it.
- **Tags:** 
  - Tags are aggregated from all associated source cards for each citation.
  - Tag filter options are the union of all tags from all source cards in the project.
- **Credibility:**
  - Credibility filter options are the union of all credibility values from all source cards in the project.
  - Credibility editing updates the citation object and all associated source cards.
- **Linked Source Cards:**
  - Display only the `sourceFunction` field from each associated source card.
  - If no source function is set, show a default like "Source" or "No function".
- **Editing:**
  - Editing citation text or credibility updates the citation object in the backend.
  - All associated source cards are updated to reflect the new citation data.
  - The frontend updates all relevant source cards in state/UI.
- **Deletion:**
  - "Delete citation only": Removes the citation from the backend, source cards remain but lose their citation reference.
  - "Delete citation and all associated source cards": Removes both the citation and all linked source cards from backend and frontend.
- **Selection:**
  - Clicking a source card badge triggers a callback to:
    - Open the source card in the right side panel.
    - Focus/highlight the card on the canvas.

---

## Implementation Notes

- **Component:** `SourceListPanel` (new component, similar to `CardListPanel` but for citations).
- **Trigger:** Add `onClick` handler to the "Source List" button in `ProjectNav.tsx` to open the panel.
- **State:** Manage open/close state in the parent (likely the main project/canvas page).
- **Styling:** Match the look and feel of the Card List panel for consistency.
- **Accessibility:** Ensure keyboard navigation and ARIA roles are present.
- **Editing:** Use inline editing UI (input or textarea with save/cancel) for citation text and dropdown for credibility.
- **Modal:** Use existing modal/dialog component for delete confirmation.
- **Filter Popover:** Use the same popover component and styling as Card List panel.

---

## Example Wireframe

```
+-------------------------------------------------------------+
| [Source List]                                   [Close (X)] |
|-------------------------------------------------------------|
| [Search bar: "Search citations, tags, credibility..."] [Filter (2)] |
| [Tag chips: [tag1] [tag2] ...]                              |
|-------------------------------------------------------------|
| Citation: [Editable text field] [Edit] [Delete]             |
|   Credibility: [Dropdown: Peer-reviewed ▼]                  |
|   Tags: [Climate] [Policy]                                  |
|   Linked Sources: [Background] [Evidence] [Counter-arg]     |
|                                                             |
| Citation: ...                                               |
|   ...                                                       |
+-------------------------------------------------------------+

FILTER POPOVER:
┌─────────────────────────────────────────────────────────────┐
│ Tags                                                         │
│ [Match Any] [Match All]                                      │
│ [ ] tag1                                                     │
│ [ ] tag2                                                     │
│                                                             │
│ Credibility                                                  │
│ [ ] Peer-reviewed                                            │
│ [ ] News article                                             │
│                                                             │
│ [Clear all filters]                                          │
└─────────────────────────────────────────────────────────────┘

DELETE CONFIRMATION MODAL:
┌─────────────────────────────────────────────────────────────┐
│ Delete Citation?                                            │
│                                                             │
│ This citation is linked to 3 source cards.                 │
│                                                             │
│ [ ] Delete citation only                                    │
│ [ ] Delete citation and all associated source cards (3)    │
│                                                             │
│ [Cancel] [Delete]                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Out of Scope (for MVP)

- Bulk actions (delete multiple, export, etc.)
- Advanced sorting (beyond default order)
- Deep editing of source cards (handled in right side panel after selection)

---

**End of Spec** 