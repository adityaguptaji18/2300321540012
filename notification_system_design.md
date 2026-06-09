# Notification System Design

## Stage 1

### REST API Endpoints

#### 1.Get All Notifications for a Student
- **Method:**GET
- **Endpoint:** `/api/notifications/:studentId`
- **Headers:**
  - Content-Type:application/json
- **Response:**
```json
  {
    "status": 200,
    "data":[
      {
        "id":"uuid",
        "studentId":"1042",
        "type":"Placement",
        "message":"TCS interview scheduled for 10th June",
        "isRead":false,
        "createdAt":"2026-06-09T10:00:00Z"
      }
    ]
  }
```

#### 2. Mark Notification as Read
- **Method:**PATCH
- **Endpoint:**`/api/notifications/:notificationId/read`
- **Headers:**

- Content-Type:application/json
- **Response:**
```json
{
  "status":200,
  "message":"Notification marked as read"
}
```
#### 3.Mark All Notifications as Read
- **Method:**PATCH
- **Endpoint:**`/api/notifications/:studentId/read-all`
- **Headers:**
  - Content-Type:application/json
- **Response:**
```json
{
  "status":200,
  "message":"All notifications marked as read"
}
```

#### 4.Get Unread Notification Count
- **Method:**GET
- **Endpoint:**`/api/notifications/:studentId/unread-count`
- **Headers:**
  - Content-Type:application/json
- **Response:**
```json
{
  "status":200,
  "unreadCount":5
}
```

#### 5.Delete a Notification
- **Method:**DELETE
- **Endpoint:**`/api/notifications/:notificationId`
- **Headers:**
  - Content-Type:application/json
- **Response:**
```json
{
  "status":200,
  "message":"Notification deleted successfully"
}
```

### Real-Time Notification Mechanism

For real-time notifications, I would use **WebSockets** (via Socket.io).

#### Why WebSockets?
- Persistent connection between server and client
- Instant push notifications without polling
- Low latency compared to HTTP polling
- Bi-directional communication

#### How it works:
1. Student logs in → frontend connects to WebSocket server
2. Server assigns a room per studentId
3. When a new notification is created → server emits event to that student's room
4. Frontend receives and displays notification instantly

#### WebSocket Events:
- `connect` → Student joins their room
- `notification:new` → Server pushes new notification to student
- `notification:read` → Confirms read status update
- `disconnect` → Student leaves room



## Stage 2

### Database Selection

I would use **PostgreSQL** (Relational Database).

#### Why PostgreSQL?
- Structured data with clear relationships (students, notifications)
- ACID compliant — data integrity guaranteed
- Supports indexing for fast queries
- Easy to scale with proper indexing and partitioning

### DB Schema

```sql
CREATE TABLE students (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studentId INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  type VARCHAR(20) CHECK (type IN ('Placement', 'Result', 'Event')) NOT NULL,
  message TEXT NOT NULL,
  isRead BOOLEAN DEFAULT false,
  createdAt TIMESTAMP DEFAULT NOW()
);
```

### Queries

#### Get all unread notifications for a student:
```sql
SELECT * FROM notifications
WHERE studentId = $1 AND isRead = false
ORDER BY createdAt DESC;
```

#### Mark notification as read:
```sql
UPDATE notifications
SET isRead = true
WHERE id = $1;
```

#### Mark all notifications as read:
```sql
UPDATE notifications
SET isRead = true
WHERE studentId = $1;
```

### Problems as Data Volume Increases
- Query speed will slow down with millions of rows
- Full table scans will become expensive

### Solutions
- Add indexes on `studentId` and `createdAt`
- Use pagination instead of fetching all notifications at once
- Archive old notifications to a separate table


## Stage 3

### Query Analysis

Original query:
```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt ASC;
```

#### Is this query accurate?
Yes, it fetches all unread notifications for a student ordered by creation time.

#### Why is it slow?
- `SELECT *` fetches all columns — unnecessary data transfer
- No indexes on `studentId`, `isRead`, or `createdAt` — causes full table scan
- With 5,000,000 rows, full table scan is very expensive

#### What would I change?
```sql
SELECT id, studentId, type, message, isRead, createdAt
FROM notifications
WHERE studentId = 1042 AND isRead = false
ORDER BY createdAt ASC;
```

#### Adding Indexes:
```sql
CREATE INDEX idx_studentId ON notifications(studentId);
CREATE INDEX idx_isRead ON notifications(isRead);
CREATE INDEX idx_createdAt ON notifications(createdAt);
```

#### Should we add indexes on every column?
No. Adding indexes on every column is bad because:
- Indexes slow down INSERT, UPDATE, DELETE operations
- They consume extra disk space
- Only index columns used frequently in WHERE, ORDER BY clauses

#### Composite Index (better approach):
```sql
CREATE INDEX idx_student_unread ON notifications(studentId, isRead, createdAt);
```
This single index covers our query perfectly.

#### Computation Cost:
- Without index: O(n) — full table scan of 5M rows
- With composite index: O(log n) — B-tree index lookup

### Query to find students who got Placement notification in last 7 days:
```sql
SELECT DISTINCT studentId
FROM notifications
WHERE notificationType = 'Placement'
AND createdAt >= NOW() - INTERVAL '7 days';
```

## Stage 4

### Problem
Notifications are being fetched on every page load for every student, overwhelming the database and causing bad user experience.

### Solutions

#### 1. Caching (Redis)
- Store notifications in Redis cache after first DB fetch
- On next page load, serve from cache instead of DB
- Set cache expiry (TTL) of 60 seconds

**Tradeoffs:**
- ✅ Very fast response time
- ✅ DB load significantly reduced
- ❌ Cache can become stale — new notifications may not show immediately
- ❌ Extra infrastructure cost (Redis server)

#### 2. Pagination
- Instead of fetching all notifications at once, fetch 10-20 at a time
- Use `LIMIT` and `OFFSET` in SQL query

```sql
SELECT * FROM notifications
WHERE studentId = $1
ORDER BY createdAt DESC
LIMIT 20 OFFSET $2;
```

**Tradeoffs:**
- ✅ Less data transferred per request
- ✅ Faster response time
- ❌ Multiple requests needed to load all notifications
- ❌ OFFSET gets slower as page number increases (use cursor-based pagination for large data)

#### 3. WebSocket / Real-Time Push
- Instead of fetching on every page load, push notifications to client in real-time
- DB is only queried when a new notification is created

**Tradeoffs:**
- ✅ No unnecessary DB queries
- ✅ Instant notification delivery
- ❌ More complex implementation
- ❌ Persistent connection overhead

### Recommended Approach
Combine all three:
- **Redis cache** for serving existing notifications fast
- **Pagination** to limit data per request
- **WebSockets** for real-time new notification delivery


