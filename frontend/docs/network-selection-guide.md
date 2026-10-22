# Network Selection User Guide

## Switching Networks in StellarCred

StellarCred supports multiple Stellar networks, allowing you to seamlessly switch between Testnet, Mainnet, and Futurenet without redeploying the application.

## Available Networks

### Testnet (Default)
- **Purpose:** Development and testing
- **RPC:** `https://soroban-testnet.stellar.org`
- **Best for:** Learning, development, and testing without real funds
- **Stability:** Stable, recommended for development

### Mainnet
- **Purpose:** Production use with real assets
- **RPC:** `https://soroban.stellar.org`
- **Best for:** Production applications and real transactions
- **Stability:** Production-ready

### Futurenet
- **Purpose:** Experimental features and early testing
- **RPC:** `https://soroban-futurenet.stellar.org`
- **Best for:** Testing upcoming Stellar features
- **Stability:** ⚠️ Experimental - may be reset without notice

## How to Switch Networks

1. **Locate the Network Selector**
   - Find the network dropdown in the top navigation bar
   - It displays your current network (e.g., "Testnet")

2. **Open the Dropdown**
   - Click on the current network name
   - A dropdown menu will appear showing all available networks

3. **Select a Network**
   - Click on your desired network
   - The app will switch immediately
   - Your selection is saved automatically

4. **Reconnect Your Wallet** (if connected)
   - After switching networks, you may need to reconnect your wallet
   - Make sure your wallet extension is also set to the same network
   - Follow any prompts to complete the connection

## Network Warnings

### Wallet Network Mismatch
If you see a yellow warning banner:
- Your wallet is connected to a different network than the app
- **Solution:** Switch your wallet extension to match the app's network
- Or switch the app network to match your wallet

### Network Unavailable
If you see a red warning:
- The selected network's RPC endpoint is unreachable
- **Solution:** Select a different network or try again later
- Check [Stellar Status](https://status.stellar.org) for network health

### Network Deprecated
If you see a yellow info banner:
- The network may be experimental or scheduled for changes
- **Solution:** Read the warning message for details
- Consider using Testnet for stable development

## Your Selection is Saved

- Network preference is saved in your browser
- Persists across page reloads and browser sessions
- Each browser has its own preference
- Private browsing mode won't save (but selection still works for that session)

## Important Notes

### Contract Configuration
- Some features require contracts deployed to your selected network
- If contracts aren't configured for a network, certain features may be disabled
- Check the configuration banner for missing environment variables

### Wallet Compatibility
- Your wallet must support the network you select
- Most wallets support Testnet and Mainnet
- Futurenet support varies by wallet

### Transaction History
- Transactions on different networks are separate
- Testnet transactions don't appear on Mainnet
- Each network has its own explorer at stellar.expert

## Recommended Workflow

### For Development
1. Start with **Testnet**
2. Test all features thoroughly
3. When ready, switch to **Mainnet**

### For Production Use
1. Use **Mainnet** for all real transactions
2. Keep Testnet handy for testing new features
3. Avoid Futurenet for critical operations

### For Testing New Features
1. Use **Futurenet** to try experimental Stellar features
2. Be aware the network may reset
3. Don't rely on it for persistent data

## Troubleshooting

### My selection doesn't save
- Check if localStorage is enabled in your browser
- Try disabling "Clear cookies on exit" for this site
- Use a non-private browsing window

### Wallet won't connect after switching
1. Disconnect your wallet in the app
2. Switch your wallet extension to the correct network
3. Reconnect in the app

### Features are disabled after switching
- Check if contracts are deployed to the new network
- Look for the configuration banner
- Contact the deployment administrator to deploy missing contracts

## Technical Details

For developers interested in the implementation:
- See [NETWORK_SELECTION.md](../NETWORK_SELECTION.md) for technical documentation
- Network selection uses React Context + localStorage
- Falls back to `NEXT_PUBLIC_STELLAR_NETWORK` environment variable
- Fully accessible with keyboard navigation and screen readers

## Need Help?

- Check [Stellar Docs](https://developers.stellar.org/docs)
- Visit [StellarCred Docs](https://stellarcred.xyz/docs)
- Report issues on [GitHub](https://github.com/ToluLabs/StellarCred/issues)
