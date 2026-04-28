# In-App Notification Center Implementation

## Overview

The in-app notification center provides real-time, persistent notifications for users on important platform events:
- **Milestone Events**: Creation, approval, completion, disputes
- **Yield Updates**: Project yield changes, distribution events
- **Contribution Events**: Confirmation, status changes
- **Project Updates**: Status changes, important announcements
- **System Events**: Maintenance alerts, important notices

## Architecture

### Backend Components

#### 1. **NotificationGateway** (`notification.gateway.ts`)
- Manages SSE client connections
- Broadcasts notifications to connected clients
- Stores notifications in database (persistent)
- Handles client registration/unregistration

#### 2. **NotificationGatewayController** (`notification-gateway.controller.ts`)
- `GET /notifications/stream?userId=X` - SSE endpoint for real-time notifications
- `GET /notifications/history?userId=X&limit=50` - Get notification history from DB
- Automatically sends history on connection, then streams new notifications

#### 3. **NotificationService** (`services/notification.service.ts`)
- Multi-channel notification support (email, SMS, push, in-app)
- Injects `NotificationGateway` for real-time broadcasting
- Uses `notificationGateway.sendNotification()` for in-app real-time delivery
- Supports granular preferences per notification type and channel

#### 4. **MilestoneService** (`milestone.service.ts`)
- Emits notifications when milestone status changes:
  - `COMPLETED` → "Milestone Completed" notification to all investors
  - `APPROVED` → "Milestone Approved" notification to all investors
  - `REJECTED` → "Milestone Disputed" with email/SMS to investors

### Frontend Components

#### 1. **NotificationContext** (`contexts/NotificationContext.tsx`)
- Manages notification state and SSE connection
- Connects to `GET /notifications/stream?userId=WALLET` with automatic reconnect
- Fetches initial history from database
- Tracks connection status (connecting/connected/disconnected)
- Provides `markAsRead()` / `markAllAsRead()` with backend persistence

#### 2. **NotificationCenter** (`components/notifications/NotificationCenter.tsx`)
- Bell icon button with unread count badge
- Dropdown panel showing last 50 notifications
- Notification preferences panel (inline)
- "Mark all read" button
- Connection status indicator (Live/Reconnecting/Offline)
- Test notification button for development

#### 3. **LiveNotificationToast** (`components/notifications/LiveNotificationToast.tsx`)
- Shows toast when new notification arrives
- Plays sound (customizable)
- Shows browser push notification (when tab is inactive)
- Dismissible, respects user preferences

## Data Flow

```
Backend Event (e.g., milestone completed)
    ↓
NotificationService.notify()
    ↓
NotificationGateway.sendNotification()
    ↓
Create in Prisma.notification
    ↓
Broadcast to all connected SSE clients (for that userId)
    ↓
Frontend receives via EventSource
    ↓
Update React state in NotificationContext
    ↓
NotificationCenter displays in dropdown
    ↓
LiveNotificationToast shows toast
```

## API Endpoints

### Streaming Notifications
```
GET /notifications/stream?userId=USER_WALLET&limit=50

Response: Server-Sent Events stream
event: message
data: {"id": "...", "type": "milestone_approval", "title": "...", "message": "...", "createdAt": "2026-04-23T...", "read": false}
```

### History/Catch-up
```
GET /notifications/history?userId=USER_WALLET&limit=50

Response: JSON array
[
  {"id": "...", "type": "milestone_approval", "title": "...", "message": "...", "createdAt": "...", "read": false},
  ...
]
```

### Mark as Read
```
PUT /notifications/:notificationId/read
Response: {"id": "...", "read": true, ...}

PUT /notifications/user/:userId/read-all
Response: {"updated": 42}
```

### Emit Notification (Testing)
```
POST /notifications/emit
Body: {
  "userId": "wallet_address",
  "type": "project_update",
  "title": "Project Updated",
  "message": "New yield distribution available"
}
Response: {"id": "...", "type": "...", "title": "...", ...}
```

## Usage Examples

### Backend: Notify on Milestone Completion
```typescript
// In MilestoneService or similar
await this.notificationService.notify(
  investorId,
  'MILESTONE',
  'Milestone Completed: Payment Processing',
  'Your project milestone "Payment Processing" has been completed successfully.',
  `/projects/${projectId}/milestones/${milestoneId}`
);
```

### Backend: Real-time In-App Notification
```typescript
// Direct call to gateway for immediate real-time delivery
await this.notificationGateway.sendNotification(
  userId,
  'project_update',
  'Yield Distribution Available',
  'New yield of $50 is available for your project investments'
);
```

### Frontend: Listen for Notifications
```typescript
import { useNotifications } from '@/contexts/NotificationContext';

function MyComponent() {
  const { notifications, unreadCount, markAsRead } = useNotifications();
  
  return (
    <div>
      <p>Unread: {unreadCount}</p>
      {notifications.map(n => (
        <div key={n.id} onClick={() => markAsRead(n.id)}>
          {n.title}: {n.message}
        </div>
      ))}
    </div>
  );
}
```

## Features

### Real-time Delivery ✓
- Immediate notification on platform events
- SSE keeps connection alive (no polling)
- Automatic reconnect with exponential backoff
- Connection status UI indicator

### Persistent Storage ✓
- All notifications stored in Prisma database
- Read status persisted to backend
- History accessible on reconnection
- No loss of notifications when client disconnects

### Preferences ✓
- Toggle each notification type
- Enable/disable browser push
- Enable/disable sound
- Preferences stored in localStorage + backend

### User Experience ✓
- Non-intrusive toast notifications
- Bell icon with badge count
- Scrollable history in dropdown
- "Mark all read" action
- Connection status indicator
- Smooth animations and transitions

### Scalability ✓
- Gateway manages multiple clients per user
- Broadcasts only to relevant user
- Efficient SSE with no polling overhead
- Database stores history for offline users

## Testing

### Send Test Notification
1. Open notification center (bell icon)
2. Click "Send test notification" button
3. See notification appear in real-time
4. Check toast appears on screen

### Test Backend Integration
```bash
# Emit test notification via API
curl -X POST http://localhost:3000/notifications/emit \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "wallet_address",
    "type": "project_update",
    "title": "Test Notification",
    "message": "This is a test notification"
  }'
```

### Test Connection Handling
1. Close browser tab (SSE connection closes)
2. Reopen tab - should reconnect and fetch history
3. Toggle browser offline - should show "Reconnecting..."
4. Go back online - should reconnect immediately

## Configuration

### Environment Variables
- `APP_BASE_URL` - Base URL for notification links (e.g., https://novafund.com)
- `SENDGRID_API_KEY` - For email notifications
- `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` - For SMS notifications

### Frontend Preferences
Stored in localStorage under `notification-preferences`:
```json
{
  "milestoneApprovals": true,
  "contributionConfirmations": true,
  "projectStatus": true,
  "projectUpdates": true,
  "system": true,
  "pushEnabled": false,
  "soundEnabled": true
}
```

## Monitoring

Check notification system health:
```typescript
// In NotificationGateway
gateway.getClientCount() // Number of active SSE connections
```

## Future Enhancements

- [ ] Notification categories with custom filtering
- [ ] Scheduled/digest notifications
- [ ] Notification analytics dashboard
- [ ] Advanced filtering (by project, type, date range)
- [ ] Export notifications to PDF
- [ ] Notification history pagination
- [ ] Admin notification broadcasting
- [ ] A/B testing for notification timing

## Troubleshooting

### Notifications not appearing
1. Check SSE connection: Open DevTools → Network → look for `/notifications/stream`
2. Verify userId is passed correctly
3. Check browser console for errors
4. Test with curl: `curl http://localhost:3000/notifications/emit -X POST ...`

### Connection keeps dropping
1. Check server logs for errors
2. Verify firewall allows SSE connections
3. Check browser proxy/VPN settings
4. Try reloading the page

### Read status not persisting
1. Verify `PUT /notifications/:id/read` response
2. Check database has notification with correct read status
3. Try marking from different tab to test persistence

## References

- SSE Documentation: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events
- Prisma Notifications Table: Check `prisma/schema.prisma` for notification schema
- Related Issues: #332 (Notification Center)
