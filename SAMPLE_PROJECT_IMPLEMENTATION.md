# Sample Project Implementation Plan

## Overview
Create a sample/tutorial project that new users can access to learn how to use the software. This project will be served through a special endpoint that bypasses the normal project security system, making it accessible to all users.


## Goals
- Provide new users with a hands-on tutorial experience
- Demonstrate all card types and features
- Show proper workflow and connections
- Give users confidence in using the software
- Maintain security of the main project system


## Implementation Strategy

### Phase 1: Create Tutorial Project in Development
1. **Create a new project** in your development environment
2. **Build out comprehensive content** including:
   - Source Material cards (with files, citations, summaries)
   - Question cards (with categories, priorities, statuses)
   - Insight cards (with types, source connections)
   - Thought cards (with examples)
   - Claim cards (with different claim types)
3. **Create meaningful connections** between cards to show relationships
4. **Upload sample files** to demonstrate file handling
5. **Test the project** to ensure it works as intended

### Phase 2: Export Project Data
Use one of these methods to extract the project data:

#### Option A: Direct Database Query
```bash
psql your_database_name -c "
SELECT 
  p.*,
  c.*,
  sm.*,
  q.*,
  i.*,
  t.*,
  cl.*
FROM projects p
LEFT JOIN cards c ON c.project_id = p.id
LEFT JOIN source_materials sm ON sm.id = c.data_id AND c.type = 'source'
LEFT JOIN questions q ON q.id = c.data_id AND c.type = 'question'
LEFT JOIN insights i ON i.id = c.data_id AND c.type = 'insight'
LEFT JOIN thoughts t ON t.id = c.data_id AND c.type = 'thought'
LEFT JOIN claims cl ON cl.id = c.data_id AND c.type = 'claim'
WHERE p.id = YOUR_TUTORIAL_PROJECT_ID;
"
```

#### Option B: Simple Python Script
```python
import psycopg2
import json

conn = psycopg2.connect("your_connection_string")
cursor = conn.cursor()

# Get project data
cursor.execute("SELECT * FROM projects WHERE id = YOUR_PROJECT_ID")
project = cursor.fetchone()

# Get all cards
cursor.execute("SELECT * FROM cards WHERE project_id = YOUR_PROJECT_ID")
cards = cursor.fetchall()

# Get all edges/links
cursor.execute("SELECT * FROM card_links WHERE project_id = YOUR_PROJECT_ID")
links = cursor.fetchall()

# Dump to JSON
data = {
    "project": project,
    "cards": cards,
    "links": links
}

with open("tutorial_project.json", "w") as f:
    json.dump(data, f, indent=2)
```

#### Option C: API Endpoints
```bash
curl "http://localhost:8000/projects/YOUR_PROJECT_ID" > project.json
curl "http://localhost:8000/cards/?project_id=YOUR_PROJECT_ID" > cards.json
curl "http://localhost:8000/card_links/?project_id=YOUR_PROJECT_ID" > links.json
```


### Phase 3: Create Special Sample Project Endpoint
**IMPORTANT**: Due to security constraints, we cannot use the normal project system. Instead, create a dedicated endpoint:

1. **Add new backend endpoint** `/api/sample-project` that serves tutorial data
2. **Store tutorial data** as static JSON or in a special database table
3. **Bypass normal authentication** for this endpoint (or use minimal auth)
4. **Return tutorial data** in the same format as normal projects

### Phase 4: Update Application Code
1. **Add sample project link** to the Resources section
2. **Create tutorial viewer component** that renders the sample data
=======
### Phase 3: Insert into Production Database
1. **Insert the project data** into the production database
2. **Use project ID 1** (or another specific ID) for the sample project
3. **Update file URLs** to point to public storage locations
4. **Verify the project** loads correctly in production

### Phase 4: Update Application Code
1. **Filter out project ID 1** from the project list in `ProjectSelector.tsx`
2. **Add sample project link** to the Resources section


### 1. Backend Sample Project Endpoint
Add a new endpoint in `backend/main.py`:

```python
@app.get("/api/sample-project")
async def get_sample_project():
    """Get the tutorial sample project data"""
    # Load tutorial data from static file or special table
    # Return in same format as normal project endpoints
    # No authentication required for this endpoint
    pass
```

### 2. Frontend Resources Integration
=======
### 1. Filter Sample Project from Project List
In `frontend/src/components/ProjectSelector.tsx`, update the `fetchProjects` function:

```typescript
async function fetchProjects() {
  setLoading(true);
  setError("");
  
  try {
    const res = await fetch(`${API_URL}/projects/`, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });
    
    if (!res.ok) {
      throw new Error("Failed to fetch projects");
    }
    const data = await res.json();
    
    // Filter out the sample project (ID 1)
    const filteredProjects = data.filter((project: Project) => project.id !== 1);
    
    setProjects(filteredProjects);
  } catch (err: any) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
}
```

### 2. Add Sample Project to Resources
In the Resources section, add a link to the sample project:

```typescript
// Add to the sampleResources object or create a new section
{
  title: "Learn the Software",
  resources: [
    {
      title: "Sample Project Tutorial",
      description: "Explore a complete example project to learn how to use all features",

      url: "/tutorial", // New route for tutorial viewer

### 3. Tutorial Viewer Component
Create a new component that renders the sample project data:

```typescript
// components/TutorialViewer.tsx
export default function TutorialViewer() {
  // Fetch data from /api/sample-project
  // Render using existing Canvas components
  // Show in read-only mode
}
```

## Security Considerations

### Why We Can't Use Normal Project System
- **All project endpoints now require authentication AND ownership verification**
- **No way to create "public" projects** that bypass security checks
- **Sample project needs to be accessible to all users**

### Security Benefits of Special Endpoint
- **Maintains security** of user projects
- **Isolated tutorial system** doesn't affect production data
- **Clear separation** between user data and tutorial content
- **Easy to audit** and maintain

## File Storage Strategy

### Current Issue
- Files uploaded through the UI are stored in private R2 storage
- These files require user credentials and aren't accessible to other users
- The sample project needs publicly accessible files

### Solution: Post-Upload File Management
1. **Upload files normally** through the development interface
2. **Manually move/copy files** to a public R2 bucket or folder
3. **Update the database** to reference the public URLs instead of private ones
4. **Use public file URLs** in the production sample project

### Alternative: Static Assets
- Store small tutorial files as static assets in `/public/` folder
- Reference these static URLs directly in the sample project
- No authentication required, but limited to smaller files

## Sample Project Content Structure

### Recommended Tutorial Flow
1. **Welcome Card** - Explains what the sample project demonstrates
2. **Source Material Examples** - Shows different types of sources and file handling
3. **Question Development** - Demonstrates asking research questions
4. **Insight Creation** - Shows how to develop insights from sources
5. **Thought Process** - Illustrates the thinking process
6. **Claim Formation** - Demonstrates forming and supporting claims
7. **Connection Examples** - Shows how to link related concepts

### Card Content Guidelines
- **Clear explanations** of what each card type is for
- **Real examples** that users can relate to
- **Step-by-step instructions** embedded in the content
- **File examples** showing different file types and sizes
- **Connection examples** demonstrating meaningful relationships

## Maintenance and Updates

### When to Update
- **Major feature changes** in the software
- **Workflow improvements** or new best practices
- **Bug fixes** or clarifications needed
- **User feedback** indicates confusion

### Update Process
1. **Recreate the tutorial project** in development
2. **Export the new data** using the same methods
3. **Update the production database** with the new structure
4. **Update file references** if needed
5. **Test the updated sample** in production

## Benefits of This Approach

### For Users
- **Hands-on learning** experience
- **Real examples** of how the software works
- **Confidence building** before creating their own projects
- **Reference material** they can return to

### For Development
- **Maintains security** of the main application
- **Uses existing infrastructure** for rendering
- **Easy to maintain** and update
- **Clear separation** of concerns


### For Business
- **Improved user onboarding** experience
- **Reduced support requests** from confused users
- **Better user retention** through successful first experiences
- **Professional appearance** with comprehensive examples

## Testing Checklist

### Before Production Deployment
- [ ] Sample project loads correctly in development
- [ ] All cards display properly with content
- [ ] File attachments work and are accessible
- [ ] Card connections are visible and logical
- [ ] Project exports successfully using chosen method

- [ ] Special endpoint serves tutorial data correctly
- [ ] Resources section links to tutorial correctly
- [ ] Tutorial opens in read-only mode
- [ ] All file URLs point to publicly accessible locations

### After Production Deployment
- [ ] Sample project is accessible to new users
- [ ] No errors in browser console
- [ ] File downloads work for all users
- [ ] Project list filtering works correctly
- [ ] Resources section displays properly
- [ ] Sample project navigation works as expected

## Future Enhancements

### Potential Improvements
- **Interactive tutorial** with step-by-step guidance
- **Video demonstrations** embedded in cards
- **Progressive disclosure** of features
- **User progress tracking** through tutorial
- **Customizable tutorial** based on user type
- **A/B testing** different tutorial approaches

### Advanced Features
- **Tutorial completion** certificates
- **Skill assessment** questions
- **Personalized recommendations** based on tutorial progress
- **Community examples** from successful users
- **Integration with help system** and documentation

## Conclusion

This revised implementation plan addresses the security constraints while still providing users with valuable learning resources. By using a special endpoint for the tutorial, we maintain the security of user projects while creating an accessible learning experience.

The key success factors are:
1. **Creating comprehensive tutorial content** that covers all features
2. **Proper file management** to ensure public accessibility
3. **Secure implementation** that doesn't compromise user data
4. **Ongoing maintenance** to keep the tutorial current

This approach will significantly improve the user onboarding experience and help users get the most value from your software from day one, while maintaining the security improvements we've implemented. 


