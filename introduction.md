# Seismic Community Dashboard - Introduction

Welcome to the **Seismic Community Dashboard**, a comprehensive platform designed to visualize and analyze the contributions of the Seismic Discord community. This dashboard tracks user activity, role progressions, and overall community health using data from Discord.

Below is a detailed guide to each page and its functionality.

---

## 1. Home / Search (`/`)
The landing page of the application, designed for quick access to individual user data.

**Features:**
-   **User Search:** A central search bar allowing you to find any member by their Discord username.
-   **User Profile Card:** When a user is selected, a dynamic "Identity Card" is displayed showing:
    -   **Profile Picture & Name**: With a glowing "Electric Border" effect.
    -   **Current Magnitude/Role**: Displays the user's highest role (e.g., Magnitude 5).
    -   **Contribution Stats**: Total messages, Tweets, and Art counts.
    -   **Percentile Ranking**: Shows if the user is in the "Top X%" of contributors.
    -   **Achievements**: Badges like "Early Adopter", "Art Lover", or "Consistent".
    -   **Next Goal**: Visual progress bar or indicator showing what is needed to reach the next Magnitude.
-   **Quick Navigation**: Cards linking to Leaderboard, Statistics, and other key pages.

---

## 2. Leaderboard (`/leaderboard`)
A competitive ranking of the most active community members.

**Features:**
-   **Filters:** Toggle between different contribution types:
    -   **Combined**: Overall activity (Tweets + Art).
    -   **Tweet Only**: Rankings based solely on Twitter activity.
    -   **Art Only**: Rankings based solely on Art contributions.
-   **Ranking System**: Users are assigned a numerical rank (#1, #2, #3, etc.) with special highlighting for the top 3.
-   **Infinite Scroll / Pagination**: Load more users as you scroll down.
-   **User Details**: Clicking any row opens the detailed User Modal for that specific member.

---

## 3. Statistics (`/stats`)
A high-level overview of the community's health and trends.

**Features:**
-   **Community Metrics**:
    -   Total Active Users (7-day and 30-day windows).
    -   Total Contributions (broken down by Tweet vs. Art).
-   **Last Updated Indicator**: Shows exactly when the data was last synced from Discord.
-   **Encrypt/Decrypt Mode**: A toggle button that visually "scrambles" or "reveals" numeric data, adding a cypherpunk aesthetic.
-   **Top Contributors**: A quick view of the top 5 users.
-   **Role Distribution**: A visual bar chart showing how many users are in each role (e.g., how many in Magnitude 1 vs Magnitude 5).
-   **Contribution Split**: A progress bar showing the ratio of Tweets vs. Art across the entire server.

---

## 4. Explore (`/explore`)
Allows users to browse the community based on Roles rather than individual searches.

**Features:**
-   **Role Filter**: Clickable badges for every role (Verified, Leader, Magnitude 1-9).
-   **Member List**: selecting a role displays all members who currently hold that role.
-   **Role Stats**: Shows how many messages/contributions each member in that specific role has made.
-   **Navigation**: Click on any user from the list to view their full profile.

---

## 5. Compare (`/compare`)
A "Head-to-Head" battle mode to compare stats between two users.

**Features:**
-   **Dual Search**: Two separate search bars to select "User 1" and "User 2".
-   **Side-by-Side Comparison**:
    -   **Visual Bars**: Colored bars showing who has more contributions in each category (Total, Tweet, Art).
    -   **Rank Comparison**: Shows the global rank difference between the two users.
-   **Analysis Summary**: A generated text summarizing who is leading (e.g., "User A is leading broadly!").
-   **Export**: Option to download the comparison card as an image.

---

## 6. Promotion (`/promotion`)
A weekly hall of fame for members who have leveled up.

**Features:**
-   **Weekly Upgrades**: Lists users who have advanced to a higher Magnitude in the current week.
-   **Grouped by Level**: Users are categorized by their new level (e.g., "Promoted to Magnitude 5").
-   **Electric Cards**: Promoted users are displayed with a special animated card effect.
-   **Share to X**: A button to quickly generate a tweet congratulating the promoted members.

---

## Technical Styles
-   **Aesthetics**: The app uses a "Luxury Gold/Mauve" palette on a dark theme (`#161616` background).
-   **Effects**: Features glassmorphism, glowing borders (`ElectricBorder`), and terminal-style loaders.
