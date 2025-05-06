# IDO Pool Frontend

This is the frontend for the IDO Pool smart contract project. It allows users to interact with the IDO Pool contract, buy tokens, claim refunds, claim IDO tokens, and provides an admin panel for contract owners.

## Features

- Wallet connection with MetaMask
- IDO information display (status, countdown timer, token price, soft/hard caps)
- User information (contributions, owed tokens, token balances)
- Token purchase functionality
- Refund claim functionality
- IDO token claim functionality
- Admin panel for contract owners (start/end IDO, trigger refunds)

## Prerequisites

- Node.js (v14 or later)
- npm or yarn
- MetaMask browser extension

## Installation

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Edit the contract address:
Open `src/App.js` and replace `<IDO_POOL_ADDRESS>` with your deployed IDO Pool contract address.

## Usage

1. Start the development server:
```bash
npm start
```

2. Open [http://localhost:3000](http://localhost:3000) in your browser.

3. Connect your MetaMask wallet to interact with the dApp.

## Build for Production

To build the app for production:
```bash
npm run build
```

The build files will be in the `build` folder.

## User Guide

### For Users

1. Connect your wallet using the "Connect Wallet" button.
2. View IDO information and your personal contribution details.
3. When the IDO is active, you can buy tokens by entering the payment amount.
4. After the IDO ends:
   - If successful (soft cap reached), you can claim your IDO tokens.
   - If failed (soft cap not reached), you can claim a refund.

### For Admins

1. Connect with an admin wallet to access the admin panel.
2. Set IDO parameters (already configured at deployment).
3. Start the IDO when ready.
4. End the IDO manually or let users end it after the end time.
5. Trigger a global refund if needed for any reason.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 