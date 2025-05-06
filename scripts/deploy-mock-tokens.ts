import { ethers } from "hardhat";

async function main() {
  console.log("Deploying mock tokens...");

  // Get the contract factory
  const MockToken = await ethers.getContractFactory("MockToken");

  // Deploy payment token
  const paymentToken = await MockToken.deploy("Payment Token", "PAY");
  await paymentToken.waitForDeployment();
  console.log(`Payment Token deployed to: ${await paymentToken.getAddress()}`);

  // Deploy IDO token
  const idoToken = await MockToken.deploy("IDO Token", "IDO");
  await idoToken.waitForDeployment();
  console.log(`IDO Token deployed to: ${await idoToken.getAddress()}`);

  // Mint some tokens to the deployer
  const [deployer] = await ethers.getSigners();
  const mintAmount = ethers.parseEther("1000000"); // 1 million tokens

  await paymentToken.mint(deployer.address, mintAmount);
  await idoToken.mint(deployer.address, mintAmount);

  console.log(`Minted ${ethers.formatEther(mintAmount)} tokens to ${deployer.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 