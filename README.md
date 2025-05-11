# IDO Pool Smart Contract

This repository contains a smart contract for an Initial DEX Offering (IDO) pool that allows users to buy tokens using a custom ERC-20 token.

## Features

- Admin controls for managing the IDO process
- User token purchase functionality
- Refund mechanisms for both users and admin
- IDO token distribution after successful IDO
- Custom FASTNU token implementation
- Frontend dApp for interacting with the contracts

## Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Hardhat
- Ganache (for local development)
- MetaMask browser extension

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd IDO-Pool-Smart-Contract-
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file:
```bash
# Private key for deployment
PRIVATE_KEY=your_private_key_here

# Optional: Only needed for testnet deployment
INFURA_API_KEY=your_infura_api_key_here
```

## Deployment

### Using Ganache (Recommended for Development)

1. Start Ganache on port 7545 with Chain ID 1337:
   - Using Ganache UI: Configure the workspace to use port 7545
   - Or using command line: `ganache --port 7545 --chain.chainId 1337`

2. Deploy the FASTNU token and IDO Pool contract:
```bash
npx hardhat run scripts/deploy-fastnu.ts --network ganache
```

3. Initialize and start the IDO with proper time settings:
```bash
npx hardhat run scripts/ganache-time-warp.js --network ganache
```

4. Check the IDO status:
```bash
npx hardhat run scripts/check-ido-status.js --network ganache
```

### Using Hardhat Network

1. Start a local Hardhat node:
```bash
npx hardhat node
```

2. Deploy mock tokens:
```bash
npx hardhat run scripts/deploy-mock-tokens.ts --network localhost
```

3. Deploy the IDO Pool contract:
```bash
npx hardhat run scripts/deploy.ts --network localhost
```

### Testnet Deployment

1. Make sure your `.env` file has the correct PRIVATE_KEY and INFURA_API_KEY.

2. Deploy to Sepolia testnet:
```bash
npx hardhat run scripts/deploy-fastnu.ts --network sepolia
```

## Frontend Setup

The project includes a React frontend to interact with the contracts.

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. The application will be available at http://localhost:3000

## Using the dApp

### Connect MetaMask

1. Configure MetaMask to connect to your network:
   - For Ganache: 
     - Network Name: Ganache
     - RPC URL: http://127.0.0.1:7545
     - Chain ID: 1337
     - Currency Symbol: ETH

2. Import the account that deployed the contracts or any other account with funds.

### Add FASTNU to MetaMask

1. In MetaMask, click "Import tokens"
2. Select "Custom token" tab
3. Enter the token address (printed during deployment)
4. The token symbol "FASTNU" and decimals "18" should auto-fill
5. Click "Add Custom Token" and then "Import Tokens"

### Participating in the IDO

1. Connect your wallet to the dApp
2. Enter the amount of FASTNU tokens you want to contribute
3. Click "Buy Tokens"
4. Approve the transaction in MetaMask

### Admin Functions

The address that deployed the contracts is the admin and can:
- Start the IDO
- End the IDO
- Trigger global refund

## Contract Details

### FASTNU Token

The FASTNU token is an ERC-20 token used for both the payment token and the IDO token in this example. Key features:

- Initial supply: 1,000,000 tokens
- Mintable by the owner
- Standard ERC-20 functionality

### IDO Pool

The IDO Pool contract manages the token sale process:

#### Admin Functions

1. Set IDO Parameters:
```solidity
function setIDOParameters(
    uint256 _startTime,
    uint256 _endTime,
    uint256 _tokenPrice,
    uint256 _softCap,
    uint256 _hardCap
) external onlyOwner
```

2. Start IDO:
```solidity
function startIDO() external onlyOwner
```

3. End IDO:
```solidity
function endIDO() external
```

4. Trigger Global Refund:
```solidity
function triggerGlobalRefund() external onlyOwner
```

#### User Functions

1. Buy Tokens:
```solidity
function buyTokens(uint256 _paymentAmount) external nonReentrant
```

2. Claim Refund:
```solidity
function claimRefundUser() external nonReentrant
```

3. Claim IDO Tokens:
```solidity
function claimIDOTokens() external nonReentrant
```

## Troubleshooting

### Time Synchronization Issues

If you experience issues with time synchronization between JavaScript and the blockchain:

1. Use the `ganache-time-warp.js` script which uses Ganache's time manipulation features.
2. Or restart Ganache with a blocktime setting: `ganache --blocktime 1`

### Token Balance Not Showing

If tokens don't appear in MetaMask:
1. Make sure you've added the token to MetaMask using the correct token address
2. Verify that transactions were successful in the dApp or Ganache UI

## Security Considerations

- The contract uses OpenZeppelin's ReentrancyGuard to prevent reentrancy attacks
- All user functions are protected with nonReentrant modifier
- Admin functions are protected with onlyOwner modifier
- The contract uses SafeERC20 for token transfers

## License

This project is licensed under the MIT License - see the LICENSE file for details.