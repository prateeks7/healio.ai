# TeleDoc - AI-Powered Healthcare Platform

A production-quality frontend for the TeleDoc healthcare platform, built with modern web technologies and integrating with a FastAPI backend.

## 🚀 Features

- **Google Authentication**: Secure sign-in with Google OAuth
- **Role-Based Access Control**: Separate interfaces for patients and doctors
- **Medical History Management**: Comprehensive patient intake forms
- **File Upload System**: Upload and manage medical documents with progress tracking
- **AI Chat Interface**: Interactive consultation with the InteractionAgent
- **Diagnosis & Reporting**: AI-powered diagnosis generation with urgency classification
- **Doctor Dashboard**: Review and approve patient reports
- **Responsive Design**: Mobile-first, accessible interface

## 🛠️ Tech Stack

- **Framework**: React + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod validation
- **HTTP Client**: Axios with interceptors
- **File Upload**: react-dropzone
- **Icons**: lucide-react

## 📋 Prerequisites

- Node.js 18+ or Bun
- FastAPI backend running (see backend requirements)
- Google OAuth Client ID

## 🚦 Quick Start

### 1. Install Dependencies

```bash
npm install
# or
bun install
```

### 2. Configure Environment

Create a `.env.local` file in the root directory:

```env
VITE_API_BASE_URL=https://your-fastapi-backend.com
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id
```

### 3. Start Development Server

```bash
npm run dev
# or
bun dev
```

The app will be available at `http://localhost:8080`

## 🏗️ Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # shadcn/ui components
│   ├── AuthGuard.tsx   # Route protection
│   ├── Header.tsx      # App header
│   └── ...
├── lib/                # Utilities and config
│   ├── api.ts          # Axios instance
│   ├── auth.ts         # Authentication helpers
│   ├── queries.ts      # API functions
│   ├── types.ts        # TypeScript types
│   ├── rbac.ts         # Role-based access control
│   └── format.ts       # Formatting helpers
├── pages/              # Route pages
│   ├── Index.tsx       # Dashboard
│   ├── Login.tsx       # Login page
│   └── ...
└── hooks/              # Custom React hooks
```

## 🔐 Authentication Flow

1. User clicks "Sign in with Google"
2. Google OAuth popup appears
3. User authenticates and approves
4. Frontend receives `id_token`
5. Token sent to backend `/auth/google/verify`
6. Backend returns JWT and user profile
7. JWT stored in memory + localStorage
8. All subsequent requests include JWT in Authorization header

## 🎨 Design System

The app uses a medical-inspired design system with:

- **Primary**: Calming blue (#2B7FE7)
- **Accent**: Trustworthy green (#16A34A)
- **Emergency**: Alert red
- **Critical**: Warning amber
- **Routine**: Neutral gray

All colors are defined as CSS variables in `src/index.css` and can be customized.

## 🌐 API Integration

The frontend integrates with these backend endpoints:

- `POST /auth/google/verify` - Authentication
- `GET/PUT /patients/{id}/history` - Medical history
- `POST /patients/{id}/uploads` - File uploads
- `POST /agents/interaction/start` - Start chat
- `POST /agents/interaction/{id}/message` - Send message
- `POST /agents/diagnosis/run` - Run diagnosis
- `POST /agents/report/run` - Generate report
- `GET /doctor/reports` - List reports (doctors)
- `PATCH /doctor/reports/{id}/review` - Review report

See `src/lib/queries.ts` for all API functions.

## 🔒 Security Features

- JWT authentication with automatic token refresh
- 401 response handling (auto-redirect to login)
- Role-based route protection
- Secure credential storage (memory + localStorage)
- Input validation with Zod schemas

## 🎯 User Roles

### Patient
- Complete medical history forms
- Upload medical documents
- Chat with AI agent
- View personal reports
- Generate diagnoses

### Doctor/Admin
- Review unreviewed reports
- Mark reports as reviewed
- Search patient histories
- Access all patient data (with proper authorization)

## 📱 Responsive Design

The app is fully responsive and works on:
- Desktop (1920px+)
- Laptop (1024px+)
- Tablet (768px+)
- Mobile (320px+)

## ♿ Accessibility

- Semantic HTML elements
- ARIA labels and roles
- Keyboard navigation support
- Focus indicators
- High contrast support

## 🧪 Building for Production

```bash
npm run build
# or
bun run build
```

The production build will be in the `dist/` directory.

## 🐛 Common Issues

### Google Sign-In not working
- Ensure `VITE_GOOGLE_CLIENT_ID` is set correctly
- Verify authorized JavaScript origins in Google Console
- Check that redirect URIs are properly configured

### 401 Unauthorized errors
- Check that backend is running
- Verify JWT is being sent in Authorization header
- Ensure backend URL is correct in `.env.local`

### File uploads failing
- Check file size limits on backend
- Verify CORS settings allow file uploads
- Ensure multipart/form-data is properly configured

## 📚 Learn More

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)
- [TanStack Query](https://tanstack.com/query)

## 🤝 Contributing

This is a generated frontend. For modifications:

1. Update design system in `src/index.css` and `tailwind.config.ts`
2. Add new components following existing patterns
3. Maintain TypeScript type safety
4. Follow accessibility best practices

## 📄 License

See project license file.

## 💡 Support

For issues or questions:
1. Check the backend API is running correctly
2. Verify environment variables are set
3. Check browser console for errors
4. Review network tab for API responses
