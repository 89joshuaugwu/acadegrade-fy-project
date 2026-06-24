# AcadeGrade: Recent Updates & Monetization

This document details the latest platform updates specifically focused on monetization via Sponsored Adverts and dynamic UI enhancements for the public platform.

## 1. Sponsored Advert Banners (Monetization System)
A fully-featured, non-intrusive advertisement delivery system has been integrated into the platform to allow admins to monetize student traffic.

### Admin Configuration (`/admin/settings`)
- **Multiple Ads**: The Admin Settings page now features a "Sponsored Adverts" section where multiple ad campaigns can be drafted.
- **Direct Cloudinary Uploads**: Admins can directly upload ad banner images from their device without needing external hosting.
- **Target Linking**: Each ad supports an optional target URL.
- **Live Toggles**: Campaigns can be toggled Active/Inactive instantly via the UI without deleting the ad record.

### Student Delivery (`/dashboard`)
- **Smart Delivery**: When an authenticated student visits their dashboard, the platform queries the global `config/settings` document to find the first active advert.
- **6-Hour Cooldown**: The system utilizes the browser's `localStorage` (`advert_dismissed_{ad_id}`) to implement a strict 6-hour cooldown. This ensures users are not spammed with the same ad upon every page refresh.
- **User Experience**: 
  - The ad is delivered via a stunning, glassmorphic pop-up modal (`AnimatePresence`).
  - Clicking the image immediately opens the sponsor's link in a new tab AND dismisses the modal to prevent friction.
  - Users can manually dismiss the ad via a discrete "X" close button.

## 2. Dynamic Developer Profile (`/about`)
The public About page has been upgraded from static hard-coded initials to support dynamic image rendering.

### Implementation
- **Admin Settings**: The Admin can upload a Developer Image directly via the "About Page Content" card in the Admin Settings. It uses the same unsigned Cloudinary preset (`acadegrade_avatars`) used for student profiles.
- **Firestore Sync**: The uploaded `secure_url` is saved to the `config/about` document under the `builderImageUrl` field.
- **Public Rendering**: The `/about` page automatically detects if `builderImageUrl` is present. If it is, it renders the image seamlessly into the Developer profile card. If the field is empty, it elegantly falls back to the glowing "JZ" initials block.

## 3. Database Schema Additions
These updates introduced the following new fields to the global configuration:

**Document:** `/config/settings`
```typescript
{
  advertBanners: Array<{
    id: string;          // Unique timestamp ID
    imageUrl: string;    // Cloudinary URL
    linkUrl: string;     // Sponsor target link
    isActive: boolean;   // Delivery status
  }>
}
```

**Document:** `/config/about`
```typescript
{
  builderImageUrl: string; // The URL to the developer's display image
}
```
