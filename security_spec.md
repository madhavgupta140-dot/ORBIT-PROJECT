# ORBIT Security Specification & Threat Model (Phase 0: Payload-First Security TDD)

## 1. Data Invariants & Authorization Boundary

- **Identity Integrity**: Every created or modified document (`users/{uid}`, `posts/{postId}`, `stories/{storyId}`, `messages/{msgId}`, etc.) must match `request.auth.uid`. A user cannot forge another creator's UID as author, sender, or owner.
- **PII Isolation**: All sensitive fields (`email`, `phoneNumber`) must reside strictly in `users/{userId}/private/info` and are accessible solely by the owning user (`request.auth.uid == userId`). No non-owner can read or write PII.
- **Username Uniqueness & Exclusivity**: `usernames/{normalizedHandle}` guarantees global single-tenancy. A user can only register or release a username mapping where `uid == request.auth.uid`.
- **Relational Integrity & Immutability**: `authorId`, `senderId`, and `createdAt` must remain strictly immutable across all updates.
- **Audience Boundary**: Posts with `visibility == 'Private'` can only be read by the author. Posts with `visibility == 'Followers'` can only be read by followers or the author. Posts with `visibility == 'Public'` can be read by any authenticated or authorized client.
- **Conversations Privacy**: Direct messages and conversation rooms are strictly constrained to participating UIDs (`request.auth.uid in resource.data.participantIds`).
- **Resource Exhaustion Defense**: Strict string lengths (handles <= 30, display names <= 80, posts <= 2000, stories <= 300) and regex constraints are enforced across all write operations.

---

## 2. The "Dirty Dozen" Malicious Payloads

1. **Payload 1: Impersonated User Profile Creation**
   - User `attacker_uid` attempts `create` on `/users/victim_uid` with `{ id: "victim_uid", name: "Victim", username: "victim" }`.
   - *Expected*: `PERMISSION_DENIED` (`request.auth.uid != userId`).

2. **Payload 2: Username Hijack / Frontrunning**
   - User `attacker_uid` attempts `create` on `/usernames/madhav` with `{ uid: "attacker_uid", username: "madhav" }` while `madhav` is already registered.
   - *Expected*: `PERMISSION_DENIED` (existing document cannot be overwritten).

3. **Payload 3: Unauthenticated PII Scraping**
   - User `attacker_uid` attempts `get` on `/users/victim_uid/private/info`.
   - *Expected*: `PERMISSION_DENIED` (`request.auth.uid != userId`).

4. **Payload 4: Post Author Forgery**
   - User `attacker_uid` attempts `create` on `/posts/post_123` with `{ authorId: "celebrity_uid", text: "Fake signal" }`.
   - *Expected*: `PERMISSION_DENIED` (`incoming().authorId != request.auth.uid`).

5. **Payload 5: Post Ownership Takeover via Update**
   - User `attacker_uid` attempts `update` on `/posts/post_123` changing `{ authorId: "attacker_uid" }`.
   - *Expected*: `PERMISSION_DENIED` (`incoming().authorId != existing().authorId`).

6. **Payload 6: Buffer Overflow / Denial of Wallet via Giant Post**
   - User `user_1` attempts `create` on `/posts/post_123` with a 2MB string in `text`.
   - *Expected*: `PERMISSION_DENIED` (`text.size() <= 2000` rule violation).

7. **Payload 7: Direct Message Eavesdropping**
   - User `attacker_uid` attempts `get` or `list` on `/conversations/conv_userA_userB/messages`.
   - *Expected*: `PERMISSION_DENIED` (`attacker_uid` not in `participantIds`).

8. **Payload 8: Ghost Field Injection (Shadow Update)**
   - User attempts `update` on `/users/{uid}` injecting `{ verified: true, trustLevel: "Trusted" }` when editing their bio.
   - *Expected*: `PERMISSION_DENIED` (profile updates allow only whitelisted keys `['name', 'bio', 'avatar', 'location', 'website', 'interests', 'updatedAt']`).

9. **Payload 9: Invalid Handle Injection**
   - User attempts to register handle `/usernames/bad@handle!` with special symbols or capital letters.
   - *Expected*: `PERMISSION_DENIED` (`pattern` violation `^[a-z0-9_]+$`).

10. **Payload 10: Unauthorized Notification Insertion**
    - Attacker attempts to write arbitrary system alert directly into another user's `/users/victim/notifications/fake_alert`.
    - *Expected*: `PERMISSION_DENIED` (notifications subcollection writes restricted to legitimate actors).

11. **Payload 11: Story Author Spoofing**
    - Attacker publishes a story on `/stories/story_99` setting `authorId: "other_uid"`.
    - *Expected*: `PERMISSION_DENIED` (`authorId` must match `request.auth.uid`).

12. **Payload 12: Catch-all Default-Deny Bypass**
    - Unauthenticated client attempts to query random collection `/system_internal` or write to root `/test_doc`.
    - *Expected*: `PERMISSION_DENIED` (Root match `/{document=**}` denies all non-whitelisted access).

---

## 3. Red Team Security Verification Matrix

| Target Path | Operation | Security Condition | Status |
| :--- | :--- | :--- | :--- |
| `/{document=**}` | read, write | `false` (Default deny) | PASS |
| `/users/{userId}` | read | Public (or signed in) | PASS |
| `/users/{userId}` | write | `request.auth.uid == userId && isValidUser()` | PASS |
| `/users/{userId}/private/info` | read, write | `request.auth.uid == userId` | PASS |
| `/usernames/{username}` | get, list | Public (for availability check) | PASS |
| `/usernames/{username}` | create | `request.auth.uid == incoming().uid && !exists(...)` | PASS |
| `/posts/{postId}` | create | `request.auth.uid == incoming().authorId && isValidPost()` | PASS |
| `/posts/{postId}` | update | `request.auth.uid == existing().authorId && immutableFields()` | PASS |
| `/posts/{postId}` | delete | `request.auth.uid == existing().authorId` | PASS |
| `/stories/{storyId}` | create, delete | `request.auth.uid == authorId` | PASS |
| `/conversations/{convId}` | read, write | `request.auth.uid in resource.data.participantIds` | PASS |
