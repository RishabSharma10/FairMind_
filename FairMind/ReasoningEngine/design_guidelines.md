# FairMind Design Guidelines

## Design Approach

**Selected Framework:** Material Design + Linear-inspired patterns
**Rationale:** Information-dense real-time collaboration tool requiring clear hierarchy, efficient data display, and professional credibility. Material Design provides excellent component structure for forms and cards, while Linear's modern aesthetic brings clarity to complex interfaces.

---

## Typography System

**Font Stack:**
- **Primary:** Inter (via Google Fonts CDN) - body text, UI elements, messages
- **Accent:** Space Grotesk (via Google Fonts CDN) - headings, resolution titles

**Hierarchy:**
- H1 (Landing hero): text-5xl font-bold (Space Grotesk)
- H2 (Section headers): text-3xl font-semibold (Space Grotesk)
- H3 (Card titles, resolution headers): text-xl font-semibold (Inter)
- Body Large (resolution descriptions): text-base leading-relaxed (Inter)
- Body (messages, forms): text-sm leading-normal (Inter)
- Caption (timestamps, metadata): text-xs text-opacity-60 (Inter)
- Button Text: text-sm font-medium uppercase tracking-wide (Inter)

---

## Layout & Spacing System

**Core Spacing Units:** Tailwind classes `p-2`, `p-4`, `p-6`, `p-8`, `gap-4`, `gap-6`, `gap-8`
- Micro spacing (form fields, buttons): 2-4 units
- Component padding: 6 units
- Section spacing: 8-12 units
- Page margins: 8 units mobile, 12-16 desktop

**Grid Strategy:**
- Landing page: Single column mobile, max-w-6xl centered desktop
- Room interface: CSS Grid with `grid-cols-1 lg:grid-cols-[1fr_400px_1fr]` (left user | center controls | right user)
- Resolution cards: `grid-cols-1 md:grid-cols-3 gap-4`
- Dashboard: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`

---

## Component Library

### Navigation & Authentication
**Top Navigation Bar:**
- Fixed header with `h-16`, subtle border bottom
- Logo left, user avatar + dropdown right
- Transparent on landing, solid on authenticated pages
- Mobile: Hamburger menu with slide-out drawer

**Login/Register Forms:**
- Center card layout with `max-w-md mx-auto`
- Form fields with floating labels (Material Design pattern)
- Input height `h-12` with `px-4` padding
- Stacked layout with `space-y-4`
- Primary action button full-width `w-full h-12`
- Google OAuth button with logo, outline style, `h-12`
- Gender dropdown: custom select with chevron icon
- Age input: number type with increment controls
- Link to alternate form (login↔register) below buttons

### Landing Page
**Hero Section:**
- Height: `min-h-[85vh]` with centered content
- Large image: Full-bleed background with gradient overlay (dark-to-transparent from bottom)
- Hero image description: Professional mediation scene - two people sitting across from each other at a modern table with a tablet/device between them, soft natural lighting, collaborative atmosphere, muted professional tones
- Headline + subheadline stack with `space-y-6`
- Primary CTA button with blur backdrop: `backdrop-blur-md bg-white/10 border border-white/20` - no hover states needed
- Trust indicator below CTA: "Join 10,000+ successful resolutions" with small checkmark icon

**Features Section:**
- Grid of 6 feature cards: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- Each card: icon (Heroicons), title (H3), description (Body), `p-6` padding, subtle border
- Icons positioned top-left with `mb-4`

**How It Works Section:**
- Timeline layout with 4 steps
- Numbered circles connected by vertical line (desktop) or dots (mobile)
- Step cards with `pl-16` (space for number circle), `pb-8` between steps

**Social Proof Section:**
- 3 testimonial cards with user photo, quote, name, role
- Rounded user avatars `w-12 h-12`
- Quote marks icon large and faded in background

### Room Interface (Core Application)
**Split-Pane Layout:**
- Three-column grid: `grid-cols-1 lg:grid-cols-[1fr_400px_1fr]`
- Left pane: User A messages + avatar header
- Center pane: Input controls + resolutions panel
- Right pane: User B messages + avatar header

**User Pane Headers:**
- Avatar `w-16 h-16 rounded-full` with presence indicator (green dot `w-3 h-3` bottom-right)
- Name in H3, status text below ("Active" or "Joined 2m ago")
- Header height: `h-20` with `px-6` padding

**Message Display:**
- Scrollable container `flex-1 overflow-y-auto px-4 py-6`
- Message bubbles: `max-w-[80%]` width
- Own messages: right-aligned with rounded-l-2xl rounded-tr-2xl
- Other messages: left-aligned with rounded-r-2xl rounded-tl-2xl
- Voice messages: Play button icon + waveform visualization + duration
- Transcript below voice message in Caption typography with italic
- Timestamp: Caption size, `mt-1`
- Avatar for each message: `w-8 h-8 rounded-full` inline

**Center Control Panel:**
- Fixed position panel with two zones: input (top) and resolutions (bottom)
- Input zone: `h-32` with record button (large circular `w-20 h-20`) and text input side-by-side
- Record button: Pulse animation when active, microphone icon (Heroicons)
- Text input: `h-12 rounded-full px-6` with send icon button inline
- Resolutions zone below: expands when AI generates options

**Resolution Cards:**
- Three cards in horizontal row (stack on mobile)
- Each card: `p-6 rounded-lg border-2`
- Badge: "AI Recommended" for highest score card (top-right corner)
- Title: H3 with `mb-3`
- Description: Body Large with `mb-4`
- Confidence score: Progress bar `h-2 rounded-full` with percentage text
- Select button: Full-width at bottom `w-full h-11`
- Selected state: Thicker border `border-4`, checkmark icon appears

**Resolved Modal:**
- Centered overlay with backdrop blur `backdrop-blur-md`
- Modal card: `max-w-md p-8 rounded-2xl`
- Confetti animation (Lottie or CSS) briefly on appear
- Large success icon (checkmark in circle) `w-24 h-24 mx-auto mb-6`
- Resolution title repeated with "Both of you agreed" text
- Action buttons: "Save to History" (primary), "Start New" (secondary), stacked with `space-y-3`

### Dashboard
**History Grid:**
- Cards displaying past arguments: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`
- Each card: `p-6 rounded-lg border` with hover lift effect
- Card header: Date + participants (avatars overlapped)
- Snippet of initial argument: truncated text `line-clamp-2`
- Resolution badge: "Resolved" with checkmark or "Unresolved"
- View button: Small outline button bottom-right

**Stats Summary:**
- Top row with 4 metric cards: Total arguments, Resolved rate, Avg time, Success rate
- Each stat card: `p-6` with large number (text-3xl font-bold) and label below

---

## Interaction Patterns

**Loading States:**
- Resolution generation: Skeleton cards with shimmer animation
- Message sending: Optimistic UI with opacity 0.6 until confirmed
- Voice transcription: Animated dots "Transcribing..."

**Empty States:**
- New room before messages: Centered illustration placeholder with "Start the conversation" text
- No history: Empty state graphic with "No arguments yet" and CTA to create room

**Error States:**
- Toast notifications slide from top-right: `max-w-sm p-4 rounded-lg` with icon + message + close button
- Inline form errors: Red text below field with error icon

**Rate Limit UI:**
- Banner at top when approaching limit: "2/3 free resolutions used today"
- Upgrade CTA appears when limit hit

---

## Icons & Assets

**Icon Library:** Heroicons (via CDN)
- Microphone (record button)
- Paper airplane (send message)
- Check circle (resolved state)
- User circle (avatars fallback)
- Clock (timestamps)
- Sparkles (AI recommendations)
- X mark (close modals)

**Images:**
- **Hero image:** Full-bleed professional mediation scene (described above)
- **How It Works:** Small illustrative icons for each step (can use icon library)
- **Testimonials:** User photos `w-12 h-12 rounded-full`
- **Empty states:** Simple line illustrations

---

## Accessibility & Forms

**All Form Inputs:**
- Consistent height `h-12` with `px-4` padding
- Border `border-2` with focus ring
- Label always visible (floating or above)
- Required indicator asterisk
- Error state with icon + message below
- Touch target minimum 44x44px

**Focus States:**
- Keyboard navigation visible with focus ring `ring-2 ring-offset-2`
- Skip to content link for screen readers

**ARIA Labels:**
- All buttons have descriptive aria-labels
- Live regions for real-time message updates
- Role="status" for presence indicators