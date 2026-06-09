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


## Stage 5

### Original Pseudocode

```
function notify_all(student_ids: array, message: string):
  for student_id in student_ids:
    send_email(student_id, message)   # calls Email API
    save_to_db(student_id, message)   # DB insert
    push_to_app(student_id, message)  # real-time push
```

### Shortcomings

1. **No fault tolerance** — if `send_email` fails for one student, entire loop stops. Remaining 49,800 students never get notified.
2. **Synchronous processing** — 50,000 students processed one by one. Extremely slow.
3. **Tight coupling** — email, DB save and push happen together. One failure blocks all.
4. **No retry mechanism** — failed emails are lost forever.
5. **No progress tracking** — no way to know how many succeeded or failed.

### What happened when send_email failed for 200 students midway?
- Loop stopped at student 200
- Remaining ~49,800 students never received notification
- DB saves for failed students may be inconsistent
- No way to retry just the failed ones

### Should DB save and email happen together?
**No.** They should be decoupled because:
- DB save is fast and local — should always succeed
- Email is an external API call — can fail due to network issues
- If they are coupled, email failure will also prevent DB save
- DB save should happen first, email should be retried independently

### Redesigned Solution — Message Queue

Use a **Message Queue (e.g. Redis Queue / BullMQ)** for async processing:

1. HR clicks "Notify All"
2. All 50,000 student IDs are pushed to a queue instantly
3. Multiple workers process the queue in parallel
4. Each worker: save to DB first, then send email, then push to app
5. If email fails → retry automatically (max 3 retries)
6. Failed jobs go to a Dead Letter Queue for manual review

### Revised Pseudocode

```
function notify_all(student_ids: array, message: string):
for student_id in student_ids:
queue.push({ student_id, message })  # non-blocking, instant

Worker (runs in parallel, multiple instances)
function worker(job):
try:
save_to_db(job.student_id, job.message)     # DB first
send_email(job.student_id, job.message)     # then email
push_to_app(job.student_id, job.message)    # then push
catch error:
if job.retries < 3:
queue.retry(job)                          # retry on failure
else:
dead_letter_queue.push(job)               # log for review

```

### Benefits of Redesign
- **Fast** — queue push is instant, workers process in parallel
- **Reliable** — DB save decoupled from email
- **Fault tolerant** — failed jobs retried automatically
- **Scalable** — add more workers to handle load


## Stage 6

### Approach
Fetched notifications from the provided API and implemented a Priority Inbox that displays the top 10 most important unread notifications.

### Priority Logic
Priority is determined by a combination of:
- **Weight:** Placement (3) > Result (2) > Event (1)
- **Recency:** More recent notifications ranked higher within same type

### Score Formula

```
score = weight * 1e13 + timestamp_in_milliseconds
```
### How new notifications are handled efficiently
- No database storage — API is called fresh each time
- Sorting is O(n log n) — efficient even as new notifications come in
- Top 10 sliced after sorting — constant output size
