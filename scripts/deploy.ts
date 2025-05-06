import { ethers } from "hardhat";

async function main() {
  console.log("Deploying IDOPool contract...");

  // Get the contract factory
  const IDOPool = await ethers.getContractFactory("IDOPool");

  // Deploy the contract
  // Note: In a real deployment, you would need to provide actual token addresses
  // For testing, you can deploy mock tokens first and use their addresses
  const paymentTokenAddress = process.env.PAYMENT_TOKEN_ADDRESS;
  const idoTokenAddress = process.env.IDO_TOKEN_ADDRESS;

  if (!paymentTokenAddress || !idoTokenAddress) {
    throw new Error("Payment token and IDO token addresses must be provided in .env file");
  }

  const idoPool = await IDOPool.deploy(paymentTokenAddress, idoTokenAddress);

  // Wait for deployment to finish
  await idoPool.waitForDeployment();

  console.log(`IDOPool deployed to: ${await idoPool.getAddress()}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 