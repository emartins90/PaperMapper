# Outline Feature Implementation Plan

## Overview
This document outlines the step-by-step implementation plan for the Outline feature in Paper Thread. The feature will allow users to organize their research cards into a hierarchical outline structure with drag-and-drop functionality.

## Feature Requirements Summary
- **Left Panel**: Hierarchical card list with inferred organization based on connections
- **Right Panel**: Draggable outline sections and subsections
- **Drag & Drop**: Move cards between panels and within outline structure
- **Search & Filter**: Reuse existing functionality from gather tab
- **Export**: Generate text/Word documents from outline
- **Undo/Redo**: Full action history support
- **Templates**: Predefined outline structures

---

## Phase 1: Foundation & Database Schema (Week 1-2)

### Step 1.1: Database Schema Design
**Priority: Critical**
**Estimated Time: 2-3 days**

#### 1.1.1 Create New Database Tables
- **outline_sections**
  - `id` (Primary Key)
  - `project_id` (Foreign Key to projects)
  - `title` (Section name)
  - `order_index` (Display order)
  - `parent_section_id` (Self-referencing for subsections)
  - `created_at`, `updated_at`

- **outline_section_cards**
  - `id` (Primary Key)
  - `section_id` (Foreign Key to outline_sections)
  - `card_id` (Foreign Key to cards)
  - `order_index` (Order within section)
  - `created_at`

#### 1.1.2 Create Alembic Migration
- Generate migration file for new tables
- Add proper foreign key constraints with CASCADE deletes
- Add indexes for performance

#### 1.1.3 Update Backend Models
- Add SQLAlchemy models for new tables
- Define relationships between models
- Update existing models if needed

### Step 1.2: Backend API Endpoints
**Priority: Critical**
**Estimated Time: 3-4 days**

#### 1.2.1 Outline Sections Endpoints
- `GET /outline-sections/?project_id={id}` - Get all sections for project
- `POST /outline-sections/` - Create new section
- `PUT /outline-sections/{id}` - Update section
- `DELETE /outline-sections/{id}` - Delete section
- `PUT /outline-sections/reorder` - Bulk reorder sections

#### 1.2.2 Section Cards Endpoints
- `GET /outline-section-cards/?section_id={id}` - Get cards in section
- `POST /outline-section-cards/` - Add card to section
- `DELETE /outline-section-cards/{id}` - Remove card from section
- `PUT /outline-section-cards/reorder` - Reorder cards within section

#### 1.2.3 Hierarchy Algorithm Endpoint
- `GET /cards/hierarchy/?project_id={id}` - Get hierarchically organized cards
- Implement algorithm in backend for consistency

### Step 1.3: Frontend Project Structure
**Priority: High**
**Estimated Time: 2-3 days**

#### 1.3.1 Create Outline Components Directory
```markdown:OUTLINE_IMPLEMENTATION_PLAN.md
frontend/src/components/outline/
├── OutlinePanel.tsx (Main container)
├── CardHierarchyList.tsx (Left panel)
├── OutlineStructure.tsx (Right panel)
├── OutlineSection.tsx (Individual section)
├── OutlineCard.tsx (Card in outline)
├── DragDropProvider.tsx (Drag & drop context)
└── hooks/
    ├── useOutlineData.ts
    ├── useCardHierarchy.ts
    └── useDragDrop.ts
```

#### 1.3.2 Update Project Navigation
- Modify `ProjectNav.tsx` to enable outline tab
- Remove placeholder toast message
- Add outline tab routing

---

## Phase 2: Core UI Implementation (Week 3-4)

### Step 2.1: Basic Two-Panel Layout
**Priority: Critical**
**Estimated Time: 3-4 days**

#### 2.1.1 Create Main Outline Panel
- Implement responsive two-panel layout
- Add proper styling and spacing
- Handle mobile/desktop differences
- Add loading states

#### 2.1.2 Left Panel - Card Hierarchy List
- Display cards in hierarchical structure
- Show connection lines (gray vertical lines)
- Implement card truncation (2 lines max)
- Add expand/collapse functionality
- Include card type indicators and colors

#### 2.1.3 Right Panel - Outline Structure
- Create section/subsection containers
- Implement auto-numbering (I, II, III / A, B, C)
- Add section title editing (inline)
- Show empty state when no sections exist

### Step 2.2: Card Hierarchy Algorithm
**Priority: Critical**
**Estimated Time: 4-5 days**

#### 2.2.1 Implement Hierarchy Logic
- Build graph from CardLink data
- Identify root nodes (no incoming connections)
- Implement topological sorting
- Handle cycles and disconnected components
- Add tiebreaker logic (creation time, spatial position)

#### 2.2.2 Hierarchy Display
- Render hierarchical tree structure
- Show connection lines between related cards
- Implement indentation for hierarchy levels
- Add visual indicators for connection strength

#### 2.2.3 Fallback Strategies
- Chronological ordering when no connections exist
- Spatial position-based ordering
- Card type-based grouping as last resort

### Step 2.3: Search and Filter Integration
**Priority: High**
**Estimated Time: 2-3 days**

#### 2.3.1 Reuse Existing Search Logic
- Adapt `CardListPanel` search functionality
- Implement hierarchy-aware filtering
- Maintain search state across panel interactions

#### 2.3.2 Enhanced Filtering
- Filter by card type
- Filter by tags
- Filter by connection status
- Filter by section assignment

---

## Phase 3: Drag & Drop Implementation (Week 5-6)

### Step 3.1: Drag & Drop Foundation
**Priority: Critical**
**Estimated Time: 3-4 days**

#### 3.1.1 Choose Drag & Drop Library
- Evaluate options: `@dnd-kit/core`, `react-beautiful-dnd`, or native HTML5
- Consider accessibility requirements
- Ensure mobile touch support

#### 3.1.2 Implement Drag Context
- Create drag and drop context provider
- Define drag item types and data
- Handle drag start/end events
- Implement drop zones

### Step 3.2: Card Movement Between Panels
**Priority: Critical**
**Estimated Time: 4-5 days**

#### 3.2.1 Left to Right Panel Movement
- Drag cards from hierarchy to outline sections
- Handle section targeting and highlighting
- Implement subsection targeting
- Add visual feedback during drag

#### 3.2.2 Right to Left Panel Movement
- Drag cards from outline back to hierarchy
- Remove cards from sections
- Update hierarchy display
- Handle orphaned cards

#### 3.2.3 Within-Panel Movement
- Reorder cards within sections
- Move cards between sections
- Reorder sections themselves
- Update order indices

### Step 3.3: State Synchronization
**Priority: High**
**Estimated Time: 2-3 days**

#### 3.3.1 Real-time Updates
- Sync changes between panels
- Update hierarchy when cards are moved
- Maintain consistent state across components
- Handle concurrent user actions

#### 3.3.2 Optimistic Updates
- Show changes immediately
- Rollback on API failure
- Handle network errors gracefully
- Provide user feedback

---

## Phase 4: Advanced Features (Week 7-8)

### Step 4.1: Undo/Redo System
**Priority: High**
**Estimated Time: 4-5 days**

#### 4.1.1 Command Pattern Implementation
- Define action types (move card, create section, etc.)
- Implement command interface
- Create action history store
- Handle command execution and reversal

#### 4.1.2 UI Integration
- Add undo/redo buttons
- Implement keyboard shortcuts (Ctrl+Z, Ctrl+Y)
- Show action descriptions in history
- Limit history size for performance

#### 4.1.3 Action Types to Support
- Move card between panels
- Create/delete sections
- Edit section titles
- Reorder sections/cards
- Bulk operations

### Step 4.2: Export Functionality
**Priority: Medium**
**Estimated Time: 3-4 days**

#### 4.2.1 Export Formats
- Plain text (.txt)
- Markdown (.md)
- Microsoft Word (.docx)
- PDF (future consideration)

#### 4.2.2 Export Content Structure
- Include section hierarchy
- Show card content (truncated or full)
- Add project metadata
- Include timestamps

#### 4.2.3 Export UI
- Add export button to outline panel
- Format selection dialog
- Progress indicators
- Download handling

### Step 4.3: Templates System
**Priority: Medium**
**Estimated Time: 2-3 days**

#### 4.3.1 Template Definition
- Research common outline structures
- Create template data structure
- Define template metadata

#### 4.3.2 Template Implementation
- Predefined section structures
- Academic paper templates
- Research project templates
- Custom template creation (future)

#### 4.3.3 Template UI
- Template selection dialog
- Preview functionality
- Apply template to existing outline
- Clear existing structure option

---

## Phase 5: Polish & Optimization (Week 9-10)

### Step 5.1: Performance Optimization
**Priority: High**
**Estimated Time: 3-4 days**

#### 5.1.1 Large Dataset Handling
- Implement virtual scrolling for large card lists
- Add pagination for sections
- Optimize hierarchy algorithm for performance
- Add loading states and skeleton screens

#### 5.1.2 Memory Management
- Clean up drag and drop listeners
- Optimize re-renders with React.memo
- Implement proper cleanup in useEffect
- Monitor memory usage

### Step 5.2: User Experience Enhancements
**Priority: Medium**
**Estimated Time: 2-3 days**

#### 5.2.1 Visual Polish
- Add smooth animations for drag operations
- Implement hover states and feedback
- Add loading spinners and progress indicators
- Improve mobile touch interactions

#### 5.2.2 Accessibility
- Add proper ARIA labels
- Implement keyboard navigation
- Ensure screen reader compatibility
- Add focus management

### Step 5.3: Error Handling & Edge Cases
**Priority: High**
**Estimated Time: 2-3 days**

#### 5.3.1 Error Scenarios
- Network failures during drag operations
- Concurrent user modifications
- Invalid hierarchy states
- Corrupted outline data

#### 5.3.2 Edge Cases
- Empty projects
- Single card projects
- Circular connections
- Orphaned cards

---

## Phase 6: Testing & Documentation (Week 11-12)

### Step 6.1: Comprehensive Testing
**Priority: Critical**
**Estimated Time: 4-5 days**

#### 6.1.1 Unit Tests
- Test hierarchy algorithm with various scenarios
- Test drag and drop logic
- Test undo/redo functionality
- Test API endpoints

#### 6.1.2 Integration Tests
- Test full user workflows
- Test cross-panel interactions
- Test concurrent user scenarios
- Test mobile interactions

#### 6.1.3 Performance Tests
- Test with large datasets (1000+ cards)
- Test drag performance
- Test memory usage
- Test network latency scenarios

### Step 6.2: User Testing
**Priority: High**
**Estimated Time: 2-3 days**

#### 6.2.1 Internal Testing
- Test with real project data
- Gather feedback from team
- Identify usability issues
- Refine hierarchy algorithm

#### 6.2.2 Beta Testing
- Deploy to staging environment
- Recruit beta users
- Collect feedback and metrics
- Iterate based on findings

### Step 6.3: Documentation
**Priority: Medium**
**Estimated Time: 1-2 days**

#### 6.3.1 Technical Documentation
- API documentation updates
- Component documentation
- Architecture decisions
- Deployment notes

#### 6.3.2 User Documentation
- Feature overview
- User guide
- FAQ
- Video tutorials (optional)

---

## Risk Assessment & Mitigation

### High-Risk Items

#### 1. Hierarchy Algorithm Complexity
**Risk**: Algorithm may not work well with all connection patterns
**Mitigation**: 
- Start with simple chronological ordering
- Implement multiple fallback strategies
- Test extensively with real user data
- Allow manual override of hierarchy

#### 2. Drag & Drop Performance
**Risk**: Poor performance with large numbers of cards
**Mitigation**:
- Implement virtual scrolling
- Use efficient drag libraries
- Optimize re-renders
- Add performance monitoring

#### 3. State Synchronization
**Risk**: Inconsistent state between panels
**Mitigation**:
- Use centralized state management
- Implement optimistic updates
- Add conflict resolution
- Test concurrent user scenarios

### Medium-Risk Items

#### 1. Mobile Touch Support
**Risk**: Drag and drop may not work well on mobile
**Mitigation**:
- Choose mobile-friendly drag library
- Implement touch-specific interactions
- Add alternative mobile UI patterns
- Test on various devices

#### 2. Export Format Compatibility
**Risk**: Generated documents may not be compatible
**Mitigation**:
- Test with multiple applications
- Use established libraries
- Provide multiple format options
- Add format validation

---

## Success Metrics

### Technical Metrics
- Page load time < 2 seconds
- Drag operation response time < 100ms
- Zero data loss during operations
- 99.9% uptime for outline feature

### User Experience Metrics
- User adoption rate > 60% within first month
- Average session time increase > 20%
- User satisfaction score > 4.0/5.0
- Support ticket reduction for organization issues

### Business Metrics
- Increased user retention
- Higher project completion rates
- Positive user feedback
- Reduced churn rate

---

## Dependencies & Prerequisites

### Technical Dependencies
- React 18+ with concurrent features
- TypeScript for type safety
- Existing drag & drop library evaluation
- Backend API framework (FastAPI)
- Database migration system (Alembic)

### External Dependencies
- Drag & drop library selection
- Export library evaluation

---

## Timeline Summary

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| Phase 1 | 2 weeks | Database schema, API endpoints, basic structure |
| Phase 2 | 2 weeks | Core UI, hierarchy algorithm, search integration |
| Phase 3 | 2 weeks | Drag & drop functionality, state synchronization |
| Phase 4 | 2 weeks | Undo/redo, export, templates |
| Phase 5 | 2 weeks | Performance optimization, UX polish |
| Phase 6 | 2 weeks | Testing, documentation, deployment |

**Total Estimated Timeline: 12 weeks (3 months)**

---

## Next Steps

1. **Immediate Actions**:
   - Review and approve this implementation plan
   - Set up project tracking (GitHub issues, Jira, etc.)
   - Assign team members to phases
   - Create development branch

2. **Week 1 Priorities**:
   - Begin database schema design
   - Set up development environment
   - Create initial component structure
   - Start API endpoint development


