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

