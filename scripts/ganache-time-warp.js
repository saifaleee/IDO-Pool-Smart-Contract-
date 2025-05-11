const { ethers } = require("hardhat");

async function main() {
  const idoPoolAddress = "0x7c33fE2D2744Afe0eb0e59577156f512d7E206DF";
  
  console.log("Starting Ganache time warp IDO setup...");
  
  // Get the contract instance
  const IDOPool = await ethers.getContractFactory("IDOPool");
  const idoPool = IDOPool.attach(idoPoolAddress);
  
  // Step 1: Set the parameters with a longer buffer (1 minute)
  const now = Math.floor(Date.now() / 1000);
  const startTime = now + 60; // 1 minute in the future
  const endTime = startTime + (24 * 60 * 60);
  const tokenPrice = ethers.parseEther("0.001");
  const softCap = ethers.parseEther("10");
  const hardCap = ethers.parseEther("100");
  
  console.log(`Setting IDO parameters:
  - Current time: ${new Date(now * 1000).toLocaleString()}
  - Start Time: ${new Date(startTime * 1000).toLocaleString()} (1 minute from now)
  - End Time: ${new Date(endTime * 1000).toLocaleString()}`);
  
  console.log("\nStep 1: Setting IDO parameters...");
  const tx = await idoPool.setIDOParameters(
    startTime,
    endTime,
    tokenPrice,
    softCap,
    hardCap
  );
  
  console.log("Transaction hash:", tx.hash);
  await tx.wait();
  console.log("IDO parameters set successfully!");
  
  // Step 2: Warp time forward
  console.log("\nStep 2: Warping time forward by 70 seconds...");
  
  try {
    // This only works with Ganache/Hardhat node
    await network.provider.send("evm_increaseTime", [70]); // Increase by 70 seconds
    await network.provider.send("evm_mine"); // Mine a new block
    
    // Get the new block timestamp to verify time warp
    const latestBlock = await ethers.provider.getBlock("latest");
    console.log("New block timestamp:", new Date(latestBlock.timestamp * 1000).toLocaleString());
    console.log("Time warp successful!");
    
    // Step 3: Start the IDO now that time has been warped forward
    console.log("\nStep 3: Starting IDO...");
    const startTx = await idoPool.startIDO();
    console.log("Start transaction hash:", startTx.hash);
    await startTx.wait();
    console.log("IDO started successfully!");
    
    console.log("\nYour IDO is now active! Use the frontend to interact with it.");
  } catch (error) {
    console.error("Error:", error.message);
    
    if (error.message.includes("evm_increaseTime")) {
      console.log("\nYour Ganache instance doesn't support time manipulation through RPC.");
      console.log("Try this instead:");
      console.log("1. Restart Ganache with the -b or --blocktime option to set automatic time increments");
      console.log("2. Example: ganache --blocktime 1");
      console.log("3. Then try running the script again");
    } else if (error.message.includes("IDO has not reached start time")) {
      console.log("\nTime manipulation didn't work as expected.");
      console.log("Try starting the IDO manually from the frontend after waiting 1-2 minutes.");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Script error:", error);
    process.exit(1);
  }); 