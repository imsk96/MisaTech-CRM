# Multi-Tenant CRM SaaS - External Storage Mode

A **production-ready** multi-tenant CRM built with external storage architecture. Google Sheets and Excel act as primary data storage, while Supabase serves as the control layer for authentication, company isolation, and approval workflows.

## 🏗️ Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend UI   │────▶│  Approval Engine │────▶│   Sync Engine   │
│  (HTML/CSS/JS)  │     │   (Supabase)     │     │ (Google Sheets) │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                              │
                        ┌─────▼─────┐
                        │ Supabase  │
                        │  (Auth +  │
                        │  Control) │
                        └───────────┘
```

### Key Principles

1. **External Storage**: Business data lives in Google Sheets/Excel, NOT in internal database
2. **Approval Flow**: All staff actions require admin approval before syncing
3. **Multi-Tenant**: Complete company isolation via `company_id` scoping
4. **Role-Based**: Admin vs Staff roles with different permissions

## 📁 Project Structure

```
/workspace
├── index.html              # Main entry point
├── signup.html             # Registration page
├── package.json            # Dependencies
├── vite.config.js          # Build configuration
├── supabase-schema.sql     # Database schema + RLS policies
├── README.md               # This file
│
└── src/
    ├── main.js             # App entry + routing
    ├── styles/
    │   └── main.css        # Modern CRM styles (830+ lines)
    ├── lib/
    │   ├── supabase.js     # Supabase client wrapper
    │   └── auth.js         # Auth manager (signup, signin, sessions)
    ├── utils/
    │   ├── constants.js    # App configuration
    │   └── helpers.js      # Toast, loading, formatting utilities
    └── modules/
        ├── sync.js         # Sync Engine (540+ lines) - CRITICAL
        ├── approvals.js    # Approval Engine (330+ lines)
        ├── leads.js        # Leads module (640+ lines)
        ├── tasks.js        # Tasks module (640+ lines)
        └── settings.js     # Settings + Google Sheets config (660+ lines)
```

## 🚀 Quick Start

### 1. Setup Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run `supabase-schema.sql`
3. Copy your **Project URL** and **Anon Key**

### 2. Configure Credentials

Edit `src/lib/supabase.js`:

```javascript
export const SUPABASE_URL = 'https://your-project.supabase.co';
export const SUPABASE_ANON_KEY = 'your-anon-key';
```

### 3. Install & Build

```bash
npm install
npm run build
npm run dev
```

### 4. Deploy

```bash
# Build for production
npm run build

# Deploy to Netlify
netlify deploy --prod --dir=dist
```

## 🗄️ Database Schema

### Tables

| Table | Purpose |
|-------|---------|
| `companies` | Tenant isolation |
| `users` | User accounts with roles |
| `staff` | Staff profiles linked to users |
| `approvals` | Pending actions queue |
| `integrations` | Google Sheets/Excel configs |
| `sync_logs` | Audit trail for sync operations |

### Row Level Security (RLS)

All tables have RLS enabled with policies:
- Users can only access data from their own company
- Staff can insert into `approvals` but not modify external storage directly
- Admins can approve/reject and trigger sync

## 👥 Role System

### Staff
- ✅ Can CREATE, UPDATE, DELETE records
- ❌ Cannot directly modify external storage
- ⏳ All actions go through approval queue

### Admin
- ✅ Everything Staff can do
- ✅ Can APPROVE/REJECT pending actions
- ✅ Can configure integrations
- ✅ Approved actions trigger Sync Engine

## 🔁 Approval Workflow

```
1. Staff creates/updates/deletes record
         │
         ▼
2. Action stored in `approvals` table
   - status: "pending"
         │
         ▼
3. Admin reviews in Approval Panel
         │
    ┌────┴────┐
    │         │
    ▼         ▼
Approve    Reject
    │         │
    ▼         │
4. Sync       │
   Engine     │
    │         │
    ▼         │
5. Write to  │
   Google    │
   Sheets    │
             │
             ▼
        Discarded
```

## 📊 CRM Modules

### Implemented

| Module | Status | Features |
|--------|--------|----------|
| Dashboard | ✅ | Stats, recent activity |
| Leads | ✅ | Full CRUD, search, filters, export |
| Tasks | ✅ | CRUD, priorities, due dates, overdue tracking |
| Approvals | ✅ | Admin panel, bulk actions |
| Settings | ✅ | Google Sheets config, sync logs, cache management |

### Coming Soon

- Dispatch
- Visit
- Quotation Builder
- Products

## 🔌 Google Sheets Integration

### Features

- OAuth connection flow (manual token entry supported)
- Automatic spreadsheet creation
- Tab setup for each module
- Column mapping system
- Real-time sync on approval

### Column Mapping Example

```javascript
{
  leads: {
    id: 'A',
    lead_name: 'B',
    company: 'C',
    email: 'D',
    phone: 'E',
    source: 'F',
    status: 'G',
    assigned_to: 'H',
    notes: 'I',
    created_at: 'J',
    updated_at: 'K'
  }
}
```

### Setup Steps

1. Go to **Settings** page
2. Click **Connect Google Account** (or enter tokens manually)
3. Select or create a spreadsheet
4. System auto-creates tabs: Leads, Tasks, Dispatch, etc.
5. Configure column mappings if needed

## 🔒 Security

### Multi-Tenant Isolation

```sql
-- Every query is scoped by company_id
SELECT * FROM approvals 
WHERE company_id = current_user_company_id;
```

### RLS Policies

```sql
-- Users can only see their company's data
CREATE POLICY company_isolation ON approvals
  FOR ALL USING (company_id = current_setting('app.current_company_id')::uuid);
```

### XSS Prevention

- All user input is escaped before rendering
- No `innerHTML` with unsanitized data
- Content Security Policy headers recommended

## 🧪 Testing

### Manual Testing Checklist

1. **Signup Flow**
   - [ ] Create new company
   - [ ] Admin account created
   - [ ] Redirected to dashboard

2. **Leads Module**
   - [ ] Create lead → appears in pending approvals
   - [ ] Admin approves → synced to Google Sheets
   - [ ] Edit lead → requires approval
   - [ ] Delete lead → requires approval
   - [ ] Search works
   - [ ] Filter by status works
   - [ ] Export to CSV works

3. **Tasks Module**
   - [ ] Create task with priority/due date
   - [ ] Mark as complete
   - [ ] Overdue detection works
   - [ ] Filter by status/priority

4. **Approvals Panel** (Admin only)
   - [ ] See pending approvals
   - [ ] Approve action → triggers sync
   - [ ] Reject action → discarded

5. **Settings**
   - [ ] Enter Google Sheets credentials
   - [ ] Test connection
   - [ ] View sync logs
   - [ ] Clear cache

### Demo Mode

Without Supabase credentials, the app runs in demo mode:
- Authentication uses localStorage
- Data stored in localStorage
- Approval flow simulated
- No external sync

## 🛠️ Development

### Adding New Modules

1. Create `src/modules/yourModule.js`
2. Implement CRUD methods calling `approvalEngine.submitForApproval()`
3. Add UI renderer function
4. Import in `main.js`
5. Add route in `loadPage()` switch

### Module Template

```javascript
import { authManager } from '../lib/auth.js';
import { approvalEngine } from './approvals.js';

export const yourModule = {
  moduleName: 'your_module',
  
  columnMapping: { /* ... */ },
  
  async create(data) {
    return await approvalEngine.submitForApproval({
      module_name: this.moduleName,
      action_type: 'create', // create | update | delete | bulk_create
      payload: data,
      metadata: { columns: this.columnMapping }
    });
  },
  
  // ... update, delete, etc.
};
```

## 📦 Build & Deploy

### Local Development

```bash
npm install
npm run dev
```

### Production Build

```bash
npm run build
# Output: dist/
```

### Netlify Deployment

1. Connect GitHub repo
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

## 🔧 Environment Variables

Create `.env` file:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 📝 API Reference

### Approval Engine

```javascript
// Submit action for approval
await approvalEngine.submitForApproval({
  module_name: 'leads',
  action_type: 'create', // create | update | delete | bulk_create
  payload: { /* data */ },
  metadata: { /* optional */ }
});

// Get pending approvals (admin)
const pending = await approvalEngine.getPendingApprovals();

// Approve action (triggers sync)
await approvalEngine.approve(approvalId);

// Reject action
await approvalEngine.reject(approvalId);
```

### Sync Engine

```javascript
// Push to Google Sheets
await syncEngine.pushToGoogleSheets({
  spreadsheetId: '...',
  accessToken: '...',
  tabName: 'Leads',
  operation: 'create', // create | update | delete
  data: { /* row data */ },
  columns: { /* mapping */ }
});

// Pull from Google Sheets
const rows = await syncEngine.pullFromGoogleSheets({
  spreadsheetId: '...',
  accessToken: '...',
  tabName: 'Leads'
});
```

## 🐛 Troubleshooting

### "Supabase credentials not configured"

- Check `src/lib/supabase.js` has valid credentials
- Ensure Supabase project is active

### "Connection failed" (Google Sheets)

- Verify access token is valid
- Check spreadsheet ID is correct
- Ensure Google Sheets API is enabled

### Approvals not syncing

- Check admin approved the action
- Verify integration is configured in Settings
- Check sync logs for errors

### Data not appearing

- Clear cache in Settings
- Check company_id matches
- Verify RLS policies are correct

## 📄 License

MIT License - feel free to use in your projects!

---

**Built with ❤️ using Vanilla JS, Supabase, and Google Sheets API**
