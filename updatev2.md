# Update V2 Release Notes

This update (Commit `39922e8`) introduces a major overhaul to the Seismic Community Dashboard, bringing a modern, interactive UI and deeper analytical features.

## 🚀 New Features & Pages

### 1. **Interactive Home Dashboard**
- **Bento Grid Layout**: A modern, responsive grid layout (`HomeBentoGrid`) that organizes key metrics at a glance.
- **Live Statistics**: Real-time display of community contributions, total regions connected, and role holders.
- **Typewriter Effect**: Dynamic hero section with a typing animation for a sleek introduction.

### 2. **3D Global Visualization (`/global`)**
- **Interactive Globe**: A fully interactive 3D globe (`Globe` component) that visualizes the community's global presence.
- **Data Integration**: Connects real-world user locations to the 3D visualization using `globe.json`.

### 3. **Deep Dive Exploration (`/explore`)**
- **Role Analytics**: New explorer page to visualize the distribution of community roles (Magnitude 1-9).
- **Role Distribution Hooks**: Added `useRoleDistribution` to efficiently fetch and calculate role statistics.

### 4. **Dedicated Leaderboard (`/leaderboard`)**
- **Expanded Rankings**: a dedicated page for viewing top contributors beyond the home summary.
- **Enhanced Metrics**: clearer visualization of user contributions (Art + Tweets).

### 5. **Enhanced User Profiles (`/user/[username]`)**
- **Dynamic User Pages**: Individual pages for every user with detailed statistics.
- **User Card Export**: Added `UserCardImage` component to support exporting user stats as images.
- **Watermark**: Added custom branding/watermark support for shared images.

## 🎨 UI/UX Improvements

- **Animated Components**:
  - `AnimatedTooltip`: Smooth hovering effects for user avatars in lists.
  - `BentoGrid`: Animated card layouts for better visual hierarchy.
  - `Loader`: Custom loading states for smoother transitions.
- **Responsive Design**: optimized layouts for both desktop and mobile viewing (e.g., collapsible top contributor lists on mobile).
- **Visual Polish**:
  - Consistent use of the "Seismic" color palette.
  - Glassmorphism effects (blur, transparency) in dashboard cards.

## 🛠 Technical Improvements

- **Next.js App Router Structure**: Expanded the use of the App Router with clean, organized route segments (`/global`, `/explore`, `/leaderboard`).
- **Data Hooks**: customized hooks like `useDebounce` and `useRoleDistribution` for better performance and code reusability.
- **Asset Management**: Integrated `globe.json` for managing geospatial data efficiently.
