# Outline Templates Feature Implementation Plan

## Overview

The outline templates feature will allow users to apply predefined outline structures to their projects. When users click the templates button, a progressive modal will guide them through selecting and applying templates, with confirmation for replacing existing content.

## Complexity Assessment: MEDIUM 🟡

The templates feature is moderately complex but very achievable given the existing architecture.

## What Makes It Manageable

1. **Existing Infrastructure**: Complete outline section/subsection data model, API endpoints, modal system, and drag-and-drop functionality
2. **Clear Data Structure**: `OutlineSection` model already supports hierarchical structure, ordering, and project association
3. **Reusable Components**: Modal system and section management already exist

## Implementation Breakdown

### 1. Backend Changes (Low-Medium Complexity)

#### New Models

```python
class OutlineTemplate(Base):
    __tablename__ = "outline_templates"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    category = Column(String, nullable=False)  # "Academic", "Business", "Creative", etc.
    is_system = Column(Boolean, default=True)  # System vs user-created
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=func.now())

class OutlineTemplateSection(Base):
    __tablename__ = "outline_template_sections"
    id = Column(Integer, primary_key=True)
    template_id = Column(Integer, ForeignKey("outline_templates.id"))
    title = Column(String, nullable=False)
    order_index = Column(Integer, nullable=False)
    parent_section_id = Column(Integer, ForeignKey("outline_template_sections.id"), nullable=True)
    section_number = Column(String, nullable=True)
```

#### API Endpoints Needed

- `GET /outline_templates/` - List all templates
- `GET /outline_templates/{id}` - Get template details
- `POST /outline_templates/{id}/apply` - Apply template to project
- `POST /outline_templates/` - Create custom template (if allowing user templates)

### 2. Frontend Changes (Medium Complexity)

#### New Components

1. **TemplatesModal** - Main progressive modal
2. **TemplateGrid** - Grid of template types
3. **TemplateDetails** - Template preview with back button
4. **TemplateConfirmation** - Replace content confirmation

#### Modal Flow

```
Templates Button → TemplateGrid → TemplateDetails → TemplateConfirmation → Apply Template
```

#### State Management

```typescript
type ModalState = 'closed' | 'grid' | 'details' | 'confirmation';
const [modalState, setModalState] = useState<ModalState>('closed');
const [selectedTemplate, setSelectedTemplate] = useState<OutlineTemplate | null>(null);
```

### 3. Template Data Structure

```typescript
interface OutlineTemplate {
  id: number;
  name: string;
  description: string;
  category: string;
  sections: TemplateSection[];
}

interface TemplateSection {
  title: string;
  order_index: number;
  parent_section_id?: number;
  section_number: string;
  subsections?: TemplateSection[];
}
```

## Estimated Effort

| Component | Time Estimate | Complexity |
|-----------|---------------|------------|
| Backend Models & APIs | 4-6 hours | Low-Medium |
| Template Data Creation | 2-4 hours | Low |
| Frontend Modal System | 6-8 hours | Medium |
| Template Application Logic | 3-4 hours | Medium |
| User Template Creation | 4-6 hours | Medium |
| Testing & Polish | 2-3 hours | Low |

**Total: 21-31 hours (3-4 days for a skilled developer)**

## Key Challenges & Solutions

### 1. Template Content Definition
**Challenge**: Determining what templates to include
**Solution**: Start with 5-7 common academic templates:
- Expository Essay
- Argumentative Essay  
- Research Paper
- Literature Review
- Lab Report
- Business Proposal
- Creative Writing

### 2. Content Replacement Logic
**Challenge**: Safely replacing existing content
**Solution**: 
```typescript
const applyTemplate = async (templateId: number, replaceExisting: boolean) => {
  if (replaceExisting) {
    // Delete existing sections
    await deleteAllSections(projectId);
  }
  // Create new sections from template
  await createSectionsFromTemplate(templateId, projectId);
};
```

### 3. Progressive Modal State Management
**Challenge**: Managing modal state across screens
**Solution**: Use a simple state machine with clear transitions between modal states

## Recommended Implementation Order

1. **Phase 1**: Backend models and basic templates
2. **Phase 2**: Simple modal with template grid
3. **Phase 3**: Template details and application logic
4. **Phase 4**: Content replacement confirmation
5. **Phase 5**: User-created templates (optional)

## Example Template Structure

### Expository Essay Template
```
I. Introduction
     A. Hook
     B. Background
     C. Thesis Statement
II. Body Paragraph 1
     A. Main Point
     B. Evidence/Facts
     C. Analysis
III. Body Paragraph 2
     A. Main Point
     B. Evidence/Facts
     C. Analysis
IV. Body Paragraph 3
     A. Main Point
     B. Evidence/Facts
     C. Analysis
V. Conclusion
     A. Restate Thesis
     B. Review Main Points
     C. Final Thought
```

## Technical Considerations

### Database Migration
- Create new tables for templates and template sections
- Add foreign key relationships
- Consider indexing for performance

### API Design
- Follow existing patterns in the codebase
- Include proper error handling
- Add validation for template application

### Frontend Integration
- Use existing modal system (Radix UI)
- Follow established component patterns
- Ensure responsive design
- Add proper loading states

### Error Handling
- Handle template application failures gracefully
- Provide clear user feedback
- Allow rollback if template application fails

## Future Enhancements

1. **Template Categories**: Organize templates by type (Academic, Business, Creative)
2. **Custom Templates**: Allow users to save their own outline structures as templates
3. **Template Sharing**: Allow users to share templates with others
4. **Template Preview**: Show a visual preview of the outline structure before applying
5. **Partial Application**: Allow users to apply only specific sections from a template

## Success Metrics

- Users can successfully apply templates to new projects
- Existing content replacement works without data loss
- Modal flow is intuitive and user-friendly
- Template application is fast and reliable
- Users can create and manage custom templates (if implemented)

## Dependencies

- Existing outline section/subsection system
- Modal system (Radix UI)
- API infrastructure
- Database migration system (Alembic)

## Notes

- The hardest part will be determining the template content, but can start with basic academic templates
- Technical implementation is straightforward given existing infrastructure
- Can be built and tested incrementally
- Leverages existing code patterns and components
