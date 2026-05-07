# API Reference

Base URL: `http://localhost:8000`

All protected routes require a `Bearer` token in the `Authorization` header.

---

## System

| Method | Path      | Auth | Description                        |
|--------|-----------|------|------------------------------------|
| GET    | `/`       | No   | Service name and version           |
| GET    | `/health` | No   | Health check                       |

---

## Auth  `/api/auth`

| Method | Path                   | Auth | Description                                   |
|--------|------------------------|------|-----------------------------------------------|
| POST   | `/api/auth/check-email`| No   | Check whether an email is already registered  |
| POST   | `/api/auth/register`   | No   | Register a new account, returns JWT token     |
| POST   | `/api/auth/login`      | No   | Authenticate and receive a JWT token          |
| GET    | `/api/auth/me`         | Yes  | Return the authenticated user's profile       |

### POST `/api/auth/check-email`
```json
{ "email": "user@example.com" }
```
Response:
```json
{ "exists": true, "name": "John" }
```

### POST `/api/auth/register`
```json
{ "email": "user@example.com", "password": "secret", "name": "John" }
```
Response `201`:
```json
{ "access_token": "<jwt>", "token_type": "bearer" }
```

### POST `/api/auth/login`
```json
{ "email": "user@example.com", "password": "secret" }
```
Response `200`:
```json
{ "access_token": "<jwt>", "token_type": "bearer" }
```

### GET `/api/auth/me`
Response:
```json
{ "id": "...", "email": "user@example.com", "name": "John", "created_at": "2024-01-01T00:00:00Z" }
```

---

## Users  `/api/user`

| Method | Path                    | Auth | Description              |
|--------|-------------------------|------|--------------------------|
| GET    | `/api/user/preferences` | Yes  | Get user preferences     |
| PUT    | `/api/user/preferences` | Yes  | Update user preferences  |

### GET `/api/user/preferences`
Response:
```json
{
  "auto_classify_emails": true,
  "auto_schedule_meetings": false,
  "timezone": "UTC",
  "llm_provider": "gemini",
  "preferred_model": "gemini-2.0-flash",
  "gmail_connected": false,
  "calendar_connected": false,
  "is_monitoring": false
}
```

### PUT `/api/user/preferences`
Body: any subset of the preferences object above.

---

## Articles  `/api/journalist`

### Content Generation

| Method | Path                                   | Auth | Description                                        |
|--------|----------------------------------------|------|----------------------------------------------------|
| POST   | `/api/journalist/generate-content`     | Yes  | Run the full pipeline, returns SSE stream          |
| POST   | `/api/journalist/upload`               | Yes  | Upload a PDF or TXT file for grounding             |
| POST   | `/api/journalist/generate-image`       | Yes  | Generate a cover image for an article              |
| POST   | `/api/journalist/generate-social-kit`  | Yes  | Generate a social media distribution kit           |
| POST   | `/api/journalist/generate-audio`       | Yes  | Generate an audio briefing script and TTS audio    |
| POST   | `/api/journalist/translate`            | Yes  | Translate an article to another language           |

### POST `/api/journalist/generate-content`

Streams `text/event-stream`. Each event is a JSON object.

Request body:
```json
{
  "query": "The future of nuclear energy",
  "category": "Technology",
  "tone": "Analytical",
  "persona": "Analytical",
  "enable_web_search": true,
  "target_audience": "General Professionals",
  "sources": [],
  "grounding_sources": [],
  "history": [],
  "brand_voice": "Professional",
  "language": "English",
  "session_id": null
}
```

SSE event types:

| Type           | Payload field  | Description                                 |
|----------------|----------------|---------------------------------------------|
| `status`       | `message`      | Pipeline progress message                   |
| `delta`        | `message`      | Incremental article text chunk              |
| `result`       | `payload`      | Full report object on completion            |
| `report_saved` | `message`      | Confirmation the report was saved to DB     |
| `error`        | `message`      | Error message                               |

Available personas: `Analytical`, `Investigative`, `Narrative`, `Tabloid`

Available brand voices: `The Economist`, `Wired`, `TechCrunch`, `Professional`, `Minimalist`

Rate limit: 60 requests per 60 seconds per IP.

### POST `/api/journalist/upload`

Multipart form upload. Supported types: `pdf`, `txt`. Maximum size: 10 MB.

Response:
```json
{ "name": "report.pdf", "content": "<extracted text>" }
```

### POST `/api/journalist/generate-image`
```json
{ "topic": "Nuclear energy", "category": "Technology", "article_content": "..." }
```
Response:
```json
{ "image_url": "data:image/jpeg;base64,..." }
```

### POST `/api/journalist/generate-social-kit`
```json
{ "article_content": "<markdown article>" }
```
Response:
```json
{
  "twitter_thread": ["Post 1", "Post 2", "Post 3", "Post 4", "Post 5"],
  "twitter_tags": ["tag1"],
  "linkedin_post": "...",
  "linkedin_tags": ["tag1"],
  "newsletter_blurb": "...",
  "newsletter_tags": ["tag1"],
  "instagram_caption": "...",
  "instagram_tags": ["tag1"],
  "facebook_post": "...",
  "facebook_tags": ["tag1"]
}
```

### POST `/api/journalist/generate-audio`
```json
{ "content": "<markdown article>" }
```
Response:
```json
{ "audio_b64": "<base64 WAV>", "script": "<briefing text>" }
```

### POST `/api/journalist/translate`
```json
{ "content": "<markdown article>", "target_language": "Hindi" }
```
Response:
```json
{ "translated_content": "<translated markdown>", "language": "Hindi" }
```

---

### Reports

| Method | Path                                   | Auth | Description                       |
|--------|----------------------------------------|------|-----------------------------------|
| GET    | `/api/journalist/reports`              | Yes  | List all reports (latest first)   |
| POST   | `/api/journalist/reports/{id}/save`    | Yes  | Update a report's content         |
| DELETE | `/api/journalist/reports/{id}`         | Yes  | Delete a report                   |

### GET `/api/journalist/reports`

Returns an array of report objects. Heavy fields (`research_summary`, `outline`, `audit`, `data_insights`) are excluded from the list view.

### POST `/api/journalist/reports/{id}/save`
```json
{
  "markdown_content": "...",
  "topic": "Optional updated topic",
  "category": "Optional updated category"
}
```

---

### Sessions

| Method | Path                        | Auth | Description                                          |
|--------|-----------------------------|------|------------------------------------------------------|
| GET    | `/api/journalist/sessions`  | Yes  | Reports grouped by session, with version counts      |

---

### Conversations

| Method | Path                                      | Auth | Description                            |
|--------|-------------------------------------------|------|----------------------------------------|
| GET    | `/api/journalist/conversations`           | Yes  | List all conversations (messages omitted) |
| GET    | `/api/journalist/conversations/{id}`      | Yes  | Get a full conversation with messages  |
| POST   | `/api/journalist/conversations`           | Yes  | Create or update a conversation        |
| DELETE | `/api/journalist/conversations/{id}`      | Yes  | Delete a conversation                  |

### POST `/api/journalist/conversations`
```json
{
  "id": "conv-abc123",
  "user_email": "user@example.com",
  "title": "Nuclear Energy Deep Dive",
  "category": "Technology",
  "messages": []
}
```

---

## Voice  `/api/voice`

| Method | Path             | Auth | Description                          |
|--------|------------------|------|--------------------------------------|
| POST   | `/api/voice/tts` | Yes  | Convert text to speech (Sarvam AI)   |

### POST `/api/voice/tts`
```json
{ "text": "Hello, this is a test." }
```
Response:
```json
{ "audio_b64": "<base64 WAV>" }
```

Model: `bulbul:v3` · Speaker: `shubh` · Language: `en-IN` · Max input: 5,000 characters

---

## Error Responses

All errors follow a consistent shape:

```json
{ "detail": "Human-readable error message" }
```

| Status | Meaning                          |
|--------|----------------------------------|
| 400    | Bad request / missing parameter  |
| 401    | Unauthorized / invalid token     |
| 404    | Resource not found               |
| 409    | Conflict (e.g. duplicate email)  |
| 413    | Payload too large                |
| 429    | Rate limit exceeded              |
| 500    | Internal server error            |
