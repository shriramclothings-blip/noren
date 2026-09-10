# NOREN Email Portal

Professional email marketing and operations portal for NOREN Fashion.

## Features

- 📧 **Email Composition** - Rich text editor with templates
- 📊 **Campaign Management** - Create, schedule, and track email campaigns
- 👥 **Contact Management** - Unified contact database with segmentation
- 📈 **Analytics Dashboard** - Comprehensive email metrics and insights
- 🤖 **Automation** - Workflow automation for email sequences
- 📝 **Templates** - Reusable email templates library
- 🎯 **Segmentation** - Advanced audience filtering
- 🚫 **Suppression Lists** - Compliance and unsubscribe management
- 🔐 **Role-Based Access** - Admin, marketing, and user roles
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile

## Tech Stack

- **React 18** - Modern React with hooks and concurrent features
- **Vite** - Lightning-fast build tool
- **React Router v6** - Client-side routing
- **Zustand** - Lightweight state management
- **Tailwind CSS** - Utility-first CSS framework
- **React Quill** - Rich text editor
- **Recharts** - Data visualization
- **Axios** - HTTP client

## Quick Start

### Prerequisites

- Node.js 16+ and npm
- Backend API running at `http://localhost:3001`

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.local.example .env.local

# Update .env.local with your API URL
# VITE_API_URL=http://localhost:3001/api
# VITE_EMAIL_API_URL=http://localhost:3001/api/email

# Start development server
npm run dev
```

The portal will be available at **http://localhost:5177**

### Build for Production

```bash
# Build
npm run build

# Preview production build
npm run preview
```

## Environment Variables

Create `.env.local` file in the root directory:

```env
VITE_API_URL=http://localhost:3001/api
VITE_EMAIL_API_URL=http://localhost:3001/api/email
VITE_SITE_URL=http://localhost:5177
VITE_APP_NAME=NOREN Email Portal (Dev)
VITE_APP_VERSION=1.0.0-dev
```

## Project Structure

```
src/
├── components/        # React components
│   ├── layouts/      # Layout components (Dashboard, Auth)
│   ├── common/       # Reusable UI components
│   └── email/        # Email-specific components
├── pages/            # Page components
│   ├── auth/         # Authentication pages
│   └── *.jsx         # Dashboard pages
├── hooks/            # Custom React hooks
├── services/         # API services
│   ├── api.js        # Axios configuration
│   ├── authService.js    # Authentication API
│   └── emailService.js   # Email portal API
├── store/            # Zustand stores
│   ├── authStore.js      # Authentication state
│   └── emailStore.js     # Email portal state
├── utils/            # Utility functions
│   ├── validation.js     # Form validation
│   ├── formatting.js     # Formatters
│   ├── constants.js      # Constants
│   └── helpers.js        # Helper functions
├── styles/           # CSS styles
├── App.jsx           # Main app component
└── main.jsx          # Entry point
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## API Integration

The frontend integrates with NOREN backend API:

### Backend Endpoints Used

**Authentication:**
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile

**Email Operations:**
- `GET /api/email/templates` - List templates
- `POST /api/email/send` - Send email
- `GET /api/email/sent` - List sent emails
- `GET /api/email/drafts` - List drafts
- `POST /api/email/draft` - Save draft

**Campaigns:**
- `GET /api/email/campaigns` - List campaigns
- `POST /api/email/campaigns` - Create campaign
- `POST /api/email/campaigns/:id/send` - Send campaign
- `GET /api/email/campaigns/:id/analytics` - Campaign analytics

**Contacts:**
- `GET /api/email/contacts` - List contacts
- `POST /api/email/contacts/search` - Search contacts
- `POST /api/email/contacts/import` - Import contacts

**Analytics:**
- `GET /api/email/analytics/overview` - Overview metrics
- `GET /api/email/analytics/engagement` - Engagement metrics
- `GET /api/email/analytics/campaigns` - Campaign performance

See `src/services/emailService.js` for complete API documentation.

## Authentication

The portal uses JWT-based authentication:

1. User logs in via `/login`
2. Backend returns JWT token
3. Token stored in localStorage via Zustand persist
4. Token automatically injected into all API requests
5. 401 responses trigger automatic logout and redirect to login

### Role-Based Access

- **Super Admin / Admin / Business Owner** - Full access to all features
- **Store Manager** - Marketing access (campaigns, templates, contacts)
- **User** - Limited access (personal inbox, drafts)

Check roles using:
```javascript
import useAuthStore from '@/store/authStore'

const isAdmin = useAuthStore(state => state.isAdmin())
const hasMarketingAccess = useAuthStore(state => state.hasMarketingAccess())
```

## State Management

### Auth Store

```javascript
import useAuthStore from '@/store/authStore'

// Get state
const { user, token, isAuthenticated } = useAuthStore()

// Actions
const { login, logout, updateUser } = useAuthStore()

// Check permissions
const isAdmin = useAuthStore(state => state.isAdmin())
```

### Email Store

```javascript
import useEmailStore from '@/store/emailStore'

// Get state
const { templates, campaigns, drafts } = useEmailStore()

// Actions
const { setTemplates, addCampaign, startComposing } = useEmailStore()
```

## Styling

Using Tailwind CSS utility classes:

```jsx
<button className="btn btn-primary">
  Primary Button
</button>

<div className="card">
  <div className="card-header">
    Card Title
  </div>
  <div className="card-body">
    Card content
  </div>
</div>
```

Custom components defined in `src/styles/index.css`.

## Development Guidelines

### Component Structure

```jsx
import { useState } from 'react'
import useAuthStore from '@/store/authStore'

const MyComponent = ({ prop1 }) => {
  const user = useAuthStore(state => state.user)
  const [state, setState] = useState(null)

  const handleAction = async () => {
    // Handle action
  }

  return (
    <div>
      {/* Component JSX */}
    </div>
  )
}

export default MyComponent
```

### API Calls

```jsx
import emailService from '@/services/emailService'
import toast from 'react-hot-toast'

const fetchData = async () => {
  try {
    const data = await emailService.getTemplates()
    toast.success('Templates loaded')
    return data
  } catch (error) {
    toast.error(error.message)
  }
}
```

## Testing

```bash
# Run tests (when implemented)
npm run test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Deployment

### Build

```bash
npm run build
```

### Deploy to Vercel

```bash
vercel --prod
```

### Deploy to Netlify

```bash
netlify deploy --prod
```

### Environment Variables

Set these in your deployment platform:

- `VITE_API_URL` - Production backend URL
- `VITE_EMAIL_API_URL` - Production email API URL
- `VITE_SITE_URL` - Production frontend URL

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Create feature branch: `git checkout -b feature/my-feature`
2. Commit changes: `git commit -m 'Add my feature'`
3. Push to branch: `git push origin feature/my-feature`
4. Submit pull request

## License

Copyright © 2024 NOREN Fashion. All rights reserved.

## Support

For support, contact the development team or create an issue in the repository.

---

**Built with ❤️ by the NOREN Team**