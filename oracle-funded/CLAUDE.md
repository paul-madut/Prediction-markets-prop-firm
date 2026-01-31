# OracleFunded - Prediction Markets Prop Firm

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

## Admin Panel
- Sidebar width: 280px (collapsible to 80px)
- Layout uses AdminContext for state management
- Mock data in `src/data/mock*.ts`
- Types in `src/types/admin.ts`

## Component Guidelines
- Check for existing similar components before creating new ones
- Extend existing component props rather than creating variants
- Use Framer Motion for animations (spring physics preferred)
- Keep components focused - prefer composition over large components

## Testing
- Run `npm run build` to verify TypeScript and build
- Run `npm run dev` to preview changes
