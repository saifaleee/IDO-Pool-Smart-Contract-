import { ethers } from "hardhat";

async function main() {
  console.log("Deploying FASTNU Token...");

  // Get the contract factory
  const FASTNUToken = await ethers.getContractFactory("FASTNUToken");

  // Deploy the token
  const fastnu = await FASTNUToken.deploy();

  // Wait for deployment to finish
  await fastnu.waitForDeployment();

  const fastnuAddress = await fastnu.getAddress();
  console.log(`FASTNU Token deployed to: ${fastnuAddress}`);
  console.log("Add this address to your .env file as IDO_TOKEN_ADDRESS");

  // Optional: Deploy IDOPool immediately after token is deployed
  console.log("\nDeploying IDOPool contract...");
  
  // For testing, we'll use FASTNU as both the payment and IDO token
  // In a real scenario, you would use different tokens
  const IDOPool = await ethers.getContractFactory("IDOPool");
  const idoPool = await IDOPool.deploy(fastnuAddress, fastnuAddress);
  
  await idoPool.waitForDeployment();
  console.log(`IDOPool deployed to: ${await idoPool.getAddress()}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 