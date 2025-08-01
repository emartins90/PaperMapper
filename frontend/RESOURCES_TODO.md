# Resources Section - Production Readiness TODO

## Current Status
- ✅ Basic responsive layout implemented
- ✅ Clean card design with icons
- ✅ Two-line layout (source name + article title)
- ✅ Content-based icons with colored backgrounds
- ✅ Responsive search/filter layout
- ❌ Still using hardcoded sample data
- ❌ Unused API calls and dependencies

## Immediate Cleanup Tasks

### 1. Remove Unused Code
- [ ] Remove `/api/link-preview` route (not needed for hardcoded data)
- [ ] Remove `jsdom` dependency from package.json
- [ ] Simplify `ResourceCard` component to not make API calls
- [ ] Remove loading states and error handling for external APIs
- [ ] Remove unused imports and functions

### 2. Optimize Data Structure
- [ ] Create `src/data/resources.ts` for centralized data management
- [ ] Add proper TypeScript interfaces for resource data
- [ ] Add comments for easy maintenance
- [ ] Organize resources by meaningful categories
- [ ] Add "last updated" timestamps

### 3. Improve User Experience
- [ ] Add simple search within hardcoded resources
- [ ] Add resource counts per category
- [ ] Add "copy link" functionality
- [ ] Add hover states and better interactions
- [ ] Consider adding resource descriptions

## Future Enhancements (When Ready)

### 4. Backend Integration (Future)
- [ ] Design database schema for resources
- [ ] Create API endpoints for CRUD operations
- [ ] Add user authentication for resource access
- [ ] Implement resource validation
- [ ] Add bulk import/export functionality

### 5. Advanced Features (Future)
- [ ] Resource favorites/bookmarks
- [ ] Usage analytics tracking
- [ ] Resource recommendations
- [ ] Integration with project workflows
- [ ] Resource sharing between users

### 6. Performance & Monitoring (Future)
- [ ] Add error boundaries
- [ ] Implement caching strategies
- [ ] Add performance monitoring
- [ ] Set up analytics tracking
- [ ] Add automated link validation

## Data Structure Example

```typescript
interface Resource {
  id: string;
  title: string;
  url: string;
  source: string;
  category: string;
  description?: string;
  lastUpdated: string;
  tags?: string[];
}

interface ResourceCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
}
```

## Maintenance Checklist

### Weekly
- [ ] Check that all resource URLs are still working
- [ ] Review resource descriptions for accuracy
- [ ] Update any broken links

### Monthly
- [ ] Review and update resource categories
- [ ] Add new high-quality resources
- [ ] Remove outdated or low-quality resources
- [ ] Update resource descriptions

### Quarterly
- [ ] Review overall resource quality
- [ ] Analyze which resources are most useful
- [ ] Consider adding new categories
- [ ] Update resource organization

## Notes
- Keep resources focused on academic writing and research
- Prioritize free, reliable resources
- Maintain consistent quality standards
- Document any changes to the resource list
- Consider user feedback for resource additions/removals 