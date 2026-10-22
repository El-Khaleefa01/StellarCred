# Multi-Network Support with Persistence (Issue #911)

## Overview

This document describes the runtime network selection feature that allows users to switch between Stellar networks (Testnet, Mainnet, Futurenet) without redeployment, with preferences persisted across browser sessions.

## Architecture

### Components

#### 1. **NetworkContext** (`lib/network-context.tsx`)
- Manages runtime network selection state
- Persists user preferences to `localStorage` under key `stellarcred:network-preference`
- Falls back to `NEXT_PUBLIC_STELLAR_NETWORK` environment variable when no preference is saved
- Validates network availability and deprecation status
- Provides `useNetwork()` and `useNetworkConfig()` hooks

**Key Features:**
- 5-minute status cache to avoid excessive checks
- Graceful fallback when localStorage is unavailable (private browsing mode)
- Deprecation warnings for experimental networks (e.g., Futurenet)
- Availability checking (extensible to ping RPC endpoints)

#### 2. **NetworkSelector** (`components/NetworkSelector.tsx`)
- UI component for selecting network
- Displays current network with status indicators
- Dropdown menu showing all available networks with RPC URLs
- Shows warnings for unavailable or deprecated networks
- Accessible with proper ARIA attributes

**UI Features:**
- Network availability indicator (alert icon for unavailable)
- Deprecation warning indicator (info icon)
- Inline warnings below selector when issues detected
- Hover states and visual feedback
- Keyboard navigation support

#### 3. **Network Utilities** (`lib/network-utils.ts`)
- Helper functions for network-specific configuration
- Functions to get RPC URL, passphrase, and explorer URLs per network
- Predicates for checking network characteristics (production, experimental)

### Integration Points

#### Updated Components

1. **`app/layout.tsx`**
   - Wrapped with `NetworkProvider` above `WalletProvider`
   - Network context available to all child components

2. **`components/SiteNav.tsx`**
   - Added `NetworkSelector` to navigation bar
   - Positioned between brand and other navigation items

3. **`components/NetworkBanner.tsx`**
   - Updated to use `useNetwork()` instead of static `NETWORK` constant
   - Dynamically shows correct network in wallet mismatch warnings

4. **`components/ConfigBanner.tsx`**
   - Updated to use `useNetwork()` for displaying active network
   - Dynamic network display in configuration status messages

5. **`components/NetworkMismatchBanner.tsx`**
   - Updated to use `useNetwork()` for correct network labels

#### Core Libraries

1. **`lib/stellar.ts`**
   - Added `DEFAULT_NETWORK` constant (from env vars)
   - Added `getNetworkConfig(network)` function for dynamic config access
   - Maintained backward compatibility with existing `NETWORK` export

## Usage

### For End Users

1. **Selecting a Network:**
   - Click the network selector in the navigation bar
   - Choose from Testnet, Mainnet, or Futurenet
   - Selection is saved and persists across sessions

2. **Network Warnings:**
   - **Unavailable Network:** Red warning if the selected network is unreachable
   - **Deprecated Network:** Yellow warning for experimental or deprecated networks
   - **Wallet Mismatch:** Separate banner when wallet is on a different network

### For Developers

#### Using the Network Context

```tsx
import { useNetwork, useNetworkConfig } from "@/lib/network-context";

function MyComponent() {
  const { network, status, setNetwork, loading } = useNetwork();
  const config = useNetworkConfig(); // Gets preset for current network
  
  // network: "testnet" | "mainnet" | "futurenet"
  // status.available: boolean
  // status.deprecationWarning?: string
  // config: { rpcUrl, networkPassphrase, explorerNetwork }
  
  return (
    <div>
      <p>Current network: {network}</p>
      <p>RPC URL: {config.rpcUrl}</p>
      {!status.available && <p>Network unavailable!</p>}
    </div>
  );
}
```

#### Using Network Utilities

```tsx
import {
  getRpcUrl,
  getNetworkPassphrase,
  getExplorerTxUrl,
  isProductionNetwork,
} from "@/lib/network-utils";

// Get configuration for a specific network
const mainnetRpc = getRpcUrl("mainnet");
const testnetPassphrase = getNetworkPassphrase("testnet");

// Generate explorer URLs
const txUrl = getExplorerTxUrl("abc123...", "testnet");
// → "https://stellar.expert/explorer/testnet/tx/abc123..."

// Check network characteristics
if (isProductionNetwork(network)) {
  // Show extra confirmation for mainnet operations
}
```

## Persistence Behavior

### Storage Key
- `stellarcred:network-preference`

### Fallback Chain
1. **User preference** (localStorage) → takes precedence
2. **Environment variable** (`NEXT_PUBLIC_STELLAR_NETWORK`) → fallback
3. **Default** (`"testnet"`) → ultimate fallback

### Edge Cases Handled
- **Private browsing mode:** Falls back to env var, network selection still works in-session
- **Invalid stored value:** Ignored, falls back to env var
- **Storage unavailable:** Graceful degradation, no errors thrown

## Network Status Checking

### Current Implementation
- Availability assumes all preset networks are available
- Deprecation warnings are hardcoded (e.g., Futurenet warning)
- Status cached for 5 minutes per network

### Future Enhancements
1. **Active RPC Health Checks:**
   ```typescript
   // Ping RPC endpoint to verify it's reachable
   const response = await fetch(preset.rpcUrl, {
     method: 'POST',
     body: JSON.stringify({ jsonrpc: '2.0', method: 'getHealth', id: 1 }),
   });
   ```

2. **External Status API:**
   ```typescript
   // Check Stellar status page or custom service
   const status = await fetch('https://status.stellar.org/api/networks');
   ```

3. **Network Reset Notifications:**
   - Detect when Testnet/Futurenet is scheduled for reset
   - Display countdown or prominent warning
   - Fetch from Stellar Foundation announcements API

## Accessibility

- Network selector button has `aria-label="Select network"`
- Dropdown has `role="menu"` with `menuitem` children
- Warning icons have `aria-label` for screen readers
- Warning banners use `role="alert"` with `aria-live="polite"`
- Keyboard navigation fully supported (Enter/Space to open, Arrow keys to navigate, Escape to close)

## Testing

### Unit Tests
See `components/NetworkSelector.test.tsx`:
- Renders current network correctly
- Opens/closes dropdown
- Persists selection to localStorage
- Shows appropriate warnings

### Integration Testing
```bash
# Run tests
cd frontend
pnpm test NetworkSelector
```

### Manual Testing Checklist
- [ ] Network selection persists across page reloads
- [ ] Network selection persists across browser sessions
- [ ] Switching networks shows appropriate warnings
- [ ] Wallet mismatch banner updates when network changes
- [ ] Config banner shows correct network
- [ ] Works in private browsing mode (doesn't crash, just doesn't persist)
- [ ] Dropdown closes when clicking outside
- [ ] Keyboard navigation works
- [ ] Screen reader announces network changes

## Migration Notes

### Breaking Changes
None. This feature is fully backward compatible.

### Deprecated Patterns
The following pattern is still supported but discouraged:
```tsx
import { NETWORK } from "@/lib/stellar";
// Static import - doesn't respond to runtime network changes
```

**Preferred pattern:**
```tsx
import { useNetwork } from "@/lib/network-context";
const { network } = useNetwork();
// Dynamic - responds to runtime network changes
```

### For Components Outside React Context
Some utility functions and server-side code cannot use React hooks:
```tsx
import { DEFAULT_NETWORK, getNetworkConfig } from "@/lib/stellar";

// Use DEFAULT_NETWORK for SSR or utilities
const config = getNetworkConfig(DEFAULT_NETWORK);
```

## Known Limitations

1. **Contract IDs are environment-specific:** Switching networks at runtime requires that contract IDs for all networks are present in environment variables. Currently, only one set of contract IDs is typically configured.

2. **Wallet reconnection required:** When switching networks, the wallet connection may need to be re-established to match the new network.

3. **No automatic wallet network switching:** The app cannot programmatically change the wallet extension's selected network. Users must manually switch in their wallet.

4. **Build-time contract configuration:** Contract addresses are still configured at build time via environment variables, not runtime.

## Future Enhancements

### Phase 2: Multi-Network Contract Management
- Store contract IDs per network in a config file
- Load appropriate contracts based on selected network
- Support deploying to multiple networks simultaneously

### Phase 3: Network Auto-Detection
- Detect wallet's current network on connection
- Offer to switch app network to match wallet
- Reduce friction for users with strong wallet network preferences

### Phase 4: Custom Network Support
- Allow developers to add custom networks (local, private)
- UI for entering custom RPC URLs and passphrases
- Validation and safety checks for custom configurations

## Troubleshooting

### Network selection doesn't persist
- Check browser's localStorage is enabled
- Verify not in private browsing mode
- Check browser console for storage errors

### Wrong network showing
- Clear localStorage: `localStorage.removeItem('stellarcred:network-preference')`
- Check `NEXT_PUBLIC_STELLAR_NETWORK` environment variable
- Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)

### Network selector not appearing
- Verify `NetworkProvider` wraps your component tree in `app/layout.tsx`
- Check that `NetworkSelector` is imported correctly
- Look for JavaScript errors in browser console

## References

- Issue #911: https://github.com/ToluLabs/StellarCred/issues/911
- Issue #408: Mixed-network configuration detection
- Issue #214: Live wallet network polling
- Stellar Wallets Kit: https://github.com/Creit-Tech/Stellar-Wallets-Kit
