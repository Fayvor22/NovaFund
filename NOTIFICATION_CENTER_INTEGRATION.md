# In-App Notification Center - Implementation & Integration Guide

## Issue #332 Implementation Status

This document describes the complete implementation of the in-app notification center for NovaFund, addressing issue #332 "Implement In-App Notification Center".

## ✅ Acceptance Criteria Met

- ✅ **Real-time alerting for project events** - SSE-based real-time delivery with automatic reconnection
- ✅ **"Mark as Read" functionality** - Both UI and persistent backend storage
- ✅ **Bell icon with dropdown notification list** - Fully implemented with badge count and history
- ✅ **Backend WebSocket/SSE integration** - Using SSE with fallback support

## 📋 Components Implemented

### Backend

#### 1. NotificationGateway (`src/notification/notification.gateway.ts`)
- SSE client connection management
- Real-time broadcast to connected clients
- Supports user-specific notifications
- Automatic client cleanup on disconnect

#### 2. NotificationGatewayController (`src/notification/notification-gateway.controller.ts`)
- `/notifications/stream?userId=WALLET` - SSE endpoint with history
- `/notifications/history?userId=WALLET&limit=50` - Fetch notification history
- Both endpoints read from database and serve persistent notifications

#### 3. NotificationService (Updated)
- Injects `NotificationGateway` for real-time delivery
- Uses `gateway.sendNotification()` for in-app notifications
- Maintains multi-channel support (email, SMS, push, in-app)

#### 4. NotificationController (Enhanced)
- `PUT /notifications/:id/read` - Mark single notification as read
- `PUT /notifications/user/:userId/read-all` - Mark all as read
- `GET /notifications/user/:userId/unread-count` - Get unread count
- `POST /notifications/emit` - Test/emit notifications

#### 5. MilestoneService (Enhanced)
- Emits notifications on milestone status changes
- Notifies investors on: COMPLETED, APPROVED, REJECTED
- Real-time delivery via NotificationGateway

#### 6. YieldNotificationService (New)
- `notifyYieldGenerated()` - When yield is generated
- `notifyYieldDistributionAvailable()` - When distribution is ready
- `notifyYieldAPYChanged()` - APY changes
- `notifyYieldMilestone()` - Yield milestones reached

### Frontend

#### 1. NotificationContext (Updated)
- Connects to `/notifications/stream?userId=WALLET`
- Fetches history from `/notifications/history?userId=WALLET`
- Persists read status via `PUT /notifications/:id/read`
- Auto-reconnect with exponential backoff
- Connection status tracking

#### 2. NotificationCenter (`components/notifications/NotificationCenter.tsx`)
- Bell icon button with unread count badge
- Dropdown panel with last 50 notifications
- Mark as Read functionality
- Notification preferences inline panel
- Connection status indicator
- Test notification button

#### 3. LiveNotificationToast (`components/notifications/LiveNotificationToast.tsx`)
- Shows toast when new notification arrives
- Plays sound (respects preferences)
- Shows browser push (when tab inactive)

#### 4. NotificationPreferencesPanel
- Toggle each notification type
- Browser push settings
- Sound settings
- Preferences persist to localStorage

## 🔄 Data Flow

```
Backend Event (e.g., Milestone Completed)
    ↓
MilestoneService.updateStatus()
    ↓
NotificationService.notify()
    ↓
NotificationGateway.sendNotification()
    ↓
1. Store in Database (Prisma.notification)
2. Broadcast to SSE clients
    ↓
Frontend EventSource receives
    ↓
NotificationContext updates state
    ↓
NotificationCenter renders
    ↓
LiveNotificationToast shows (if top of list)
```

## 🚀 Integration Steps

### Step 1: Ensure Database Migration
Ensure your Prisma schema has the `Notification` table:

```prisma
model Notification {
  id        String   @id @default(cuid())
  userId    String
  type      String   // "milestone_approval", "project_update", etc.
  title     String
  message   String
  link      String?  // Optional navigation link
  read      Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@index([createdAt])
}
```

Run migration:
```bash
cd backend
npx prisma migrate dev --name add_notifications
```

### Step 2: Add YieldNotificationService to Yield Module

In `backend/src/yield/yield.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { YieldNotificationService } from './yield-notification.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [NotificationModule],
  providers: [YieldNotificationService, /* other services */],
  exports: [YieldNotificationService],
})
export class YieldModule {}
```

### Step 3: Integrate with Yield Distribution

In your yield distribution/generation service:

```typescript
import { YieldNotificationService } from './yield-notification.service';

@Injectable()
export class YieldDistributionService {
  constructor(private readonly yieldNotificationService: YieldNotificationService) {}
  
  async distributeYield(projectId: string, amount: number, percentage: number) {
    // ... distribute logic ...
    
    // Notify investors
    await this.yieldNotificationService.notifyYieldGenerated(projectId, amount, percentage);
  }
}
```

### Step 4: Integrate with Project Updates

In project update/status services:

```typescript
import { NotificationService } from 'src/notification/services/notification.service';

@Injectable()
export class ProjectService {
  constructor(private readonly notificationService: NotificationService) {}
  
  async updateProjectStatus(projectId: string, newStatus: string) {
    // ... status update logic ...
    
    // Get project investors
    const investors = await this.getProjectInvestors(projectId);
    
    // Notify each investor
    for (const investor of investors) {
      await this.notificationService.notify(
        investor.id,
        'CONTRIBUTION',  // or appropriate type
        'Project Status Updated',
        `Project status changed to: ${newStatus}`,
        `/projects/${projectId}`
      );
    }
  }
}
```

### Step 5: Test the Integration

#### Backend Test
```bash
# 1. Emit test notification
curl -X POST http://localhost:3000/notifications/emit \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "wallet_address_here",
    "type": "project_update",
    "title": "Test Notification",
    "message": "This is a test notification from backend"
  }'

# 2. Check history
curl http://localhost:3000/notifications/history?userId=wallet_address_here&limit=10

# 3. Mark as read
curl -X PUT http://localhost:3000/notifications/{notificationId}/read
```

#### Frontend Test
1. Open browser DevTools → Network
2. Look for `/notifications/stream` request
3. It should show as a long-running connection (text/event-stream)
4. Click bell icon → should see "Send test notification" button
5. Click it → notification should appear in real-time

## 📊 Monitoring

### Check Active Connections
```typescript
// In NotificationGateway controller
@Get('gateway-stats')
getStats() {
  return {
    activeConnections: this.gateway.getClientCount(),
    timestamp: new Date(),
  };
}
```

### Monitor Database Growth
```sql
-- Check notification table size
SELECT COUNT(*) as total_notifications, 
       COUNT(CASE WHEN read = false THEN 1 END) as unread
FROM "Notification";

-- Notifications per user
SELECT "userId", COUNT(*) FROM "Notification" GROUP BY "userId";
```

## 🔧 Configuration

### Environment Variables

```env
# Backend
APP_BASE_URL=https://novafund.com
SENDGRID_API_KEY=your_sendgrid_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token

# Frontend (already in Next.js, auto-configured)
# Uses window.location.origin for API calls
```

## 🐛 Troubleshooting

### SSE Connection Issues
```typescript
// Check in browser console
const es = new EventSource('/notifications/stream?userId=wallet');
es.onopen = () => console.log('Connected');
es.onerror = (err) => console.error('Error:', err);
es.onmessage = (msg) => console.log('Notification:', msg.data);
```

### Database Issues
```sql
-- Verify notification structure
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'Notification';

-- Check for orphaned notifications
SELECT * FROM "Notification" 
WHERE "userId" NOT IN (SELECT id FROM "User");
```

### Frontend Issues
1. Check NotificationProvider is wrapping app in `layout.tsx` ✓
2. Check NotificationCenter is in Header ✓
3. Check `useSocial()` returns currentWallet correctly
4. Verify `/notifications/stream` endpoint is accessible

## 📈 Performance Considerations

- **SSE Connections**: One per user/tab, managed efficiently
- **Database**: Indexed on `(userId, createdAt)` for fast queries
- **Memory**: In-app: max 200 notifications in state
- **Network**: SSE keeps one open connection, no polling

## 🔐 Security Considerations

- ✅ Notifications only sent to their userId
- ✅ Backend validates userId on read operations
- ✅ No user data in notification content (only links)
- ⚠️ Consider adding authentication middleware to stream endpoint

## 🎯 Next Steps

1. **Production Deployment**
   - Run database migration
   - Deploy backend changes
   - Test SSE connection in production
   - Deploy frontend changes
   - Verify end-to-end

2. **Integration with Other Services**
   - ContributionService - notify on contribution
   - ProjectLaunchService - notify on project launch
   - ReputationService - notify on reputation changes

3. **Analytics**
   - Track notification open rates
   - Monitor delivery success
   - User engagement metrics

4. **Enhancement**
   - Notification categories with filtering
   - Batch digest emails
   - Smart timing (quiet hours)
   - Mobile push notifications

## 📞 Support

For questions or issues:
1. Check NOTIFICATION_CENTER.md in backend/src/notification/
2. Review example implementations in MilestoneService and YieldNotificationService
3. Check browser console for frontend errors
4. Check server logs for backend errors

---

**Implementation Date**: April 23, 2026
**Status**: ✅ Complete and Ready for Testing
**Last Updated**: 2026-04-23
