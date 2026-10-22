# Network Selector Quick Reference (Issue #911)

## For Users

**Switch Networks:**
1. Click network name in top navigation bar
2. Select from dropdown: Testnet, Mainnet, or Futurenet
3. Selection saves automatically

**Network Icons:**
- 🔴 Red alert icon = Network unavailable
- 🟡 Yellow info icon = Network deprecated/experimental

---

## For Developers

### Basic Usage

```tsx
import { useNetwork } from "@/lib/network-context";

function MyComponent() {
  const { network, status, setNetwork, loading } = useNetwork();
  
  // network: "testnet" | "mainnet" | "futurenet"
  // status.available: boolean
  // status.deprecationWarning?: string
  // loading: boolean
  
  return <div>Current: {network}</div>;
}
```

### Get Network Configuration

```tsx
import { useNetworkConfig } from "@/lib/network-context";

function MyComponent() {
  const config = useNetworkConfig();
  // config.rpcUrl
  // config.networkPassphrase
  // config.explorerNetwork
}
```

### Utility Functions

```tsx
import {
  getRpcUrl,
  getNetworkPassphrase,
  getExplorerTxUrl,
  isProductionNetwork
} from "@/lib/network-utils";

const mainnetRpc = getRpcUrl("mainnet");
const explorerUrl = getExplorerTxUrl(txHash, "testnet");
```

---

## Storage

- **Key:** `stellarcred:network-preference`
- **Values:** `"testnet"` | `"mainnet"` | `"futurenet"`
- **Fallback:** `NEXT_PUBLIC_STELLAR_NETWORK` env var → `"testnet"`

---

## Components Modified

✅ `app/layout.tsx` - Wrapped with NetworkProvider  
✅ `components/SiteNav.tsx` - Added NetworkSelector  
✅ `components/NetworkBanner.tsx` - Uses useNetwork()  
✅ `components/ConfigBanner.tsx` - Uses useNetwork()  
✅ `components/NetworkMismatchBanner.tsx` - Uses useNetwork()  

---

## Files Created

📁 `lib/network-context.tsx` - Context provider & hooks  
📁 `components/NetworkSelector.tsx` - UI component  
📁 `lib/network-utils.ts` - Helper utilities  
📁 `components/NetworkSelector.test.tsx` - Tests  
📁 `NETWORK_SELECTION.md` - Full documentation  

---

## Testing

```bash
# Run tests
pnpm test NetworkSelector

# Type check
npx tsc --noEmit

# Build check
pnpm build
```

---

## Common Issues

**Selection doesn't persist?**
- Check localStorage is enabled
- Not in private browsing mode

**Wrong network showing?**
```js
localStorage.removeItem('stellarcred:network-preference')
```

**Selector not appearing?**
- Verify NetworkProvider in layout.tsx
- Check browser console for errors

---

## Network Presets

| Network    | RPC URL                                | Passphrase                                    |
|------------|----------------------------------------|-----------------------------------------------|
| Testnet    | https://soroban-testnet.stellar.org   | Test SDF Network ; September 2015             |
| Mainnet    | https://soroban.stellar.org           | Public Global Stellar Network ; September 2015 |
| Futurenet  | https://soroban-futurenet.stellar.org | Test SDF Future Network ; October 2022        |

---

## Architecture

```
NetworkProvider (Context)
├── Manages network state
├── Persists to localStorage
├── Checks network status
└── Provides hooks
    ├── useNetwork() - Get/set network
    └── useNetworkConfig() - Get current config
```

---

## Browser Support

- ✅ Chrome/Edge/Brave
- ✅ Firefox  
- ✅ Safari
- ✅ Works without localStorage (no persistence)
- ✅ Private browsing (session only)

---

## Translations

**English:** `public/locales/en.json`  
**Spanish:** `public/locales/es.json`

Keys added:
- `network.selectNetwork`
- `network.unavailable`, `network.unavailableTitle`, `network.unavailableMessage`
- `network.deprecated`, `network.deprecatedTitle`
- `network.switchingWarning`

---

## Future Enhancements

1. **Multi-network contract management** - Store contract IDs per network
2. **Auto-detection** - Detect wallet's network, offer to switch
3. **Health monitoring** - Ping RPCs, show latency
4. **Custom networks** - Add local/private networks

---

## Links

- **Issue:** #911
- **Technical Docs:** `NETWORK_SELECTION.md`
- **User Guide:** `docs/network-selection-guide.md`
- **Implementation Summary:** `IMPLEMENTATION_SUMMARY_911.md`
