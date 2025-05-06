# IDO Pool Smart Contract

This repository contains a smart contract for an Initial DEX Offering (IDO) pool that allows users to buy tokens using a custom ERC-20 token.

## Features

- Admin controls for managing the IDO process
- User token purchase functionality
- Refund mechanisms for both users and admin
- IDO token distribution after successful IDO
- Comprehensive test suite

## Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Hardhat

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ido-pool-smart-contract
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Fill in the required environment variables in the `.env` file:
```
INFURA_API_KEY=your_infura_api_key_here
PRIVATE_KEY=your_private_key_here
PAYMENT_TOKEN_ADDRESS=your_payment_token_address_here
IDO_TOKEN_ADDRESS=your_ido_token_address_here
```

## Testing

Run the test suite:
```bash
npx hardhat test
```

## Deployment

### Local Development

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

1. Deploy to Sepolia testnet:
```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

2. Deploy to Goerli testnet:
```bash
npx hardhat run scripts/deploy.ts --network goerli
```

## Contract Usage

### Admin Functions

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

4. Update Token Price:
```solidity
function updateTokenPrice(uint256 _newTokenPrice) external onlyOwner
```

5. Update Caps:
```solidity
function updateCaps(uint256 _newSoftCap, uint256 _newHardCap) external onlyOwner
```

6. Update Schedule:
```solidity
function updateSchedule(uint256 _newStartTime, uint256 _newEndTime) external onlyOwner
```

7. Trigger Global Refund:
```solidity
function triggerGlobalRefund() external onlyOwner
```

8. Disable Global Refund:
```solidity
function disableGlobalRefund() external onlyOwner
```

### User Functions

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

## Security Considerations

- The contract uses OpenZeppelin's ReentrancyGuard to prevent reentrancy attacks
- All user functions are protected with nonReentrant modifier
- Admin functions are protected with onlyOwner modifier
- The contract uses SafeERC20 for token transfers

## License

This project is licensed under the MIT License - see the LICENSE file for details.