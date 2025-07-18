# Feature Spec: Resizable Labeled Sections in React Flow Canvas

## Overview
Implement **resizable, labeled sections** on a React Flow canvas that visually group nodes without confining their movement. Users can drag nodes freely in and out of sections. Sections can be resized manually or automatically resized to fit contained nodes with a button click.

---

## Requirements

### Functional Requirements
- **Sections are draggable and resizable rectangles on the canvas.**
- Each section has a **label** on the upper left (like Figma sections).
- Sections **do not confine nodes** — nodes can be freely dragged anywhere on the canvas, including inside or outside sections.
- Users can **drag nodes to and from sections** without restrictions.
- Sections have a **"Fit" button** in the upper right represented by an icon that resizes and repositions the section to wrap all nodes within it visually inside it. 
- The fit operation has a little bit of **padding** around the contained nodes (using Tailwind CSS).
- Multiple sections can be displayed simultaneously.
- Sections must be visually distinct (e.g., border, semi-transparent background).
- Sections are **always rendered behind cards** but above the canvas background.
- **Create Section button** in bottom navigation (right of other buttons, separated by vertical divider).
- **Section creation mode**: When clicked, disable canvas panning and enable click-and-drag to create sections.
- **Section deletion**: Delete/backspace key on selected section shows modal asking to delete section only or section + all cards.
- **Section selection**: Click to select a section (visual feedback).

### Non-Functional Requirements
- Sections and nodes should render efficiently on the canvas.
- Sections must support smooth drag and resize operations.
- The UI should clearly indicate sections and their labels.
- The feature should integrate seamlessly with React Flow's existing zoom and pan functionality.
- Codebase must be maintainable and extensible for adding features like collapsible sections or multi-section membership.

---

## Design Details

### Section Representation
- Sections are **independent components** rendered on the React Flow canvas, but they must sit behind the card notes
- Use a draggable and resizable container (`react-rnd` recommended) for sections.
- Sections have absolute positioning with properties:
  - `x`, `y` — top-left coordinates on the canvas
  - `width`, `height` — dimensions
  - `label` — text shown on the section header
  - `selected` — boolean for selection state
  - Must be saved to the database under projects. Needs to include the card ids it contains

### Backend Database Schema
- New `sections` table with columns:
  - `id` (primary key)
  - `project_id` (foreign key to projects table)
  - `name` (section label)
  - `x`, `y`, `width`, `height` (positioning data)
  - `created_at`, `updated_at` timestamps
- Each card table (`claims`, `insights`, `questions`, etc.) will have a nullable `section_id` column (foreign key to `sections.id`).
  - This means a card can belong to at most one section (or none).
  - To find all cards in a section, query each card table for cards with that `section_id`.

### Node Containment Logic
- A node is considered "inside" a section if its position `(node.x, node.y)` lies within the section bounds `(section.x, section.y, section.width, section.height)`.
- This containment is **visual only**; nodes remain independent and can move freely.
- But nodes in the section will move when the section is moved.

### Fit to Content Behavior
- When the user clicks the section’s **Fit button**:
  1. Identify all nodes visually inside the section.
  2. Compute the bounding box covering those nodes.
  3. Update the section’s position and size to tightly wrap this bounding box plus configurable padding.
  4. Animate or instantly resize the section container accordingly.

### Interaction
- Nodes remain draggable via React Flow’s default drag behavior.
- Sections are draggable via the top left label and resizable via their container’s handles.
- Nodes can be dragged freely in/out of section.
- Section boundary can be dragged and resized in any direction.
- Click [Fit] - represented by an icon in the top right corner to resize section to fit nodes.
- **Section creation mode**: Click "Create Section" button → disable panning → click and drag on canvas to create section.
- **Section selection**: Click on section to select (visual feedback).
- **Section deletion**: With section selected, press Delete/Backspace → modal appears with options:
  - Delete section only
  - Delete section + all cards in it
- **Keyboard shortcuts**: Delete/Backspace for deletion modal.

---

## Implementation Notes

- Use `react-rnd` for easy drag and resize handling of sections.
- Track sections’ `x`, `y`, `width`, `height` in React state.
- Use React Flow's `useNodesState` to get up-to-date node positions.
- Handle React Flow zoom/pan sync by transforming section coordinates according to React Flow's viewport transform.
- Use padding when computing bounding boxes for fit behavior.


---

## Example Technologies

| Component        | Technology/Library          |
|------------------|----------------------------|
| React Flow       | react-flow-renderer        |
| Section Drag/Resize | react-rnd                  |
| State Management | React `useState` / Hooks   |

Use shadcn components where it makes sense even if we have to import new ones. 

---

## Future Improvements

- Support for nested or overlapping sections.
- Collapsible/expandable sections.
- Animations for resizing and dragging.
- Section creation and deletion UI.

---

