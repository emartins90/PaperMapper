# Guided Experience Persistence

This feature allows users to persist their guided experience preference across sessions. The guided experience toggle controls whether new cards are created via a chat experience or via a standard form in a side panel.

## Implementation Details

### Backend Changes

1. **Database Schema**: Uses the existing `user_custom_options` table with:
   - `option_type`: "guided_experience"
   - `value`: "true" or "false" (stored as string)

2. **New CRUD Functions** (in `backend/crud.py`):
   - `get_guided_experience_setting()`: Retrieves the setting for a user
   - `set_guided_experience_setting()`: Creates or updates the setting

3. **New API Endpoints** (in `backend/main.py`):
   - `GET /users/me/guided-experience`: Get current setting
   - `PUT /users/me/guided-experience`: Update setting

### Frontend Changes

1. **Custom Hook** (`frontend/src/components/useGuidedExperience.ts`):
   - Manages guided experience state with persistence
   - Handles loading and error states
   - Automatically loads setting on mount
   - Updates backend when setting changes

2. **Updated Components**:
   - `Canvas.tsx`: Uses the new hook instead of local state
   - `BottomNav.tsx`: Shows loading and error states

## Usage

The guided experience setting is automatically loaded when a user opens a project. The toggle in the bottom navigation bar will:

1. Show "Loading..." while fetching the current setting
2. Show "Error" if there's a problem (with tooltip showing the error)
3. Disable the switch while loading
4. Persist changes to the backend immediately

## Default Behavior

- If no setting exists, defaults to `true` (guided experience enabled)
- If there's an error loading the setting, defaults to `true`
- If the user is not authenticated, uses local state only

## API Response Format

### GET /users/me/guided-experience
```json
{
  "guided": true
}
```

### PUT /users/me/guided-experience
Request:
```json
{
  "guided": false
}
```

Response:
```json
{
  "guided": false
}
``` 