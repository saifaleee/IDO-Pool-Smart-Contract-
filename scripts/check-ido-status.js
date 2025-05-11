const { ethers } = require("hardhat");

async function main() {
  const idoPoolAddress = "0x7c33fE2D2744Afe0eb0e59577156f512d7E206DF";
  
  // Get the contract instance
  const IDOPool = await ethers.getContractFactory("IDOPool");
  const idoPool = IDOPool.attach(idoPoolAddress);
  
  // Get basic info
  const owner = await idoPool.owner();
  const paymentToken = await idoPool.paymentToken();
  const idoToken = await idoPool.idoToken();
  
  console.log("IDO Pool Address:", idoPoolAddress);
  console.log("Owner:", owner);
  console.log("Payment Token:", paymentToken);
  console.log("IDO Token:", idoToken);
  
  // Get IDO parameters
  const startTime = await idoPool.startTime();
  const endTime = await idoPool.endTime();
  const tokenPrice = await idoPool.tokenPrice();
  const softCap = await idoPool.softCap();
  const hardCap = await idoPool.hardCap();
  const totalRaised = await idoPool.totalRaised();
  const idoActive = await idoPool.idoActive();
  const idoEnded = await idoPool.idoEnded();
  
  console.log("\nIDO Parameters:");
  console.log("Start Time:", new Date(Number(startTime) * 1000).toLocaleString());
  console.log("End Time:", new Date(Number(endTime) * 1000).toLocaleString());
  console.log("Token Price:", ethers.formatEther(tokenPrice), "payment tokens per IDO token");
  console.log("Soft Cap:", ethers.formatEther(softCap), "payment tokens");
  console.log("Hard Cap:", ethers.formatEther(hardCap), "payment tokens");
  console.log("Total Raised:", ethers.formatEther(totalRaised), "payment tokens");
  console.log("IDO Active:", idoActive);
  console.log("IDO Ended:", idoEnded);
  
  // Get current blockchain time
  const latestBlock = await ethers.provider.getBlock("latest");
  console.log("\nCurrent Blockchain Time:", new Date(latestBlock.timestamp * 1000).toLocaleString());
  
  // Calculate time differences
  const now = latestBlock.timestamp;
  if (now < Number(startTime)) {
    console.log(`Time until IDO start: ${Number(startTime) - now} seconds`);
  } else if (now < Number(endTime)) {
    console.log(`Time until IDO end: ${Number(endTime) - now} seconds`);
  } else {
    console.log("IDO time period has ended");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 