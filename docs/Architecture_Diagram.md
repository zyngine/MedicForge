# MedicForge Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              END USERS                                       │
│                    (Students, Instructors, Admins)                          │
│                              │                                               │
│                              ▼                                               │
│                      ┌──────────────┐                                        │
│                      │   Browser    │                                        │
│                      │  (HTTPS)     │                                        │
│                      └──────┬───────┘                                        │
└─────────────────────────────┼───────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           VERCEL (CDN/Hosting)                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                     NEXT.JS APPLICATION                                │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │ │
│  │  │   Frontend      │  │   API Routes    │  │   Middleware    │        │ │
│  │  │   (React)       │  │   /api/*        │  │   (Auth/Tenant) │        │ │
│  │  └─────────────────┘  └────────┬────────┘  └─────────────────┘        │ │
│  └────────────────────────────────┼──────────────────────────────────────┘ │
└───────────────────────────────────┼─────────────────────────────────────────┘
                                    │
                 ┌──────────────────┼──────────────────┐
                 │                  │                  │
                 ▼                  ▼                  ▼
┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐
│      SUPABASE      │  │       ZOOM         │  │      STRIPE        │
│  ┌──────────────┐  │  │  ┌──────────────┐  │  │  ┌──────────────┐  │
│  │  PostgreSQL  │  │  │  │  OAuth API   │  │  │  │  Payments    │  │
│  │  Database    │  │  │  │  (Meetings)  │  │  │  │  API         │  │
│  ├──────────────┤  │  │  └──────────────┘  │  │  └──────────────┘  │
│  │  Auth        │  │  │                    │  │                    │
│  │  (Sessions)  │  │  │  Data Accessed:    │  │  Data Accessed:    │
│  ├──────────────┤  │  │  - Meeting info    │  │  - Customer ID     │
│  │  Storage     │  │  │  - User profile    │  │  - Subscription    │
│  │  (Files)     │  │  │                    │  │  - Payment status  │
│  └──────────────┘  │  │                    │  │                    │
└────────────────────┘  └────────────────────┘  └────────────────────┘
```

## Zoom Integration Flow

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  Instructor  │      │  MedicForge  │      │    Zoom      │      │   Supabase   │
│   Browser    │      │   Server     │      │   OAuth      │      │   Database   │
└──────┬───────┘      └──────┬───────┘      └──────┬───────┘      └──────┬───────┘
       │                     │                     │                     │
       │  1. Click "Connect  │                     │                     │
       │     Zoom Account"   │                     │                     │
       │────────────────────>│                     │                     │
       │                     │                     │                     │
       │  2. Redirect to     │                     │                     │
       │     Zoom OAuth      │                     │                     │
       │<────────────────────│                     │                     │
       │                     │                     │                     │
       │  3. Login & Authorize                     │                     │
       │─────────────────────────────────────────>│                     │
       │                     │                     │                     │
       │  4. Redirect with   │                     │                     │
       │     auth code       │                     │                     │
       │<─────────────────────────────────────────│                     │
       │                     │                     │                     │
       │  5. Send auth code  │                     │                     │
       │────────────────────>│                     │                     │
       │                     │                     │                     │
       │                     │  6. Exchange code   │                     │
       │                     │     for tokens      │                     │
       │                     │────────────────────>│                     │
       │                     │                     │                     │
       │                     │  7. Access & Refresh│                     │
       │                     │     tokens          │                     │
       │                     │<────────────────────│                     │
       │                     │                     │                     │
       │                     │  8. Store encrypted │                     │
       │                     │     tokens          │                     │
       │                     │─────────────────────────────────────────>│
       │                     │                     │                     │
       │  9. Connection      │                     │                     │
       │     successful      │                     │                     │
       │<────────────────────│                     │                     │
       │                     │                     │                     │
```

## Creating a Zoom Meeting

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  Instructor  │      │  MedicForge  │      │    Zoom      │      │   Supabase   │
│   Browser    │      │   Server     │      │    API       │      │   Database   │
└──────┬───────┘      └──────┬───────┘      └──────┬───────┘      └──────┬───────┘
       │                     │                     │                     │
       │  1. Create Video    │                     │                     │
       │     Session         │                     │                     │
       │────────────────────>│                     │                     │
       │                     │                     │                     │
       │                     │  2. Get stored      │                     │
       │                     │     Zoom tokens     │                     │
       │                     │<─────────────────────────────────────────│
       │                     │                     │                     │
       │                     │  3. Create meeting  │                     │
       │                     │     (POST /meetings)│                     │
       │                     │────────────────────>│                     │
       │                     │                     │                     │
       │                     │  4. Meeting details │                     │
       │                     │     (ID, join URL)  │                     │
       │                     │<────────────────────│                     │
       │                     │                     │                     │
       │                     │  5. Store session   │                     │
       │                     │     with Zoom link  │                     │
       │                     │─────────────────────────────────────────>│
       │                     │                     │                     │
       │  6. Session created │                     │                     │
       │     with Zoom link  │                     │                     │
       │<────────────────────│                     │                     │
       │                     │                     │                     │
```

## Data Flow Summary

| Source | Destination | Data Type | Purpose |
|--------|-------------|-----------|---------|
| User Browser | MedicForge | Credentials | Authentication |
| MedicForge | Supabase | User Data | Storage & Auth |
| MedicForge | Zoom OAuth | Auth Code | Account Linking |
| Zoom | MedicForge | Access Token | API Authorization |
| MedicForge | Zoom API | Meeting Request | Create Meetings |
| Zoom API | MedicForge | Meeting Details | Display to Users |
| MedicForge | Stripe | Customer Info | Process Payments |

## Security Measures

- All connections use HTTPS/TLS encryption
- Zoom tokens stored encrypted in database
- Row-Level Security (RLS) isolates tenant data
- OAuth state parameter prevents CSRF attacks
- Tokens refreshed automatically before expiry

---

*Use this text to create a visual diagram in your preferred tool (draw.io, Lucidchart, etc.)*
