# Modelo de Datos e Índices de Firestore

## Colecciones Principales

### 1. `videos`
- `id`: string (UUID / Firestore Document ID)
- `title`: string
- `description`: string
- `originalUrl`: string
- `embedUrl`: string
- `platform`: 'YOUTUBE' | 'INSTAGRAM' | 'TIKTOK' | 'OTHER'
- `thumbnailUrl`: string
- `creatorName`: string
- `creatorUrl`: string
- `durationSeconds`: number
- `categoryId`: string
- `tags`: string[]
- `status`: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'HIDDEN' | 'REJECTED'
- `views`: number
- `createdAt`: string (ISO-8601)
- `updatedAt`: string (ISO-8601)

### 2. `categories`
- `id`: string (ej. `cat-carnes`)
- `name`: string
- `slug`: string
- `description`: string
- `icon`: string
- `order`: number

### 3. `users`
- `uid`: string
- `email`: string
- `displayName`: string
- `photoURL`: string
- `role`: 'USER' | 'ADMIN'
- `createdAt`: string
- `updatedAt`: string

#### Subcolección: `users/{userId}/favorites/{videoId}`
- `id`: string (videoId)
- `userId`: string
- `videoId`: string
- `createdAt`: string

### 4. `reports`
- `id`: string
- `videoId`: string
- `userId`: string
- `userEmail`: string
- `reason`: string
- `description`: string
- `status`: 'OPEN' | 'REVIEWED' | 'RESOLVED' | 'REJECTED'
- `createdAt`: string
