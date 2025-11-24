# Rate Limit Cache Timeline Diagrams

## Before Fix (Buggy Behavior)

### Scenario 1: Masking Service Failure

```
Time:         T+0min      T+2min      T+3min      T+7min      T+18min
              │           │           │           │           │
Status:       [HEALTHY]───┤[DOWN!]────────────────────────────┤
              │           │           │           │           │
Cache:        Cached      Still       Rate Limit  Still       Cache
              "healthy"   using       (429)       using       Expires
              T0          cache       │           cache       │
              │           │           │           │           │
              │           │           ▼           │           │
              │           │       ❌ BUG:         │           │
              │           │       timestamp       │           │
              │           │       updated to      │           │
              │           │       T+3min          │           │
              │           │                       │           │
Reported:     HEALTHY     HEALTHY     HEALTHY     HEALTHY     HEALTHY
              (correct)   (WRONG!)    (WRONG!)    (WRONG!)    (WRONG!)
              │           │           │           │           │
              └───────────┴───────────┴───────────┴───────────┘
              
PROBLEM: Service is DOWN but reported as HEALTHY for 18 minutes!
         (3 minutes before rate limit + 15 minutes after)
```

### Scenario 2: Masking Service Recovery

```
Time:         T+0min      T+2min      T+3min      T+7min      T+18min
              │           │           │           │           │
Status:       [DOWN!]─────┤[RECOVERED]────────────────────────┤
              │           │           │           │           │
Cache:        Cached      Still       Rate Limit  Still       Cache
              "unhealthy" using       (429)       using       Expires
              T0          cache       │           cache       │
              │           │           │           │           │
              │           │           ▼           │           │
              │           │       ❌ BUG:         │           │
              │           │       timestamp       │           │
              │           │       updated to      │           │
              │           │       T+3min          │           │
              │           │                       │           │
Reported:     UNHEALTHY   UNHEALTHY   UNHEALTHY   UNHEALTHY   UNHEALTHY
              (correct)   (WRONG!)    (WRONG!)    (WRONG!)    (WRONG!)
              │           │           │           │           │
              └───────────┴───────────┴───────────┴───────────┘
              
PROBLEM: Service RECOVERED but reported as UNHEALTHY for 18 minutes!
         (3 minutes before rate limit + 15 minutes after)
```

## After Fix (Correct Behavior)

### Scenario 1: Expired Cache Rejected

```
Time:         T+0min      T+4min      T+5min
              │           │           │
Status:       [HEALTHY]───┤[Status    │
              │           │ Unknown]  │
              │           │           │
Cache:        Cached      Cache       Rate Limit
              "healthy"   Expires     (429)
              T0          │           │
              │           │           │
              │           │           ▼
              │           │       ✅ FIX:
              │           │       Cache is 5min old
              │           │       Beyond 4min TTL
              │           │       Reject it!
              │           │           │
Reported:     HEALTHY     [Fresh      ERROR 503
              (correct)   Check       Rate Limited
              │           Needed]     (correct)
              │           │           │
              └───────────┴───────────┘
              
RESULT: Returns rate limit error instead of stale data
        System knows it needs a fresh check
```

### Scenario 2: Fresh Cache Extended

```
Time:         T+0min      T+2min      T+4min      T+15min
              │           │           │           │
Status:       [HEALTHY]───┴───────────┴───────────┤
              │                       │           │
Cache:        Cached      Rate Limit  Next        Cache
              "healthy"   (429)       Check       Expires
              T0          │           Uses        (from T0)
              │           │           Cache       │
              │           ▼           │           │
              │       ✅ FIX:         │           │
              │       Cache is 2min   │           │
              │       old, within     │           │
              │       4min TTL        │           │
              │       Use it!         │           │
              │       Mark as         │           │
              │       rate-limited    │           │
              │       (15min TTL)     │           │
              │       Keep T0!        │           │
              │                       │           │
Reported:     HEALTHY     HEALTHY     HEALTHY     [Expires
              (correct)   (correct)   (correct)   at T+15]
              │           │           │           │
              └───────────┴───────────┴───────────┘
              
RESULT: Cache used but timestamp preserved
        Expires at T+15min (15min from T0, not from T+2)
```

### Scenario 3: Rate-Limited Cache Still Valid

```
Time:         T+0min      T+2min      T+10min     T+15min
              │           │           │           │
Status:       [HEALTHY]───┴───────────┴───────────┤
              │                       │           │
Cache:        Cached      Rate Limit  Rate Limit  Cache
              "healthy"   (429)       (429) Again Expires
              T0          Mark as     │           (from T0)
              │           15min TTL   │           │
              │           │           ▼           │
              │           │       ✅ FIX:         │
              │           │       Cache is 10min  │
              │           │       old, within     │
              │           │       15min extended  │
              │           │       TTL             │
              │           │       Use it!         │
              │           │       Keep T0!        │
              │                       │           │
Reported:     HEALTHY     HEALTHY     HEALTHY     [Expires
              (correct)   (correct)   (correct)   at T+15]
              │           │           │           │
              └───────────┴───────────┴───────────┘
              
RESULT: Extended TTL respected but timestamp still preserved
        Multiple rate limits don't keep extending the expiration
```

## Key Differences

### Before Fix (❌)
- Timestamp updated to `Date.now()` on rate limit
- Cache TTL reset to 15 minutes from rate limit time
- Stale data treated as fresh
- Status changes masked for up to 18 minutes

### After Fix (✅)
- Timestamp preserved on rate limit
- Cache TTL calculated from original fetch time
- Stale data rejected
- Status changes detected within 4-15 minutes (depending on when rate limit occurs)

## Cache State Machine

```
┌─────────────────────────────────────────────────────────┐
│                    Cache Lifecycle                       │
└─────────────────────────────────────────────────────────┘

[Fresh Fetch]
     │
     ├─ Store result with timestamp T0
     ├─ Set rateLimited = false
     └─ Set TTL = 4 minutes
            │
            ▼
┌──────────────────┐
│  Cache Valid     │ ◄──────────────────┐
│  (Age < TTL)     │                    │
└──────────────────┘                    │
     │                                  │
     ├─ On normal request:             │
     │  Return cached data              │
     │  (Age shown in response)         │
     │                                  │
     ├─ On rate limit (429):           │
     │  ├─ Check: Age < TTL?            │
     │  │  ├─ YES ──────────────────────┘
     │  │  │   ├─ Mark rateLimited = true
     │  │  │   ├─ TTL becomes 15 minutes (from T0)
     │  │  │   └─ Return cached data
     │  │  │
     │  │  └─ NO ─────────────┐
     │  │                     │
     │  └──────────────────┐  │
     │                     │  │
     ▼                     ▼  ▼
┌──────────────────┐  ┌────────────────┐
│  Cache Expired   │  │ Rate Limited   │
│  (Age ≥ TTL)     │  │ No Valid Cache │
└──────────────────┘  └────────────────┘
     │                     │
     └─────────┬───────────┘
               │
               ▼
     [Return Error 503]
     Clerk API rate limit
```

## Summary

The fix ensures that:
1. **Cache timestamps represent fetch time, not access time**
2. **Extended TTLs apply forward from original fetch, not from rate limit**
3. **Stale data is never used, even on rate limit**
4. **Status changes are detected within reasonable time windows**

This maintains cache efficiency while ensuring status accuracy.

