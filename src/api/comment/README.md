# Comment API

This API manages user comments on news articles. Each news article has its own set of individual comments.

## Schema

The Comment model includes the following fields:

- **comment** (text, required): The comment text
- **name** (string, required): Commenter's name
- **email** (email, required): Commenter's email (validated)
- **news_section** (relation, required): Link to the news article (Many-to-One)

## API Endpoints

### 1. Create Comment (Public)
**POST** `/api/comments`

Creates a new comment for a specific news article.

**Request Body:**
```json
{
  "data": {
    "comment": "This is a great article!",
    "name": "John Doe",
    "email": "john@example.com",
    "news_section": 1
  }
}
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "comment": "This is a great article!",
    "name": "John Doe",
    "email": "john@example.com",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "news_section": {
      "id": 1,
      "title": "News Title"
    }
  },
  "message": "Comment submitted successfully"
}
```

### 2. Get Comments by News Article (Public)
**GET** `/api/comments/news/:newsId`

Retrieves all comments for a specific news article, sorted by newest first.

**Example:** `/api/comments/news/1`

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "comment": "Great article!",
      "name": "John Doe",
      "email": "john@example.com",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    {
      "id": 2,
      "comment": "Very informative!",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "createdAt": "2024-01-01T01:00:00.000Z"
    }
  ]
}
```

### 3. Update Comment (Admin Only)
**PUT** `/api/comments/:id`

Admin can update or moderate comments.

**Request Body:**
```json
{
  "data": {
    "comment": "Updated comment text"
  }
}
```

### 4. Delete Comment (Admin Only)
**DELETE** `/api/comments/:id`

Admin can delete inappropriate comments.

## Permissions

You need to configure permissions in Strapi Admin:

1. Go to **Settings > Roles > Public**
2. Enable permissions for Comment:
   - `create` - Allow users to submit comments
   - `findByNews` - Allow users to view comments for a news article

3. Go to **Settings > Roles > Authenticated**
4. Enable all permissions for admin moderation purposes

## Relation to News

Each news article (news-section) can have multiple comments:

- **Comment → News**: Many-to-One (each comment belongs to one news article)
- **News → Comment**: One-to-Many (each news article can have many comments)

Comments are filtered by `news_section` ID to show only comments for a specific news article.

## Frontend Integration Example

```javascript
// Submit a comment for a news article
async function submitComment(newsId, commentData) {
  const response = await fetch('http://localhost:1337/api/comments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: {
        comment: commentData.comment,
        name: commentData.name,
        email: commentData.email,
        news_section: newsId,
      },
    }),
  });
  return response.json();
}

// Get all comments for a specific news article
async function getComments(newsId) {
  const response = await fetch(`http://localhost:1337/api/comments/news/${newsId}`);
  const result = await response.json();
  return result.data; // Array of comments
}
```

## Usage Flow

1. **Frontend displays a news article** with ID (e.g., news ID = 5)
2. **Fetch comments for that news:** `GET /api/comments/news/5`
3. **User submits a comment:** `POST /api/comments` with `news_section: 5`
4. **Comment is saved** and linked to that specific news article
5. **Refresh comments** to show the new comment
