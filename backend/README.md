## User Custom Options

### Model
- `UserCustomOption`: Stores custom options for each user, with fields:
  - `id`: int
  - `user_id`: int (FK to User)
  - `option_type`: str (e.g., 'sourceFunction', 'argumentType')
  - `value`: str

### API Endpoints

#### Get all custom options for current user
```
GET /users/me/custom-options
GET /users/me/custom-options?option_type=sourceFunction
```
Response: List of custom options for the user (optionally filtered by type).

#### Add a new custom option for current user
```
POST /users/me/custom-options
Content-Type: application/json
{
  "option_type": "sourceFunction",
  "value": "My Custom Function"
}
```
Response: The created custom option object.
