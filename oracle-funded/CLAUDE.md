# OracleFunded - Prediction Markets Prop Firm

> **Note**: This documentation should be updated whenever features change. Keep it in sync with the actual implementation.

## Stack
- Next.js 15 App Router with TypeScript
- Tailwind CSS for styling
- Framer Motion for animations
- Lucide React for icons
- Build check: `npm run build`

## Project Structure
- `src/app/` - Next.js pages (App Router)
- `src/components/` - React components organized by feature
- `src/context/` - React context providers
- `src/types/` - TypeScript type definitions
- `src/data/` - Mock data files
- `src/lib/` - Utility functions

## UI Patterns & Conventions
- Use `cn()` from `@/lib/utils` for conditional Tailwind classes
- CardSpotlight component for interactive card hover effects
- Status badges use consistent colors: green=success, red=error, amber=warning, blue=info
- Primary accent color: indigo-600
- Dark cards: gray-900 to gray-800 gradient
- Framer Motion spring physics: `{ type: "spring", stiffness: 500, damping: 35 }`
- AnimatePresence for enter/exit animations

## Admin Panel Overview
- Sidebar width: 280px (collapsible to 80px)
- Layout uses AdminContext for state management
- Mock data in `src/data/mock*.ts`
- Types in `src/types/admin.ts`
- All pages wrapped with ErrorBoundary for error handling
- Toast notifications for user feedback
- Keyboard shortcuts available (press `?` to view)

---

# Admin Dashboard Features

## 1. Challenge Management (`/admin/challenges`)

**Location**: `src/app/admin/challenges/page.tsx`

### Features
- View all challenge configurations in a table
- Create new challenges with ChallengeModal
- Edit existing challenge configurations
- Enable/disable challenges with toggle
- Preview calculations (profit target, loss limits, drawdown in dollars)
- Promotional pricing support with expiration dates

### Components
- **ChallengeModal** (`src/components/admin/challenges/ChallengeModal.tsx`)
  - Full-screen modal with form validation
  - Real-time preview panel
  - Supports both create and edit modes
  - Fields: name, description, account size, pricing, rules, drawdown settings

### State Management
- Uses `createChallengeConfig()` and `updateChallengeConfig()` from AdminContext
- Auto-generates configId with timestamp for new challenges

### How to Add New Challenge Fields
1. Update `AdminChallengeConfig` type in `src/types/admin.ts`
2. Add field to ChallengeModal form state
3. Add input field in modal UI
4. Update preview calculations if needed
5. Update mock data in `src/data/mockChallenges.ts`

---

## 2. Trader Management (`/admin/traders`)

**Location**: `src/app/admin/traders/page.tsx`

### Features
- View all traders in searchable/filterable table
- Multi-select traders with checkboxes
- Batch operations (freeze, unfreeze, export)
- Individual trader actions (freeze, unfreeze, reset, add note, send message)
- Advanced filters (status, phase, risk level, account size)
- CSV export (visible rows, selected traders, or all)
- Click trader name to view detailed profile

### Components
- **TradersTable** (`src/components/admin/traders/TradersTable.tsx`)
  - Multi-select with checkbox column
  - Visual highlighting for selected rows
  - Hover effects and smooth animations

- **BatchActionsBar** (`src/components/admin/traders/BatchActionsBar.tsx`)
  - Sticky bottom bar when traders selected
  - Shows selection count
  - Batch freeze/unfreeze with confirmation
  - Export selected traders to CSV

- **TraderActionsPanel** (`src/components/admin/traders/TraderActionsPanel.tsx`)
  - Freeze/unfreeze account with reason
  - Reset account to starting balance
  - Add internal notes
  - Send messages (email/in-app)
  - Process payouts (funded accounts only)
  - Loading states and success animations

### State Management
- Uses `freezeTrader()`, `unfreezeTrader()`, `resetTraderAccount()` from AdminContext
- Batch operations: `freezeTraders()`, `unfreezeTraders()`
- Selection state: `Set<string>` of trader IDs

### CSV Export
- Uses `csvExport.ts` utility for formatting
- Exports: username, email, status, balance, P&L, risk score, etc.
- Excel-compatible with BOM prefix

---

## 3. Risk Monitoring (`/admin/risk`)

**Location**: `src/app/admin/risk/page.tsx`

### Features
- Real-time risk alerts dashboard
- Filter by severity (high, critical, all)
- Alert types: drawdown_breach, daily_loss_breach, high_risk_behavior
- Click alert to view trader details
- Visual severity indicators with color coding

### Risk Alerts
- **High Severity**: Amber badge, warning icon
- **Critical Severity**: Red badge, alert icon
- Auto-generated based on trader activity

### How It Works
- Mock data in `src/data/mockRiskAlerts.ts`
- Links to trader detail page via traderId
- Real-time monitoring simulation (can be connected to actual trading data)

---

## 4. Financial Management

### Payouts Queue (`/admin/financials/payouts`)

**Features**
- Review pending payout requests
- Approve/reject payouts with confirmation
- Filter by status (pending, approved, rejected, processing)
- View payout amount, profit, and requested date
- Export to CSV

**Components**
- Approve/Reject buttons with ConfirmationModal
- Status badges with animations
- Sort by date, amount, or status

**State Management**
- `approvePayout()`, `rejectPayout()` from AdminContext
- Rejection requires reason input

### Financial Overview (`/admin/financials`)
- Daily revenue charts (placeholder for integration)
- Total revenue, active subscriptions, pending payouts
- Monthly recurring revenue (MRR)

---

## 5. Compliance Center

### KYC Verification (`/admin/compliance/kyc`)

**Location**: `src/app/admin/compliance/kyc/page.tsx`

**Features**
- Review identity verification documents
- Interactive verification checklist (must complete before approval)
- Document viewer with zoom/pan/rotation
- Filter by status (pending, under review, approved, rejected)
- Approve/reject with reason

**Components**
- **DocumentViewer** (`src/components/admin/compliance/DocumentViewer.tsx`)
  - Lightbox-style viewer
  - Zoom: 0.5x to 3x in 0.25 increments
  - Rotation: 90° increments
  - Pan when zoomed (drag with mouse)
  - Keyboard shortcuts: ESC, arrows, +/-, R, F
  - Side panel with metadata

**Verification Checklist**
- Dynamic checklist based on document types
- ID checks: validity, clarity, name match
- Proof of address: recency (3 months), visibility, name match
- Selfie: face visibility, ID match, no filters
- Progress bar shows completion
- Approve button disabled until all checks completed

**How to Add Document Types**
1. Update `KYCDocument` type in `src/types/admin.ts`
2. Add checklist items in `getChecklistItems()` function
3. Update document type labels in `getDocumentTypeLabel()`

### Fraud Alerts (`/admin/compliance`)

**Features**
- View and investigate fraud alerts
- Alert types: duplicate_accounts, suspicious_ip, pattern_trading, unusual_withdrawal
- Assign alerts to admins
- Add investigation notes
- Resolve or dismiss alerts

**Components**
- **FraudAlertModal** (`src/components/admin/compliance/FraudAlertModal.tsx`)
  - Full-screen modal with 4 tabs
  - **Overview**: Alert details, severity, status
  - **Evidence**: Type-specific evidence display
  - **Related Accounts**: Linked suspicious accounts
  - **Activity Log**: Investigation timeline
  - Status workflow: open → investigating → resolved/dismissed
  - Assignment controls

### Audit Logs (`/admin/compliance/audit`)

**Features**
- Complete audit trail of admin actions
- Filter by action type, actor, or date
- Export to CSV for compliance reporting
- Actions logged: trader.freeze, kyc.approve, payout.approve, etc.

**Auto-Logging**
- All AdminContext mutations automatically create audit logs
- Includes: timestamp, actor, action, target, metadata

---

## 6. Settings (`/admin/settings`)

**Location**: `src/app/admin/settings/page.tsx`

### Features
- 4 tabs: General, Notifications, Risk, Users
- Auto-save with 500ms debounce
- localStorage persistence
- Unsaved changes indicator
- Reset to defaults per section
- Keyboard shortcut: Cmd/Ctrl+S to save

### General Settings
- Platform name
- Timezone selection
- Date format (MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD)
- Currency symbol ($, €, £)
- Support email

### Notification Settings
- Email notifications toggle
- Notification triggers (checkboxes):
  - New trader registration
  - Payout submitted
  - KYC pending
  - Risk alerts (high/critical)
  - Fraud alerts
- Digest mode: Realtime vs Daily summary
- Slack webhook URL

### Risk Management Settings
- Alert threshold slider (0-100%)
- Auto-freeze on breach toggle
- High-risk threshold
- Breach grace period

### User Management
- View admin users table
- Roles: super_admin, admin, support, compliance
- Add/edit/remove admins (UI only, not wired to backend)

---

## 7. Notification System

### Components
- **NotificationContext** (`src/context/NotificationContext.tsx`)
  - Global notification state
  - localStorage persistence (max 50 notifications)
  - Functions: `addNotification()`, `markAsRead()`, `markAllAsRead()`, `clearAll()`

- **NotificationBell** (`src/components/admin/layout/NotificationBell.tsx`)
  - Bell icon in top bar
  - Unread badge with count
  - Pulse animation for new notifications
  - Dropdown with recent 5 notifications
  - Relative time formatting (e.g., "5m ago", "2h ago")

- **AdminNotificationBridge** (`src/components/admin/AdminNotificationBridge.tsx`)
  - Connects AdminContext actions to notifications
  - Auto-generates notifications for: payout approval, KYC approval, trader freeze
  - Mock notification generator (every 45s for demo)

### Notification Types
- `info`: General information
- `success`: Successful actions
- `warning`: Warnings and alerts
- `error`: Error messages

### How to Add Notifications
```typescript
import { useNotifications } from "@/context/NotificationContext";

const { addNotification } = useNotifications();

addNotification({
  type: "success",
  message: "Trader account frozen",
  actionUrl: "/admin/traders/123", // optional
});
```

---

## 8. Toast Notifications

**Location**: `src/components/admin/shared/Toast.tsx`

### Features
- Bottom-right corner toasts
- 4 types: info, success, warning, error
- Auto-dismiss after 5 seconds
- Progress bar showing time until dismiss
- Stack vertically with animations
- Click to dismiss

### Usage
```typescript
import { useToast } from "@/components/admin/shared/Toast";

const { showSuccess, showError, showWarning, showInfo } = useToast();

showSuccess("Success!", "Operation completed successfully");
showError("Error", "Something went wrong");
```

---

## 9. Shared Components

### ConfirmationModal
**Location**: `src/components/admin/shared/ConfirmationModal.tsx`

**Features**
- Reusable confirmation dialog
- 3 variants: danger, warning, primary
- Optional text input (for reasons, notes)
- Async operation support with loading states
- Success animation after completion

**Props**
```typescript
interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (inputValue?: string) => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "danger" | "warning" | "primary";
  requireInput?: boolean;
  inputPlaceholder?: string;
  inputLabel?: string;
}
```

### ErrorBoundary
**Location**: `src/components/admin/shared/ErrorBoundary.tsx`

**Features**
- Catches React errors in component tree
- Friendly error UI with icon and message
- "Try Again" button to reset error state
- "Report Issue" button (logs to console)
- Development mode shows error details

**Usage**
- Already wraps all admin pages in `admin/layout.tsx`
- Can be used around specific components for granular error handling

### ExportButton
**Location**: `src/components/admin/shared/ExportButton.tsx`

**Features**
- Dropdown menu with export options
- Export visible rows (current filtered data)
- Export selected rows (if multi-select enabled)
- Export all rows (entire dataset)
- Loading spinner during CSV generation
- Auto-download with timestamp in filename

**Props**
```typescript
interface ExportButtonProps {
  data: any[];
  filename: string;
  columns: ExportColumn[];
  selectedIds?: Set<string>;
  entityIdKey?: string;
}
```

---

## 10. Keyboard Shortcuts

**Trigger Help**: Press `?` anywhere in admin panel

### Global Shortcuts
- `?` - Show keyboard shortcuts help
- `Esc` - Close modal or dialog

### Navigation
- `↑` `↓` - Navigate lists
- `←` `→` - Navigate documents

### Actions
- `Ctrl/Cmd + S` - Save (in Settings page)
- `+` - Zoom in (document viewer)
- `-` - Zoom out (document viewer)
- `R` - Rotate (document viewer)
- `F` - Fit to screen (document viewer)

### Adding New Shortcuts
1. Add to shortcuts array in `KeyboardShortcutsHelp.tsx`
2. Implement keyboard handler in relevant component
3. Prevent default browser behavior if needed
4. Check for input focus to avoid conflicts

---

## State Management Architecture

### AdminContext
**Location**: `src/context/AdminContext.tsx`

**Provides**
- All admin data (traders, KYC, payouts, alerts, etc.)
- CRUD operations for all entities
- Audit logging for all mutations
- Notification callback mechanism

**Key Functions**
```typescript
// Traders
freezeTrader(traderId: string, reason: string)
unfreezeTrader(traderId: string)
resetTraderAccount(traderId: string)
freezeTraders(traderIds: string[], reason: string) // batch
unfreezeTraders(traderIds: string[]) // batch

// KYC
approveKYC(submissionId: string)
rejectKYC(submissionId: string, reason: string)

// Payouts
approvePayout(payoutId: string)
rejectPayout(payoutId: string, reason: string)

// Challenges
createChallengeConfig(config: Omit<AdminChallengeConfig, 'configId'>)
updateChallengeConfig(configId: string, updates: Partial<AdminChallengeConfig>)

// Audit
addAuditLog(action: string, resourceType: string, resourceId: string, metadata?: any)
```

### Context Providers Hierarchy
```
AdminProvider
  └─ NotificationProvider
      └─ ToastProvider
          └─ AdminNotificationBridge
          └─ App content
```

---

## Mock Data Files

All mock data is stored in `src/data/`:

- `mockTraders.ts` - Trader accounts with realistic data
- `mockChallenges.ts` - Challenge configurations
- `mockPayouts.ts` - Payout requests
- `mockKYC.ts` - KYC submissions with documents
- `mockRiskAlerts.ts` - Risk monitoring alerts
- `mockFraudAlerts.ts` - Fraud detection alerts
- `mockAuditLogs.ts` - Admin action audit trail
- `mockDashboard.ts` - Dashboard statistics

### Updating Mock Data
1. Find relevant file in `src/data/`
2. Update data structure if needed
3. Ensure dates are recent (use relative dates)
4. Keep data realistic for testing

---

## CSV Export System

**Location**: `src/lib/csvExport.ts`

### Features
- Converts arrays of objects to CSV
- Excel-compatible with BOM prefix (`\uFEFF`)
- Proper escaping for special characters
- Custom formatters for each column

### Functions
```typescript
arrayToCSV<T>(data: T[], columns: ExportColumn<T>[]): string
downloadCSV(csvContent: string, filename: string): void
formatCurrencyForCSV(cents: number): string
formatDateForCSV(isoDate: string): string
formatPercentForCSV(decimal: number): string
formatBooleanForCSV(value: boolean): string
```

### Usage Example
```typescript
import { arrayToCSV, downloadCSV, formatCurrencyForCSV } from "@/lib/csvExport";

const columns = [
  { key: 'username', label: 'Trader' },
  { key: 'balance', label: 'Balance', format: formatCurrencyForCSV },
  { key: 'createdAt', label: 'Created', format: formatDateForCSV },
];

const csv = arrayToCSV(traders, columns);
downloadCSV(csv, `traders-${Date.now()}.csv`);
```

---

## Animation Patterns

### Spring Physics (Framer Motion)
```typescript
transition: { type: "spring", stiffness: 500, damping: 35 }
```

### Common Animations
```typescript
// Fade in
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
exit={{ opacity: 0 }}

// Scale in
initial={{ opacity: 0, scale: 0.95 }}
animate={{ opacity: 1, scale: 1 }}
exit={{ opacity: 0, scale: 0.95 }}

// Slide in
initial={{ opacity: 0, y: 10 }}
animate={{ opacity: 1, y: 0 }}
exit={{ opacity: 0, y: -10 }}

// Staggered list
transition={{ delay: index * 0.03 }}
```

### Layout Animations
- Use `<LayoutGroup>` for morphing layouts
- Use `layoutId` for shared element transitions
- Example: Filter tabs in KYC page

---

## Component Guidelines
- Check for existing similar components before creating new ones
- Extend existing component props rather than creating variants
- Use Framer Motion for animations (spring physics preferred)
- Keep components focused - prefer composition over large components
- Always add loading states for async operations
- Include empty states with helpful messages
- Wrap forms/actions with error boundaries
- Add keyboard shortcuts where applicable
- Use toast notifications for user feedback

---

## Testing & Development

### Build Verification
```bash
npm run build  # Must complete with 0 TypeScript errors
```

### Development
```bash
npm run dev    # Start development server
```

### Before Committing
1. Run `npm run build` to verify no TypeScript errors
2. Test new features manually in browser
3. Check console for errors/warnings
4. Verify responsive design (desktop/tablet)
5. Test keyboard navigation
6. Update this documentation if features changed

---

## Future Backend Integration

When connecting to a real backend:

1. **Replace AdminContext mock data** with API calls
2. **Update CRUD operations** to use fetch/axios
3. **Add authentication** (JWT tokens, session management)
4. **Implement real-time updates** (WebSockets for notifications)
5. **Add pagination** for large datasets
6. **Implement search API** for advanced filtering
7. **Connect file uploads** for KYC documents
8. **Add image storage** for document viewer
9. **Implement email sending** for notifications
10. **Add analytics tracking** for admin actions

### API Structure Example
```typescript
// Replace AdminContext functions with:
const approveKYC = async (submissionId: string) => {
  const response = await fetch(`/api/admin/kyc/${submissionId}/approve`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to approve KYC');
  return response.json();
};
```

---

## Troubleshooting

### Build Errors
- Check TypeScript errors: `npm run build`
- Verify all imports are correct
- Ensure types match between components and context

### State Not Updating
- Check if AdminContext provider wraps component
- Verify function is called from context, not locally defined
- Check React DevTools for context value

### Animations Not Working
- Ensure Framer Motion is imported
- Check AnimatePresence wraps conditional renders
- Verify initial/animate/exit props are set

### Keyboard Shortcuts Not Working
- Check if input is focused (shortcuts disabled in inputs)
- Verify preventDefault() is called
- Check browser console for conflicts
