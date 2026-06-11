# UI Wireframe Plan

## Design System

- **Theme:** Modern healthcare SaaS (teal primary, clean whites, soft shadows)
- **Typography:** Inter font family
- **Components:** Card-based layouts, rounded corners (xl), subtle borders
- **Modes:** Light + Dark (class-based toggle)

## Public Pages

### Home
```
[Navbar: Logo | Home About Doctors Contact | Login Signup]
[Hero: Headline + CTA buttons + gradient background]
[Features grid: 4 cards with icons]
[CTA banner: Emergency-ready messaging]
[Footer]
```

### Doctors Listing
```
[Search bar + filters row]
[Doctor cards grid: Avatar | Name | Specialty | Rating | Fee | Book CTA]
```

## Patient Dashboard

### Layout
```
[Sidebar: Nav items + user avatar + logout]
[Top bar: Theme toggle | Notifications bell]
[Content area: Page-specific content]
```

### Overview
```
[Welcome header]
[4 stat cards row]
[Upcoming appointments list | Quick actions grid]
```

### Appointments
```
[Header + Book New button]
[Appointment cards: Doctor info | DateTime | Status badge | Cancel]
```

### AI Assistant
```
[Chat container full height]
[Message bubbles: user right (teal) | assistant left (gray)]
[Input bar with send button]
```

## Doctor Dashboard

### Overview
```
[Stats: Patients | Today | Pending]
[Bar chart: Monthly appointments]
[Upcoming list]
```

### Appointments
```
[Cards with Accept/Reject/Complete actions]
```

## Admin Dashboard

### Overview
```
[4 KPI cards: Doctors | Patients | Appointments | Revenue]
[Bar chart + Pie chart side by side]
```

### Management Pages
```
[Table/card lists with action buttons]
[Forms for CRUD operations]
```

## Mobile

- Collapsible sidebar (hamburger menu)
- Stacked stat cards (1-2 columns)
- Full-width CTAs
- Bottom-safe chat input
