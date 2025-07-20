 # Citation Management System

## Overview

The citation management system handles adding, editing, and removing citations for source material cards. It supports both saved cards (with database persistence) and unsaved cards (with local state management).

## Architecture

### Two-Tier Approach

The system uses different strategies for saved vs unsaved cards:

#### Saved Cards (Database-First)
- **Data Source**: Always fetches citation data directly from the database
- **State Management**: Relies on database state, triggers refreshes on changes
- **Updates**: Saves to database immediately, then refreshes local state
- **Benefits**: Always reflects actual database state, handles concurrent updates

#### Unsaved Cards (Local State)
- **Data Source**: Uses local component state until card is saved
- **State Management**: Manages citation state locally without database calls
- **Updates**: Updates local state and parent node data with citation-only flags
- **Benefits**: Fast, doesn't affect other fields, preserves user input

## Key Components

### 1. Citation State Management

```typescript
// Core citation state
const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
const [localCitationId, setLocalCitationId] = useState<number | null>(null);

// Citation-only update tracking
const isCitationOnlyUpdateRef = useRef(false);
```

### 2. Database Fetching (Saved Cards)

```typescript
const fetchCardCitationData = async () => {
  // Fetches current citation data from database
  // Updates local state based on database response
  // Handles both citation presence and absence
};
```

### 3. Citation-Only Updates (Unsaved Cards)

```typescript
// Prevents field resets when updating citations
if (isCitationOnlyUpdateRef.current && isUnsaved) {
  // Only handle citation state, skip other field resets
  return;
}
```

## Citation Operations

### Adding Citations

#### Saved Cards
1. User selects citation from dropdown
2. Immediately update local state for responsive UI
3. Call `onUpdateNodeData` to update parent state
4. Save citation association to database
5. Trigger database refresh to ensure consistency

#### Unsaved Cards
1. User selects citation from dropdown
2. Immediately update local state for responsive UI
3. Call `onUpdateNodeData` with citation-only flag
4. Parent updates node data without triggering field resets

### Removing Citations

#### Saved Cards
1. Clear local citation state immediately
2. Update parent node data
3. Save removal to database
4. Trigger database refresh to ensure consistency

#### Unsaved Cards
1. Clear local citation state immediately
2. Call `onUpdateNodeData` with citation-only flag
3. Parent updates node data without triggering field resets

## Bug Fixes Implemented

### 1. Chat Experience Citation Flow

**Problem**: Citation selection auto-advanced to next step, back button didn't work correctly, and chat submit logic was inconsistent.

**Solution**:
- Removed auto-advancement on citation selection
- Fixed back button logic to handle summary and citation steps properly
- Fixed chat submit logic to advance to summary when skipping credibility

### 2. Side Panel Citation Display & Removal

**Problem**: Citation display showed stale data when switching cards, removal didn't update UI immediately, and switching between cards showed incorrect citations.

**Solution**:
- **Saved Cards**: Implemented database-first approach with automatic refreshes
- **Unsaved Cards**: Implemented local state with citation-only update flags
- Eliminated complex state synchronization between parent and child components

## Key Implementation Details

### Citation-Only Update Flag

```typescript
// Set flag before calling onUpdateNodeData for unsaved cards
isCitationOnlyUpdateRef.current = true;
onUpdateNodeData(openCard.id, {
  citationId: citation.id,
  source: citation.text,
  credibility: citation.credibility || "",
});

// In useEffect, check flag to prevent field resets
if (isCitationOnlyUpdateRef.current && isUnsaved) {
  // Only handle citation state, skip other field resets
  return;
}
```

### Database Refresh Trigger

```typescript
// Trigger refresh after database operations
setShouldRefreshCitation(prev => !prev);

// useEffect dependency includes this trigger
}, [openCard?.id, cardData, citations, isUnsaved, shouldRefreshCitation]);
```

### Conditional Citation State Management

```typescript
// Handle citation state based on card type
if (isUnsaved) {
  // Use local state from cardData
  if (cardData?.citationId && citations.length > 0) {
    const citation = citations.find(c => c.id === cardData.citationId);
    // Set citation state...
  }
} else {
  // Fetch from database
  fetchCardCitationData();
}
```

## Benefits of This Approach

1. **Reliability**: Database-first approach ensures saved cards always reflect actual state
2. **Performance**: Local state for unsaved cards provides fast, responsive UI
3. **Simplicity**: Eliminates complex state synchronization issues
4. **Maintainability**: Clear separation of concerns between saved and unsaved cards
5. **User Experience**: No field resets when managing citations on unsaved cards

## Future Considerations

1. **Optimistic Updates**: Could implement optimistic updates for better perceived performance
2. **Caching**: Could add caching layer for frequently accessed citations
3. **Real-time Updates**: Could implement WebSocket updates for collaborative editing
4. **Bulk Operations**: Could add support for bulk citation management

## Testing Scenarios

### Saved Cards
- [ ] Add citation to saved card
- [ ] Remove citation from saved card
- [ ] Switch between cards with/without citations
- [ ] Edit citation and verify changes persist
- [ ] Verify database consistency after operations

### Unsaved Cards
- [ ] Add citation to unsaved card
- [ ] Remove citation from unsaved card
- [ ] Verify other fields don't reset during citation operations
- [ ] Save card and verify citation persists
- [ ] Switch between unsaved cards

### Edge Cases
- [ ] Rapid citation add/remove operations
- [ ] Network failures during database operations
- [ ] Concurrent edits to same citation
- [ ] Large citation lists (performance)
- [ ] Special characters in citation text