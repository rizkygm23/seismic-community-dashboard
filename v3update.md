# v3 Update Notes: Refined Analytics & Ranking Logic

## 🚀 Major Changes

### 1. Refined "Total Contributors" Metric
- **Old Logic:** Counted every single non-bot row in the database (54k+ users), including users who joined but never verified or received a role.
- **New Logic:** Now strictly counts **"Verified Humans"** only. A user is only counted as a "Contributor" if they possess the **`Magnitude 1.0`** role (or higher).
- **Impact:** The "Total Contributors" count on the home page will drop significantly but represents the *actual* active community size.

### 2. Accurate Percentile Rankings (The "Harder" Rank)
- **Old Logic:** Your ranking was calculated against the *entire* database.
  - *Example:* Being rank #X out of 54,000 users (mostly inactive) put you in the **Top 1%**.
- **New Logic:** Your ranking is now calculated **only against Verified Users** (Magnitude 1.0+).
  - *Example:* Being rank #X out of ~4,000 verified users puts you in the **Top 7%**.
- **Why:** This provides a much more realistic and competitive metric. You are now being compared against other actual contributors, not empty accounts.

---

## 🛠 Technical Implementation

### Removed / Deprecated
- Removed the logic that counted raw database rows as "Human Users" in `stats-worker.js`.
- Removed ranking queries in `UserCard.tsx` that compared users against the full `seismic_dc_user` table without role filters.

### Modified Files

#### 1. `stats-worker.js` (Backend Worker)
- Updated the counting loop to check for:
  ```javascript
  if (user.roles && user.roles.includes('Magnitude 1.0')) {
      stats.human_users++;
  }
  ```
- This ensures the global snapshot generated every hour matches the new strict criteria.

#### 2. `src/components/UserCard.tsx` (Frontend)
- Updated all ranking queries (Total, Tweet, Art) to include `.contains('roles', ['Magnitude 1.0'])`.
- This ensures the denominator (Total Users) matches the new "Verified Only" count.

#### 3. `src/components/HomeStats.tsx`
- Consumes the updated snapshot data to display the corrected "Contributors" count on the homepage.
