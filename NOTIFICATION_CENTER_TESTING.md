# In-App Notification Center - Testing Guide

## Unit Tests

Run unit tests for the notification gateway:

```bash
# Backend
cd backend
npm test -- notification.gateway.spec.ts

# Watch mode
npm test -- notification.gateway.spec.ts --watch
```

## Integration Tests

### Manual E2E Testing

#### Test 1: Real-time Notification Delivery
1. **Setup**
   - Backend running on localhost:3000
   - Frontend running on localhost:3000
   - User logged in

2. **Steps**
   - Open DevTools → Network tab
   - Filter for `/notifications/stream`
   - Click bell icon in header
   - Click "Send test notification"
   - Check DevTools → Network → should see request
   - Notification should appear in dropdown
   - Toast should appear in bottom right

3. **Expected Results**
   - SSE stream active
   - Notification appears in <500ms
   - Badge count updates
   - Toast shows briefly
   - No console errors

#### Test 2: Persistent Read Status
1. **Setup**
   - Multiple notifications in history
   - DevTools → Application → Storage

2. **Steps**
   - Open notification center
   - Note unread count
   - Click a notification to read
   - Refresh page
   - Unread count should be one less

3. **Expected Results**
   - Read status persists across page reload
   - Database shows `read: true` for that notification
   - Unread count correctly updated

#### Test 3: Connection Resilience
1. **Setup**
   - Multiple notifications available
   - Browser DevTools Network enabled

2. **Steps**
   - Close browser tab → reopen
   - Notification center should connect
   - Check network for `/notifications/stream`
   - Fetch initial history
   - Should show "Live" status after connection
   - Send another notification

3. **Expected Results**
   - Auto-reconnect works
   - History fetched on reconnect
   - New notifications received live
   - Status indicator shows correct state

#### Test 4: Milestone Notification (Backend Integration)
1. **Setup**
   - Create project with milestones
   - Investors added to project
   - Backend running

2. **Steps**
   - Update milestone status to COMPLETED
   - Check investor's notification center
   - Should see milestone notification

3. **Expected Results**
   - Milestone event triggers notification
   - All investors get notified
   - Notification contains project/milestone info
   - Link navigates to milestone

#### Test 5: Yield Notification (Backend Integration)
1. **Setup**
   - Create project with investments
   - Yield generated/distributed

2. **Steps**
   - Call YieldNotificationService
   - Check investor notifications
   - Should see yield-related notifications

3. **Expected Results**
   - Yield events trigger notifications
   - APY changes notified
   - Distribution availability notified
   - Links navigate to project

#### Test 6: Preferences
1. **Setup**
   - Open notification center
   - Click Settings icon

2. **Steps**
   - Toggle different notification types
   - Toggle push notifications
   - Toggle sound
   - Refresh page
   - Settings should persist

3. **Expected Results**
   - Preferences saved to localStorage
   - Disabling type hides that notification type
   - Push/sound toggles affect toast behavior
   - Settings survive page reload

## API Testing

### Using cURL

```bash
# 1. Test emit endpoint
curl -X POST http://localhost:3000/notifications/emit \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "wallet_address",
    "type": "project_update",
    "title": "Test Notification",
    "message": "This is a test notification"
  }'

# 2. Get notification history
curl "http://localhost:3000/notifications/history?userId=wallet_address&limit=10"

# 3. Mark notification as read
curl -X PUT http://localhost:3000/notifications/NOTIFICATION_ID/read \
  -H "Content-Type: application/json"

# 4. Mark all as read
curl -X PUT http://localhost:3000/notifications/user/wallet_address/read-all \
  -H "Content-Type: application/json"

# 5. Get unread count
curl http://localhost:3000/notifications/user/wallet_address/unread-count
```

### Using Postman

1. **Create collection** "NovaFund Notifications"
2. **Base URL**: `{{base_url}}/notifications`

3. **Requests**:
   - `POST /emit` - Body: `{ "userId": "...", "type": "project_update", ... }`
   - `GET /history?userId=wallet&limit=10`
   - `PUT /:id/read`
   - `PUT /user/:userId/read-all`
   - `GET /user/:userId/unread-count`

## Browser Console Testing

```javascript
// Check EventSource connection
const stream = new EventSource('/notifications/stream?userId=wallet_address');
stream.onopen = () => console.log('Connected');
stream.onmessage = (e) => console.log('Received:', JSON.parse(e.data));
stream.onerror = (e) => console.log('Error:', e);

// Send test notification from browser
fetch('/notifications/emit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'wallet_address',
    type: 'project_update',
    title: 'Test from Console',
    message: 'Testing from browser console'
  })
}).then(r => r.json()).then(console.log);

// Mark notification as read
fetch('/notifications/NOTIFICATION_ID/read', { method: 'PUT' })
  .then(r => r.json()).then(console.log);
```

## Performance Testing

### Load Test - Multiple Connections

```bash
# Test 100 concurrent SSE connections
ab -n 100 -c 100 http://localhost:3000/notifications/stream?userId=test_user
```

### Stress Test - Rapid Notifications

```javascript
// In browser console
const emit = () => fetch('/notifications/emit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'wallet_address',
    type: 'project_update',
    title: `Test ${Date.now()}`,
    message: 'Rapid fire test'
  })
});

// Send 10 notifications
for (let i = 0; i < 10; i++) {
  setTimeout(() => emit(), i * 100);
}
```

## Monitoring & Debugging

### Browser DevTools

1. **Network Tab**
   - Filter for `/notifications/stream`
   - Should show as EventStream (pending)
   - Check Response tab for SSE format

2. **Console Tab**
   - Check for any JS errors
   - Look for connection messages
   - Test with console code above

3. **Application/Storage**
   - localStorage → notification-preferences
   - Should contain user preferences

### Server Logs

```bash
# Tail backend logs
npm run dev:backend -- --log-level=debug

# Look for:
# - "Client subscribed"
# - "Client unsubscribed"
# - "Notification sent"
# - "Failed to send notification"
```

### Database

```sql
-- Check recent notifications
SELECT * FROM "Notification" 
ORDER BY "createdAt" DESC 
LIMIT 10;

-- Check unread count
SELECT COUNT(*) as unread 
FROM "Notification" 
WHERE "userId" = 'wallet_address' AND read = false;

-- Check client activity
SELECT "userId", COUNT(*) as total_notifications
FROM "Notification"
GROUP BY "userId"
ORDER BY COUNT(*) DESC
LIMIT 10;
```

## Troubleshooting Checklist

- [ ] Backend is running and accessible
- [ ] Frontend can reach backend API
- [ ] Database migration completed
- [ ] NotificationProvider wraps app in layout.tsx
- [ ] NotificationCenter renders in header
- [ ] User is logged in (currentWallet set)
- [ ] SSE connection shows in Network tab
- [ ] No console errors in DevTools
- [ ] Database has Notification table
- [ ] No firewall blocking SSE connections

## Known Issues & Workarounds

### SSE Connection Drops Frequently
- Increase MAX_BACKOFF_MS in NotificationContext.tsx
- Check server timeout settings
- Check proxy/firewall for connection limits

### Notifications not persisting
- Check database migration ran
- Verify Prisma schema has Notification model
- Check backend logs for errors

### Toast not showing
- Check preferences → soundEnabled/pushEnabled
- Check browser notifications permission
- Check if notification type is enabled in preferences

### Read status not syncing
- Check network tab for PUT requests
- Verify backend /notifications/:id/read endpoint works
- Check browser console for fetch errors

## Test Completion Checklist

- [ ] Real-time notifications deliver in <500ms
- [ ] Toast appears when tab is focused
- [ ] Push notification appears when tab inactive
- [ ] Read status persists across page reload
- [ ] Connection auto-reconnects on disconnect
- [ ] Milestone events trigger notifications
- [ ] Yield events trigger notifications
- [ ] Preferences save and persist
- [ ] Unread count updates correctly
- [ ] Database stores all notifications
- [ ] No memory leaks with long-lived connections
- [ ] Mobile responsive UI works
- [ ] All integration tests pass

---

**Last Updated**: 2026-04-23
**Test Coverage**: End-to-end, Unit, Integration, Performance
