# Testing Comment API with Postman

## Prerequisites

1. **Start your Strapi server**
   ```bash
   npm run develop
   ```
   Server should be running at: `http://localhost:1337`

2. **Configure Permissions in Strapi Admin**
   - Go to: `http://localhost:1337/admin`
   - Navigate to: **Settings > Users & Permissions Plugin > Roles > Public**
   - Find **Comment** in the permissions list
   - Enable these permissions:
     - ✅ `create`
     - ✅ `find` (optional)
     - ✅ `findOne` (optional)
   - **Save** the changes

3. **Get a News Article ID**
   - Go to: **Content Manager > News-section**
   - Note the ID of any news article (e.g., ID: 1, 2, 3, etc.)
   - Or create a new news article if none exist

---

## Test 1: Create a Comment (POST)

### Request Setup

**Method:** `POST`
**URL:** `http://localhost:1337/api/comments`

### Headers
```
Content-Type: application/json
```

### Body (raw JSON)
```json
{
  "data": {
    "comment": "This is a test comment from Postman!",
    "name": "John Doe",
    "email": "john@example.com",
    "news_section": 1
  }
}
```

**Note:** Replace `"news_section": 1` with an actual news article ID from your database.

### Expected Response (201 Created)
```json
{
  "data": {
    "id": 1,
    "documentId": "abc123xyz",
    "comment": "This is a test comment from Postman!",
    "name": "John Doe",
    "email": "john@example.com",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "publishedAt": "2024-01-15T10:30:00.000Z",
    "news_section": {
      "id": 1,
      "title": "Your News Title"
    }
  },
  "message": "Comment submitted successfully"
}
```

### Step-by-Step in Postman

1. Open Postman
2. Click **"New"** > **"HTTP Request"**
3. Set method to **POST**
4. Enter URL: `http://localhost:1337/api/comments`
5. Go to **Headers** tab:
   - Add: `Content-Type` = `application/json`
6. Go to **Body** tab:
   - Select **raw**
   - Select **JSON** from dropdown
   - Paste the JSON body above
7. Click **Send**

---

## Test 2: Get Comments for a News Article (GET)

### Request Setup

**Method:** `GET`
**URL:** `http://localhost:1337/api/comments/news/1`

**Note:** Replace `1` with your news article ID.

### Headers
No headers required for this request.

### Expected Response (200 OK)
```json
{
  "data": [
    {
      "id": 1,
      "documentId": "abc123xyz",
      "comment": "This is a test comment from Postman!",
      "name": "John Doe",
      "email": "john@example.com",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z",
      "publishedAt": "2024-01-15T10:30:00.000Z"
    },
    {
      "id": 2,
      "documentId": "def456uvw",
      "comment": "Another comment!",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "createdAt": "2024-01-15T11:00:00.000Z",
      "updatedAt": "2024-01-15T11:00:00.000Z",
      "publishedAt": "2024-01-15T11:00:00.000Z"
    }
  ]
}
```

### Step-by-Step in Postman

1. Click **"New"** > **"HTTP Request"**
2. Set method to **GET**
3. Enter URL: `http://localhost:1337/api/comments/news/1`
4. Click **Send**

---

## Test 3: Test Validation Errors

### Test Missing Fields

**URL:** `POST http://localhost:1337/api/comments`

**Body:**
```json
{
  "data": {
    "comment": "Test comment"
  }
}
```

**Expected Response (400 Bad Request):**
```json
{
  "data": null,
  "error": {
    "status": 400,
    "name": "BadRequestError",
    "message": "Missing required fields: comment, name, email, and news_section are required"
  }
}
```

### Test Invalid Email

**URL:** `POST http://localhost:1337/api/comments`

**Body:**
```json
{
  "data": {
    "comment": "Test comment",
    "name": "John Doe",
    "email": "invalid-email",
    "news_section": 1
  }
}
```

**Expected Response (400 Bad Request):**
```json
{
  "data": null,
  "error": {
    "status": 400,
    "name": "BadRequestError",
    "message": "Invalid email format"
  }
}
```

### Test Non-existent News Article

**URL:** `POST http://localhost:1337/api/comments`

**Body:**
```json
{
  "data": {
    "comment": "Test comment",
    "name": "John Doe",
    "email": "john@example.com",
    "news_section": 99999
  }
}
```

**Expected Response (404 Not Found):**
```json
{
  "data": null,
  "error": {
    "status": 404,
    "name": "NotFoundError",
    "message": "News section not found"
  }
}
```

---

## Complete Test Workflow

### 1. Get Existing News Articles
First, fetch available news articles to get valid IDs:

**GET** `http://localhost:1337/api/news-sections`

Response will show all news articles with their IDs.

### 2. Create Multiple Comments
Create 2-3 comments for the same news article:

**POST** `http://localhost:1337/api/comments`
```json
{
  "data": {
    "comment": "First comment",
    "name": "User One",
    "email": "user1@example.com",
    "news_section": 1
  }
}
```

**POST** `http://localhost:1337/api/comments`
```json
{
  "data": {
    "comment": "Second comment",
    "name": "User Two",
    "email": "user2@example.com",
    "news_section": 1
  }
}
```

### 3. Fetch Comments for That News
**GET** `http://localhost:1337/api/comments/news/1`

Should return both comments sorted by newest first.

---

## Postman Collection (Import Ready)

You can create a Postman Collection with these requests:

```json
{
  "info": {
    "name": "Comment API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Create Comment",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"data\": {\n    \"comment\": \"This is a test comment!\",\n    \"name\": \"John Doe\",\n    \"email\": \"john@example.com\",\n    \"news_section\": 1\n  }\n}"
        },
        "url": {
          "raw": "http://localhost:1337/api/comments",
          "protocol": "http",
          "host": ["localhost"],
          "port": "1337",
          "path": ["api", "comments"]
        }
      }
    },
    {
      "name": "Get Comments by News ID",
      "request": {
        "method": "GET",
        "url": {
          "raw": "http://localhost:1337/api/comments/news/1",
          "protocol": "http",
          "host": ["localhost"],
          "port": "1337",
          "path": ["api", "comments", "news", "1"]
        }
      }
    }
  ]
}
```

Save this as `comment-api.postman_collection.json` and import into Postman.

---

## Troubleshooting

### Error: "Forbidden"
- **Solution:** Configure permissions in Strapi Admin (Settings > Roles > Public > Comment)

### Error: "News section not found"
- **Solution:** Check that the news_section ID exists in your database
- Run: `GET http://localhost:1337/api/news-sections` to see available IDs

### Error: "Cannot POST /api/comments"
- **Solution:** Make sure Strapi server is running and restarted after creating the Comment API

### No data returned from GET request
- **Solution:** Create some comments first using POST request

---

## Quick Test Script

You can also test using cURL:

```bash
# Create a comment
curl -X POST http://localhost:1337/api/comments \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "comment": "Test comment",
      "name": "John Doe",
      "email": "john@example.com",
      "news_section": 1
    }
  }'

# Get comments for news ID 1
curl http://localhost:1337/api/comments/news/1
```
