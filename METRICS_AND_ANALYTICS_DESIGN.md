# Metrics and Analytics System Design
## Uno Multiplayer Card Game

**Date**: February 8, 2026
**Status**: Design Phase
**Audience**: Development team, DevOps, Product stakeholders

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Requirements Analysis](#requirements-analysis)
3. [Platform Comparison](#platform-comparison)
4. [Recommendation](#recommendation)
5. [Phased Implementation Plan](#phased-implementation-plan)
6. [Data Schemas](#data-schemas)
7. [Architecture Diagram](#architecture-diagram)
8. [Failure Scenarios and Mitigation](#failure-scenarios-and-mitigation)

---

## Executive Summary

### Problem Statement
The Uno game currently lacks visibility into:
- **User engagement**: How many players are active? How long do sessions last?
- **System health**: When errors occur, when do we discover them?
- **Performance**: Are Cloud Functions slow? Is Firestore overloaded?
- **Product metrics**: What's the game creation-to-completion rate? Where do players drop off?

### Recommended Solution
**Hybrid approach**: Firebase Analytics (event tracking) + Google Cloud Monitoring (infrastructure) + Lean Custom Firestore Metrics (game-specific analytics)

**Why this works:**
- ✅ Leverages existing Firebase infrastructure (no new vendors)
- ✅ Setup complexity: Low (~1 week for Phase 1, ~2 weeks for Phase 2)
- ✅ Cost: Free tier handles expected traffic; scales predictably
- ✅ Real-time alerting via Cloud Monitoring
- ✅ Game-domain metrics stored in Firestore (auditable, extensible)
- ✅ Implementation effort: Moderate (SDK integration + schema updates)

---

## Requirements Analysis

### Functional Requirements

#### Tier 1: Basic App Usage Metrics
Track the player journey and engagement:
- **Daily Active Players (DAU)** / Weekly Active Players (WAU)
- **Game funnel**: Created → Started → Completed → Abandoned
- **Session metrics**: Duration, number of games per session
- **Player cohorts**: New vs. returning, retention by day N

#### Tier 2: Error Monitoring & Alarming
Identify and respond to production incidents:
- **Client errors**: JS errors, API failures, network issues
- **Server errors**: Cloud Function failures, Firestore errors, validation failures
- **Error categorization**: User-facing vs. infrastructure vs. logic bugs
- **Alerting**: Immediate notification when error rate exceeds threshold

#### Tier 3: Performance Monitoring
Detect bottlenecks before users complain:
- **Cloud Function latency**: Response times by function type
- **Firestore operations**: Read/write latency, throttling events
- **Frontend performance**: Page load times, interaction latency
- **Custom game logic**: Card validation, turn processing times

#### Tier 4+: Future Extensibility
Foundation for:
- A/B testing house rules variants
- Player progression and achievement systems
- Social features (friend stats, leaderboards)
- Fraud detection (unusual play patterns)

---

## Platform Comparison

### 1. Google Cloud Monitoring (Native GCP)

**Integration Points**: Cloud Functions, Firestore, Cloud Logging
**Real-time**: Yes (sub-minute)
**Alerting**: Native

| Aspect | Rating | Details |
|--------|--------|---------|
| **Setup Complexity** | ⭐⭐ Low | Already included with Firebase project; console-based UI |
| **Cost at Scale** | ⭐⭐⭐⭐ Excellent | Free tier: 150 MBs logs/day; $0.50/GB beyond |
| **Data Retention** | ⭐⭐⭐ Good | Logs available for 30 days; can export to BigQuery |
| **Alerting** | ⭐⭐⭐⭐⭐ Excellent | Notification channels, uptime checks, custom metrics |
| **Frontend Integration** | ⭐⭐ Limited | Console-only; no SDK for client-side events |
| **Backend Integration** | ⭐⭐⭐⭐ Excellent | Cloud Functions + Firestore auto-instrumented |
| **Scalability** | ⭐⭐⭐⭐⭐ Excellent | Unlimited scale; Google's own infrastructure |
| **Steep Learning Curve** | Medium | MQL (Monitoring Query Language) has syntax quirks |

**Best For**: Infrastructure monitoring (error rates, latency, quotas)
**Limitations**:
- No built-in user cohort analysis or funnel tracking
- Console is powerful but can be overwhelming
- Requires manual setup of custom metrics for game-specific data

**Implementation Effort**:
- Cloud Function error monitoring: 30 mins (mostly config)
- Firestore quota alerts: 1 hour
- Custom metrics: 2-3 hours per metric type

---

### 2. Firebase Analytics

**Integration Points**: Frontend (via GA4), Server context via Cloud Functions
**Real-time**: 24-48 hour lag for most reports; real-time events in development
**Alerting**: Limited (no direct alerting; integrates with GA4)

| Aspect | Rating | Details |
|--------|--------|---------|
| **Setup Complexity** | ⭐⭐⭐ Medium | Add SDK to React, define custom events, wait for data collection |
| **Cost at Scale** | ⭐⭐⭐⭐ Excellent | Free tier includes 10M events/month; no charge for storage |
| **Data Retention** | ⭐⭐⭐⭐ Excellent | 14-month buildup; events available in Analysis Hub |
| **Alerting** | ⭐ Limited | Relies on GA4 anomaly detection + third-party integrations |
| **Frontend Integration** | ⭐⭐⭐⭐⭐ Excellent | Drop-in SDK; integrates seamlessly with React |
| **Backend Integration** | ⭐⭐⭐ Good | Can log user properties; requires manual event logging |
| **Scalability** | ⭐⭐⭐⭐⭐ Excellent | Google Analytics infrastructure; unlimited scale |
| **User Cohort Analysis** | ⭐⭐⭐⭐ Excellent | Native audience segmentation, funnels, retention |

**Best For**: User behavior tracking (engagement, retention, funnels)
**Limitations**:
- 24-48 hour reporting lag (not real-time alerting)
- Server-side event logging more complex than frontend
- No direct infrastructure metric visibility
- Event quota enforcement requires careful planning

**Implementation Effort**:
- Frontend SDK setup + core events: 3-4 hours
- Custom event schema definition: 2 hours
- Server-side event routing: 2-3 hours
- Dashboard configuration: 2 hours

---

### 3. Custom Firestore-Based Solution (DIY)

**Integration Points**: Write metrics to custom `/analytics` collection
**Real-time**: Yes (realtime listeners)
**Alerting**: Manual implementation

| Aspect | Rating | Details |
|--------|--------|---------|
| **Setup Complexity** | ⭐⭐⭐⭐ Moderate | Design schemas, write tracking code, build dashboards |
| **Cost at Scale** | ⭐⭐⭐ Good at Small Scale | Firestore: $0.06 write / $0.18 read (100K writes = $6/mo initially) |
| **Data Retention** | ⭐⭐⭐ Manual | Must implement retention logic; TTL not native |
| **Alerting** | ⭐⭐ Limited | Requires Cloud Functions + custom query logic |
| **Frontend Integration** | ⭐⭐⭐ Good | Native Firestore SDK; realtime subscriptions |
| **Backend Integration** | ⭐⭐⭐⭐ Excellent | Easy to write metrics from Cloud Functions |
| **Scalability** | ⭐⭐ Problematic | Costly at scale; write-heavy workload inefficient in Firestore |
| **Auditing & Debugging** | ⭐⭐⭐⭐ Excellent | All data in Firestore; easy to query and replay |

**Best For**: Game-specific domain metrics with full control
**Limitations**:
- Becomes expensive at scale (write-heavy workload)
- Requires custom aggregation logic (no built-in SQL)
- Data querying slower than dedicated analytics DB
- Alerting requires custom Cloud Function webhooks
- Team must build and maintain dashboard infrastructure

**Cost Breakdown at Scale** (100K daily active players):
- 100K daily game events: $6K/month writes alone
- Firestore scales cost, not usage-flat pricing
- Not recommended as primary storage for high-volume metrics

**Implementation Effort**:
- Schema design: 2 hours
- Tracking instrumentation: 4-6 hours
- Alerting functions: 8-10 hours
- Dashboard/querying: Open-ended (custom build)

---

### 4. Datadog / New Relic (Third-Party APM)

**Integration Points**: SDK for frontend, backend agent, log forwarding
**Real-time**: Yes (1-30 seconds)
**Alerting**: Excellent

| Aspect | Rating | Details |
|--------|--------|---------|
| **Setup Complexity** | ⭐⭐⭐ Medium | SDK setup + agent config + instrumentation |
| **Cost at Scale** | ⭐ Expensive | $15-30/mo base + $0.30-0.50/GB logs (can grow quickly) |
| **Data Retention** | ⭐⭐ Limited | 15-30 days default; extended plans add cost |
| **Alerting** | ⭐⭐⭐⭐⭐ Excellent | Advanced alerting, anomaly detection, correlation |
| **Frontend Integration** | ⭐⭐⭐⭐ Excellent | RUM (Real User Monitoring) SDK; great dashboards |
| **Backend Integration** | ⭐⭐⭐⭐⭐ Excellent | Auto-instrumentation for Node.js; deep traces |
| **Scalability** | ⭐⭐⭐⭐⭐ Excellent | Designed for scale; enterprise-grade |
| **Overkill for Project Scale** | ⭐⭐⭐⭐ Yes | Better for teams >10, $10K+ infrastructure spend |

**Best For**: Mature products with complex systems and large teams
**Limitations**:
- Expensive for early-stage indie projects
- Learning curve steeper than Firebase
- Overkill for small team without DevOps-heavy practice
- Tight integration vendor lock-in

**Cost Breakdown** (100K daily active players):
- Base Datadog subscription: ~$200/mo
- RUM (1GB logs/mo): ~$50/mo
- APM traces (high cardinality): ~$100/mo
- **Total**: ~$350/mo minimum

**Implementation Effort**:
- Frontend SDK: 2 hours
- Backend instrumentation: 3 hours
- Custom dashboards: 4-6 hours
- Alert configuration: 2 hours

---

## Recommendation

### **HYBRID APPROACH: Firebase Analytics + Google Cloud Monitoring + Lean Firestore Metrics**

#### Why This Combination

| Need | Solution | Reason |
|------|----------|--------|
| **User engagement metrics** | Firebase Analytics + GA4 |Native SDKs, cohort analysis, no coding overhead |
| **Infrastructure errors & performance** | Google Cloud Monitoring | Auto-instrumented Cloud Functions & Firestore; real-time alerts |
| **Game-domain metrics** | Custom Firestore `/gameMetrics` | Auditable, queryable, domain-specific; low volume |
| **Real-time alerting** | Cloud Monitoring + PagerDuty/Slack | Combines infra + custom thresholds |

#### Deployment Architecture Overview

```
┌─────────────────┐
│  React Frontend │
│  (Mantine 8)    │
└────────┬────────┘
         │ GA4 SDK events
         │ (engagement, errors)
         ▼
   ┌──────────────────┐
   │ Google Analytics │
   │ (Firebase)       │
   └──────────────────┘

┌──────────────────────┐
│  Cloud Functions     │
│  (game logic)        │
└────────┬─────────────┘
         │ Auto-instrumented
         │ + custom event logs
         ▼
  ┌───────────────────────────┐
  │ Cloud Logging + Monitoring│
  │ (errors, latency, quotas) │
  └───────────┬───────────────┘
              │
              └──────────────────┐
                         ┌──────┴────────┐
                         ▼               ▼
                  ┌──────────┐    ┌──────────────┐
                  │ BigQuery │    │ Alert Policy │
                  └──────────┘    │ (Slack/SMS)  │
                                  └──────────────┘

┌─────────────────────┐
│ Cloud Firestore     │
│ (game data)         │
└────────┬────────────┘
         │ Writes game metrics
         │ to /gameMetrics docs
         ▼
  ┌────────────────────────────┐
  │ Firestore Dashboard        │
  │ (realtime + queries)       │
  └────────────────────────────┘
```

#### Key Advantages

✅ **Low Setup Complexity**: Firebase + GCP ecosystem already integrated
✅ **Cost Effective**: Free tiers cover expected traffic; scales gradually
✅ **Real-time Alerting**: Cloud Monitoring provides <1 minute alert latency
✅ **Auditability**: Game metrics in Firestore; infrastructure metrics in Cloud Logging
✅ **Minimal Vendor Lock-in**: All components are Google services
✅ **Team Familiar**: Team already uses Firebase heavily
✅ **Extensibility**: Foundation for future A/B testing, cohort analysis

#### Cost Estimate (100K DAU Scenario)

| Component | Monthly Cost | Notes |
|-----------|--------------|-------|
| Firebase Analytics | $0 | 10M events/mo free tier |
| Cloud Logging | $50-100 | 5-10GB logs/month |
| Firestore (game metrics) | $20-50 | 1-2M writes/month |
| Cloud Monitoring (alerting) | $0 | Free tier adequate |
| BigQuery (optional) | $0-100 | On-demand queries; can be $0 if careful |
| **Total** | **$70-250/mo** | Scales linearly with traffic |

---

## Phased Implementation Plan

### Phase 1: Basic App Usage Metrics (Priority 1)
**Timeline**: 1-2 weeks
**Goal**: Understand daily player engagement and game progression funnel

#### Phase 1A: Infrastructure (3-4 days)

**1. Enable Firebase Analytics in uno-wf project**
- Switch Firebase Console → Analytics
- Verify GA4 property created (linked to Firebase project)
- Configure data retention settings (2 months minimum)
- Set up BigQuery export for long-term analysis

**2. Configure Google Cloud Monitoring**
- Create custom notification channel (Slack integration)
- Define alert policies for:
  - Cloud Function error rate >1%
  - Cloud Function latency >5s
  - Firestore quota exceeded
- Export Cloud Logging to BigQuery (daily jobs)

**3. Design game metrics schema** (Firestore `/gameMetrics` collection)
- See [Data Schemas](#data-schemas) section for details

#### Phase 1B: Frontend Instrumentation (3-4 days)

**1. Install Firebase Analytics SDK** in React app
```
npm install firebase
```

**2. Define core events** to track:
- `user_signup` - when user creates account
- `game_created` - when user initiates new game
- `game_started` - when game transitions to in_progress
- `game_completed` - when game finishes
- `game_abandoned` - when user leaves without finish
- `session_start` / `session_end` - session lifecycle

**3. Integrate Analytics into React**
- Wrap app with Firebase initialization
- Hook Analytics into routing (page_view events)
- Log custom events at key user actions

**4. Capture frontend errors**
- Attach error handler to window.onerror
- Log client-side JavaScript errors as events

#### Phase 1C: Backend Instrumentation (3-4 days)

**1. Enhanced Cloud Function logging**
- Wrap each function with structured logging:
  ```
  Cloud Function invocation → Log input + timestamp
  → Execute logic
  → Log output + duration
  → Log any errors with context
  ```

**2. Write game metrics to Firestore**
- On game creation: Write to `/gameMetrics/{timestamp}/events/created`
- On game start: Update game doc + write to metrics
- On game completion: Write final scores + player stats to metrics
- On player abandon: Write abort reason + timestamp to metrics

**3. Custom Cloud Function for metrics aggregation** (optional, low-priority)
- Hourly Cloud Scheduler job
- Aggregates previous hour's raw metrics
- Writes daily summaries to `/gameMetrics/daily/{date}`
- Enables quick dashboard queries

#### Phase 1 Success Criteria

✅ Firebase Analytics showing daily active users
✅ Game event funnel visible (created → started → completed)
✅ Slack alerts firing on Cloud Function errors
✅ Gamedata metrics queryable from Firestore console
✅ Dashboard showing:
  - DAU, WAU, MAU
  - Game completion rate
  - Average session duration
  - Game abandonment rate

---

### Phase 2: Error Monitoring & Alarming (Priority 2)
**Timeline**: 2-3 weeks (after Phase 1 complete and stable)
**Goal**: Catch production incidents within minutes, not hours

#### Phase 2A: Client-Side Error Capture (3-4 days)

**1. Global error handler**
- Intercept unhandled JS errors
- Capture stack trace + browser context
- Send to Firebase Analytics (as `app_exception` event)

**2. API error tracking**
- Wrap `httpsCallable()` calls
- Log HTTP status + error message → Analytics
- Categorize:
  - Network errors (client can retry)
  - Auth errors (user needs to login)
  - Server errors (report to backend team)

**3. React error boundary**
- Wrap critical components
- Log component errors → Analytics
- Display fallback UI

#### Phase 2B: Server-Side Error Aggregation (3-4 days)

**1. Enhanced Cloud Function error logging**
```
try {
  // function logic
} catch (error) {
  logger.error({
    function: "functionName",
    userId: request.auth.uid,
    errorCode: error.code,
    errorMessage: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  });
  throw new HttpsError("internal", "User-facing message");
}
```

**2. Firestore write error tracking**
- Catch transaction failures
- Log failed document paths + reasons
- Classify: Quota exceeded vs. validation error vs. permission denied

**3. Write error metrics to Firestore**
- Create `/errorMetrics` collection
- Document structure:
  ```json
  {
    "timestamp": "2026-02-08T14:30:00Z",
    "errorType": "cloud_function | firestore_write | validation",
    "errorCode": "PERMISSION_DENIED",
    "severity": "error | warning",
    "count": 5
  }
  ```

#### Phase 2C: Alert Rules & Response (2-3 days)

**1. Define alert thresholds**
- Error rate >1% of requests
- Any error labeled `severity: critical`
- Specific error codes that indicate systemic issues:
  - DEADLINE_EXCEEDED (functions timing out)
  - PERMISSION_DENIED (Firestore rules too strict)
  - RESOURCE_EXHAUSTED (quota limit hit)

**2. Notification channels**
- Slack channel #uno-alerts
- SMS for critical (on-call rotation)
- PagerDuty integration (optional, Phase 2+)

**3. Alert response playbook**
- Create incident document in shared workspace
- On alert: Auto-trigger Slack notification with:
  - Error type + count
  - Affected users (if applicable)
  - Recent Cloud Function logs (link to Cloud Logging)
  - Suggested actions (restart function? Check quota? Contact support?)

#### Phase 2D: Error Dashboard (2-3 days)

**1. Google Cloud Monitoring dashboard**
- Error rate trend chart
- Error types breakdown (pie chart)
- Top affected functions (bar chart)
- Latency distribution (histogram)

**2. Custom Firestore queries** (via Firebase console)
- Real-time error count
- Errors by user (detect if user-specific issue)
- Errors by game (detect if specific game logic broken)

#### Phase 2 Success Criteria

✅ Client-side error rate visible in analytics
✅ Server-side errors logged + aggregated
✅ Slack alerts firing with relevant context
✅ <5 minute mean-time-to-detection (MTTD)
✅ Error dashboard showing trends + patterns
✅ Incident runbook established & tested

---

### Phase 3: Performance Monitoring (Priority 3+)
**Timeline**: 3-4 weeks (starts after Phase 1-2 stable)
**Goal**: Proactive detection of bottlenecks before users notice

#### What We'll Track
- Cloud Function **cold start latency** (first invocation after deploy)
- Cloud Function **warm latency** (steady state)
- Firestore **read/write latency** by operation type
- Frontend **page load time** (RUM)
- Frontend **interaction latency** (time to response for user actions)
- Database **transaction duration** (for complex multi-step operations)

#### Implementation Approach
1. Cloud Monitoring custom metrics from Cloud Functions
2. Firebase Performance Monitoring SDK (frontend)
3. Firestore operation profiling (application layer)
4. Cloud Trace for distributed tracing (optional)

**Estimated effort**: 10-15 hours design + implementation

---

### Phase 4+: Future Extensibility Hooks

These are foundations laid by Phase 1-2 that enable future features:

#### A/B Testing House Rules
- Use Firebase Analytics to segment users
- Track outcome metrics (completion rate, win rate, satisfaction)
- Create variant cohorts (users in StockingRule variant vs. baseline)

#### Player Progression & Achievements
- Track metrics: games_won_streak, cards_played_total, special_cards_played
- Create achievements based on thresholds
- Leaderboard aggregation via BigQuery

#### Social Features
- Player comparison: "You've played 50 games; your friend has played 30"
- Friend stats dashboards
- Community statistics (most popular house rule variant)

#### Fraud Detection
- Detect unusual play patterns:
  - Win rate >85% (statistically suspicious)
  - Always playing same card sequences
  - Unusual timing patterns (playing at non-human speed)
- Trigger review queue for moderation

---

## Data Schemas

### Phase 1: Game Metrics (Firestore)

**Collection**: `/gameMetrics/{doc}`

**Document Structure**:
```json
{
  "timestamp": "2026-02-08T14:30:00.000Z",  // ISO datetime, unique key
  "eventType": "game_created | game_started | game_completed | game_abandoned",

  // Shared fields
  "gameId": "game-123-abc",
  "userId": "user-456-def",
  "playerCount": 2,
  "houseRules": ["stacking"],

  // game_created event
  "isPrivate": true,
  "maxPlayers": 4,

  // game_started event
  "startedAt": "2026-02-08T14:35:00.000Z",  // null until started

  // game_completed event
  "completedAt": "2026-02-08T15:00:00.000Z",
  "winnerId": "user-456-def",
  "winnerScore": 50,
  "finalScores": [
    { "userId": "user-456-def", "score": 50 },
    { "userId": "user-789-ghi", "score": 85 }
  ],
  "durationSeconds": 1500,

  // game_abandoned event
  "abandonedAt": "2026-02-08T14:50:00.000Z",
  "abandonReason": "user_disconnected | player_timeout | user_quit",
  "activeSeconds": 900
}
```

**Firestore Indexes Required**:
- `eventType + timestamp` (for filtering by event type, sorted by time)
- `gameId + timestamp` (for single game audit trail)

**Data Volume Estimate** (100K DAU):
- ~5 game creation events per day per active user = 500K events/day
- ~60% completion rate = 300K completion events/day
- **~1.5M events/day total**
- Storage: ~150-200MB/day (1-2GB/month after compression)

---

### Phase 1: Firebase Analytics Events

**Event Name**: `game_created`
```json
{
  "parameters": {
    "game_id": "game-123-abc",
    "is_private": true,
    "max_players": 4,
    "house_rules_count": 1,
    "user_id": "user-456-def"
  }
}
```

**Event Name**: `game_started`
```json
{
  "parameters": {
    "game_id": "game-123-abc",
    "player_count": 2,
    "started_after_minutes": 5
  }
}
```

**Event Name**: `game_completed`
```json
{
  "parameters": {
    "game_id": "game-123-abc",
    "winner_id": "user-456-def",
    "duration_seconds": 1500,
    "player_count": 2
  }
}
```

**Event Name**: `game_abandoned`
```json
{
  "parameters": {
    "game_id": "game-123-abc",
    "abandon_reason": "user_disconnected",
    "active_seconds": 900
  }
}
```

**User Properties** (set once per user):
```json
{
  "user_id": "user-456-def",
  "first_play_date": "2026-01-15",
  "creation_date": "2026-01-15"
}
```

---

### Phase 2: Error Metrics (Firestore)

**Collection**: `/errorMetrics/{doc}`

**Document Structure**:
```json
{
  "timestamp": "2026-02-08T14:30:00.000Z",  // Log timestamp
  "severity": "error | warning | critical",

  // Error classification
  "source": "cloudFunction | firestore | frontend | database",
  "errorCode": "INTERNAL | PERMISSION_DENIED | DEADLINE_EXCEEDED | ...",
  "errorType": "validation_error | logic_error | infrastructure_error",

  // Context
  "functionName": "createGame",  // if source == cloudFunction
  "userId": "user-456-def",  // if user-relevant
  "gameId": "game-123-abc",  // if game-relevant

  // Error details
  "message": "User validation failed: invalid email format",
  "stackTrace": "at validateEmail (validator.ts:42:15)...",

  // Metrics
  "count": 1,  // Number of occurrences in this log entry
  "isRecurring": false  // Flag if similar error seen in last hour
}
```

**Firebase Analytics Error Event** (`app_exception`):
```json
{
  "parameters": {
    "description": "PERMISSION_DENIED: Access denied to /games/{gameId}",
    "fatal": false,
    "error_source": "firestore | cloud_function | frontend"
  }
}
```

**Cloud Monitoring Alert Threshold Definitions**:

```yaml
Alert Policy: "High Cloud Function Error Rate"
- Condition: error_count > 10 in last 5 minutes
- Notification: #uno-alerts Slack channel
- Runbook: https://docs.app.com/incident-response

Alert Policy: "Cloud Function Latency Spike"
- Condition: p95 latency > 5000ms in last 5 minutes
- Notification: #uno-alerts Slack channel

Alert Policy: "Firestore Quota Exceeded"
- Condition: quota_exceeded_errors > 0 in last 5 minutes
- Notification: #uno-alerts + SMS (on-call)
```

---

### Summary: Phase 1 & 2 Data Flow

```
Frontend
  ├── GA4 Events → Firebase Analytics (user engagement)
  └── Errors → Firebase Analytics (client errors)

Cloud Functions
  ├── Structured Logs → Cloud Logging (all invocations)
  ├── Game Metrics → Firestore /gameMetrics (audit trail)
  └── Errors → Cloud Logging + Firestore /errorMetrics

Firestore
  ├── Game data → Database (primary data)
  └── Metrics collections → Queries + Dashboards

Cloud Monitoring
  ├── Alerts (error rate, latency, quota)
  └── Slack/SMS Notifications

BigQuery (optional)
  └── Long-term analysis + custom dashboards
```

---

## Architecture Diagram

### System Components & Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    UNO GAME APPLICATION                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────┐         ┌──────────────────────┐  │
│  │   React Frontend     │         │  Cloud Functions     │  │
│  │   (Mantine 8)        │◄────────│  (Node.js 22)        │  │
│  │                      │         │  - createGame        │  │
│  │  GA4 SDK Listener    │         │  - joinGame          │  │
│  │  (tracks events)     │         │  - playCard          │  │
│  │  Error Handler       │         │  - drawCard          │  │
│  │  (captures crashes)  │         │  - etc.              │  │
│  └──────┬───────────────┘         └──────┬───────────────┘  │
│         │                                 │                   │
│         │ GA4 Event                       │ Structured        │
│         │ Stream                          │ Query Logs        │
│         │                                 │                   │
└─────────┼─────────────────────────────────┼───────────────────┘
          │                                 │
┌─────────▼─────────────────────────────────▼───────────────────┐
│              GOOGLE CLOUD INFRASTRUCTURE (GCP)                 │
├───────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Cloud Firestore                                         │ │
│  │  ┌────────────────┐                                      │ │
│  │  │ /games         │ (primary game data)                  │ │
│  │  ├────────────────┤                                      │ │
│  │  │ /users         │ (user profiles)                      │ │
│  │  ├────────────────┤                                      │ │
│  │  │ /gameMetrics   │ ◄─── Phase 1 Events               │ │
│  │  │  ├─ game_created                                      │ │
│  │  │  ├─ game_started                                      │ │
│  │  │  ├─ game_completed                                    │ │
│  │  │  └─ game_abandoned                                    │ │
│  │  ├────────────────┤                                      │ │
│  │  │ /errorMetrics  │ ◄─── Phase 2 Events               │ │
│  │  │  ├─ cloud_function_error                              │ │
│  │  │  ├─ firestore_error                                   │ │
│  │  │  └─ frontend_error                                    │ │
│  │  └────────────────┘                                      │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Cloud Logging (auto-instrumented)                       │ │
│  │  ├─ Cloud Function invocation logs                       │ │
│  │  ├─ Cloud Function error logs                            │ │
│  │  ├─ Firestore operation logs                             │ │
│  │  └─ Access/authentication logs                           │ │
│  └──────┬───────────────────────────────────────────────────┘ │
│         │                                                       │
│         │ Stream via Log Export                                │
│         │                                                       │
│  ┌──────▼────────────────────────────────────────────────────┐ │
│  │  Cloud Monitoring (observability layer)                   │ │
│  │  ├─ Error Rate Metric ──┐                                │ │
│  │  ├─ Latency Metric      ├─→ Alert Policies              │ │
│  │  ├─ Quota Metric ───────┤                                │ │
│  │  └─ Custom Metrics      │                                │ │
│  │                         ▼                                 │ │
│  │                  [Alerting Engine]                        │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                                 │
└──────┬──────────────────────────────────────────────────────┬──┘
       │                                                      │
       │ Alert Notifications                   GA4 Event      │
       │                                         Stream        │
       │                                                      │
    ┌──▼──────────────┐                    ┌─────────────────▼─┐
    │    Slack        │                    │  Firebase        │
    │    #uno-alerts  │                    │  Analytics +     │
    │                 │                    │  Google          │
    │    (P1 & P2)    │                    │  Analytics       │
    └─────────────────┘                    │  (GA4)           │
                                            │                 │
                                            │ Query via       │
                                            │ Analysis Hub    │
                                            └────────┬────────┘
                                                     │
                                                     ▼
                                        ┌──────────────────────┐
                                        │ Analytics Dashboard  │
                                        │ (Query Builder UI)   │
                                        └──────────────────────┘
```

### Data Flow Detail: From Event to Alert

```
PHASE 1: Game Engagement Metrics
════════════════════════════════════

User Action (Frontend)
    ↓
(Game Created)
    │
    ├─→ GA4 Event: {"event": "game_created", "params": {...}}
    │      ↓
    │    Firebase Analytics (GA4)
    │      ↓
    │    [Analysis Hub Dashboard]
    │
    └─→ HTTPS Callable creates game
         ↓
      Cloud Functions (createGame)
         ├─→ Validate input
         ├─→ Create game in Firestore
         ├─→ Write success metric to /gameMetrics
         │     ↓ Auto-indexed
         │   Firestore (realtime)
         │     ↓
         │   [Firestore Console Queries]
         │
         └─→ Structured Log
               ↓
            Cloud Logging
               ↓
            [Monitoring Dashboard]

═══════════════════════════════════════════════════════════════

PHASE 2: Error Monitoring & Alerting
═════════════════════════════════════

Cloud Function Execution
    ├─ Try: execute game logic
    ├─ Catch: validation_error
    │      ↓
    │   logger.error({
    │     errorCode: "VALIDATION_ERROR",
    │     message: "Invalid card played",
    │     userId: "user-123",
    │   })
    │      ↓
    │   Cloud Logging → Error Metric
    │      ↓
    │   [Cloud Monitoring Engine]
    │      ↓
    │   IF error_count > 10 in 5 min:
    │      ↓
    │   Trigger Alert Policy
    │      ↓
    │   ┌───────────────────────────┐
    │   │ Send to Slack Channel     │
    │   │ #uno-alerts               │
    │   │                           │
    │   │ 🚨 High Error Rate Alert  │
    │   │ Errors: 12 in 5 min       │
    │   │ Type: VALIDATION_ERROR    │
    │   │ Function: playCard        │
    │   │                           │
    │   │ [View Logs]  [Open Issue] │
    │   └───────────────────────────┘
    │      ↓
    │   Team responds in Slack
    │   Investigates Cloud Logging
    │   Finds root cause → Hotfix
    │
    └────────────────────────────────

Error metrics ALSO written to Firestore (/errorMetrics)
    ↓
Real-time Firestore listeners (team internal dashboard)
    ↓
Live error stream visible to on-call engineer
```

---

## Failure Scenarios and Mitigation

### Scenario 1: Cloud Logging Quota Exceeded
**Symptom**: Stop receiving logs; can't debug errors
**Root Cause**: Game logic writes verbose logs; quota exceeded
**Mitigation**:
- Set up alert before quota hit (80% threshold)
- Implement log sampling: Only log 10% of successful operations
- Use `debug` level for verbose logs (disabled in production)
- Rotate logs daily to BigQuery (cheaper storage)

### Scenario 2: Firestore Write Quota Hit (Game Metrics)
**Symptom**: Game metrics fail to write; Firestore quota exceeded
**Root Cause**: Metrics collection experiencing write amplification
**Mitigation**:
- Batch writes: Collect events in memory, flush every 60 seconds
- Sample non-critical events (only log 50% of game_started events)
- Use Cloud Scheduler for batch aggregation instead of per-event writes
- Monitor write rate alerting (before quota hit)

### Scenario 3: GA4 Event Loss
**Symptom**: Analytics show gaps in data; not real-time anyway
**Root Cause**: Network failure between frontend + GA4 servers
**Mitigation**:
- GA4 SDK has built-in retry logic; acceptable 1% loss
- Not suitable for auditing or real-time alerts (use Firebase metrics instead)
- Accept inherent 24-48 hour reporting lag

### Scenario 4: Alert Fatigue
**Symptom**: Alerts firing constantly; team ignores them
**Root Cause**: Thresholds set too low
**Mitigation**:
- Start with lenient thresholds; tighten after 1-2 weeks
- Implement alert deduplication (don't send same alert twice in 15 min)
- Escalation policy: Page on-call only for severity=critical
- Regular threshold review (monthly)

### Scenario 5: Data Privacy Concern (User IDs in Logs)
**Symptom**: Compliance require removing user IDs from logs
**Root Cause**: Storing PII in Cloud Logging
**Mitigation**:
- Hash user IDs in error logs (use consistent hash for debugging)
- Use aggregate metrics instead of per-user tracking
- Set log retention to 30 days minimum
- Exclude PII from game metrics collection

---

## Next Steps (Post-Design)

### Immediate (Week 1-2)
1. ✅ **Design complete** (this document)
2. **Present to team** for feedback
3. **Identify blockers**: Do we need new GCP permissions? Billing alerts?
4. **Assign owners**: Who builds Phase 1A, 1B, 1C?

### Short-term (Week 3-4)
1. **Set up Firebase Analytics** in uno-wf project
2. **Create Firestore schema** for `/gameMetrics`
3. **Deploy Phase 1A** (infrastructure setup)
4. **Deploy Phase 1B** (frontend instrumentation)
5. **Deploy Phase 1C** (backend instrumentation)

### Medium-term (Week 5-6)
1. **Data validation**: Check metrics flowing correctly
2. **Dashboard setup**: Configure GA4 Analysis Hub
3. **Feedback**: Team review of metrics quality
4. **Plan Phase 2**: Error handling strategy refinement

### Long-term (Month 2-3)
1. **Phase 2 implementation**: Error monitoring
2. **Incident response training**: Using system for real
3. **Phase 2+ features**: Performance monitoring, advanced analytics

---

## Glossary

| Term | Definition |
|------|-----------|
| **DAU** | Daily Active Users - unique users playing at least once per calendar day |
| **WAU** | Weekly Active Users - unique users playing at least once per calendar week |
| **MAU** | Monthly Active Users - unique users playing at least once per calendar month |
| **GA4** | Google Analytics 4 - Google's latest analytics platform (Firebase property) |
| **MQL** | Monitoring Query Language - GCP Cloud Monitoring query syntax |
| **RUM** | Real User Monitoring - tracking actual user experience (not synthetic tests) |
| **MTTD** | Mean Time To Detection - average time between incident start and alert firing |
| **MTTR** | Mean Time To Recovery - average time between incident detection and resolution |
| **Quota** | GCP service limits (e.g., Firestore: 1M writes/day for Spark tier) |
| **Cold Start** | First Cloud Function invocation after a deployment (slower) |
| **Warm Latency** | Steady-state Cloud Function invocation latency |
| **Cardinality** | Number of unique values in a metric (high cardinality = expensive) |
| **TTL** | Time To Live - how long data persists before automatic deletion |

---

## References

- [Firebase Documentation](https://firebase.google.com/docs)
- [Google Cloud Monitoring](https://cloud.google.com/monitoring)
- [Firebase Analytics Setup Guide](https://firebase.google.com/docs/analytics/get-started)
- [Cloud Functions Logging and Monitoring](https://cloud.google.com/functions/docs/monitoring/logging)
- [Firestore Best Practices](https://firebase.google.com/docs/firestore/best-practices)

---

**Document Version**: 1.0
**Last Updated**: February 8, 2026
**Status**: Ready for Implementation
**Approval**: Pending team review
