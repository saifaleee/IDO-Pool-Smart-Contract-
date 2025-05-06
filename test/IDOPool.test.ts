import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

// Helper function to convert to wei
function toWei(value: number | string): bigint {
  return ethers.parseEther(value.toString());
}

describe("IDOPool", function () {
  let idoPool: Contract;
  let paymentToken: Contract;
  let idoToken: Contract;
  let owner: Signer;
  let user1: Signer;
  let user2: Signer;
  let addrs: Signer[];

  // Common parameters
  const tokenPrice = toWei(0.1); // 0.1 payment tokens per IDO token
  const softCap = toWei(50);     // 50 payment tokens
  const hardCap = toWei(200);    // 200 payment tokens
  const initialBalance = toWei(1000); // 1000 tokens for testing

  // Deploy a mock ERC20 token
  async function deployMockToken(name: string, symbol: string) {
    const MockToken = await ethers.getContractFactory("MockToken");
    return await MockToken.deploy(name, symbol);
  }

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2, ...addrs] = await ethers.getSigners();

    // Deploy mock tokens
    paymentToken = await deployMockToken("Payment Token", "PAY");
    idoToken = await deployMockToken("IDO Token", "IDO");

    // Deploy IDOPool
    const IDOPool = await ethers.getContractFactory("IDOPool");
    idoPool = await IDOPool.deploy(paymentToken.target, idoToken.target);

    // Mint tokens to users
    await paymentToken.mint(await user1.getAddress(), initialBalance);
    await paymentToken.mint(await user2.getAddress(), initialBalance);
    
    // Mint IDO tokens to owner
    await idoToken.mint(await owner.getAddress(), toWei(10000));
    
    // Transfer IDO tokens to pool for distribution
    await idoToken.connect(owner).transfer(idoPool.target, toWei(5000));
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await idoPool.owner()).to.equal(await owner.getAddress());
    });

    it("Should set the correct token addresses", async function () {
      expect(await idoPool.paymentToken()).to.equal(paymentToken.target);
      expect(await idoPool.idoToken()).to.equal(idoToken.target);
    });
  });

  describe("Setting IDO Parameters", function () {
    it("Should allow owner to set IDO parameters", async function () {
      const currentTime = await time.latest();
      const startTime = currentTime + 3600; // 1 hour from now
      const endTime = startTime + 86400; // 1 day after start

      await expect(
        idoPool.setIDOParameters(startTime, endTime, tokenPrice, softCap, hardCap)
      )
        .to.emit(idoPool, "IDOParametersSet")
        .withArgs(startTime, endTime, tokenPrice, softCap, hardCap);

      expect(await idoPool.startTime()).to.equal(startTime);
      expect(await idoPool.endTime()).to.equal(endTime);
      expect(await idoPool.tokenPrice()).to.equal(tokenPrice);
      expect(await idoPool.softCap()).to.equal(softCap);
      expect(await idoPool.hardCap()).to.equal(hardCap);
    });

    it("Should revert if non-owner tries to set IDO parameters", async function () {
      const currentTime = await time.latest();
      const startTime = currentTime + 3600;
      const endTime = startTime + 86400;

      await expect(
        idoPool.connect(user1).setIDOParameters(startTime, endTime, tokenPrice, softCap, hardCap)
      ).to.be.revertedWithCustomError(idoPool, "OwnableUnauthorizedAccount");
    });

    it("Should revert if start time is in the past", async function () {
      const currentTime = await time.latest();
      const startTime = currentTime - 3600; // 1 hour ago
      const endTime = currentTime + 86400;

      await expect(
        idoPool.setIDOParameters(startTime, endTime, tokenPrice, softCap, hardCap)
      ).to.be.revertedWith("Start time must be in the future");
    });

    it("Should revert if end time is before start time", async function () {
      const currentTime = await time.latest();
      const startTime = currentTime + 3600;
      const endTime = startTime - 3600; // Before start time

      await expect(
        idoPool.setIDOParameters(startTime, endTime, tokenPrice, softCap, hardCap)
      ).to.be.revertedWith("End time must be after start time");
    });
  });

  describe("IDO Lifecycle", function () {
    let startTime: number;
    let endTime: number;

    beforeEach(async function () {
      const currentTime = await time.latest();
      startTime = currentTime + 3600; // 1 hour from now
      endTime = startTime + 86400; // 1 day after start

      await idoPool.setIDOParameters(startTime, endTime, tokenPrice, softCap, hardCap);
    });

    it("Should not allow starting IDO before start time", async function () {
      await expect(idoPool.startIDO()).to.be.revertedWith("IDO has not reached start time");
    });

    it("Should allow starting IDO after start time", async function () {
      await time.increaseTo(startTime + 1);
      await expect(idoPool.startIDO())
        .to.emit(idoPool, "IDOStarted")
        .withArgs(startTime, endTime);

      expect(await idoPool.idoActive()).to.equal(true);
    });

    it("Should not allow starting IDO after end time", async function () {
      await time.increaseTo(endTime + 1);
      await expect(idoPool.startIDO()).to.be.revertedWith("IDO has already passed end time");
    });

    it("Should allow ending IDO after end time", async function () {
      await time.increaseTo(startTime + 1);
      await idoPool.startIDO();
      
      await time.increaseTo(endTime + 1);
      await expect(idoPool.endIDO())
        .to.emit(idoPool, "IDOEnded")
        .withArgs(endTime, 0, false);

      expect(await idoPool.idoActive()).to.equal(false);
      expect(await idoPool.idoEnded()).to.equal(true);
      expect(await idoPool.refundGloballyEnabled()).to.equal(true); // Since soft cap not met
    });

    it("Should allow owner to end IDO anytime", async function () {
      await time.increaseTo(startTime + 1);
      await idoPool.startIDO();
      
      await expect(idoPool.endIDO())
        .to.emit(idoPool, "IDOEnded")
        .withArgs(endTime, 0, false);

      expect(await idoPool.idoActive()).to.equal(false);
      expect(await idoPool.idoEnded()).to.equal(true);
    });
  });

  describe("Token Purchase", function () {
    let startTime: number;
    let endTime: number;

    beforeEach(async function () {
      const currentTime = await time.latest();
      startTime = currentTime + 3600; // 1 hour from now
      endTime = startTime + 86400; // 1 day after start

      await idoPool.setIDOParameters(startTime, endTime, tokenPrice, softCap, hardCap);
      await time.increaseTo(startTime + 1);
      await idoPool.startIDO();

      // Approve payment token spending
      await paymentToken.connect(user1).approve(idoPool.target, initialBalance);
      await paymentToken.connect(user2).approve(idoPool.target, initialBalance);
    });

    it("Should allow user to buy tokens", async function () {
      const paymentAmount = toWei(1); // 1 payment token
      const expectedIdoTokens = paymentAmount / tokenPrice; // 10 IDO tokens for 1 payment token (at price 0.1)

      await expect(idoPool.connect(user1).buyTokens(paymentAmount))
        .to.emit(idoPool, "TokensPurchased")
        .withArgs(await user1.getAddress(), paymentAmount, expectedIdoTokens);

      expect(await idoPool.userContributedPaymentAmount(await user1.getAddress())).to.equal(paymentAmount);
      expect(await idoPool.userOwedIDOTokens(await user1.getAddress())).to.equal(expectedIdoTokens);
      expect(await idoPool.totalRaised()).to.equal(paymentAmount);
      expect(await paymentToken.balanceOf(idoPool.target)).to.equal(paymentAmount);
    });

    it("Should not allow purchase exceeding hard cap", async function () {
      const paymentAmount = hardCap + toWei(1); // Exceeds hard cap

      await expect(idoPool.connect(user1).buyTokens(paymentAmount))
        .to.be.revertedWith("Purchase exceeds hard cap");
    });

    it("Should not allow purchase after IDO ends", async function () {
      await time.increaseTo(endTime + 1);
      await idoPool.endIDO();

      const paymentAmount = toWei(1);
      await expect(idoPool.connect(user1).buyTokens(paymentAmount))
        .to.be.revertedWith("IDO is not active");
    });
  });

  describe("Refunds", function () {
    let startTime: number;
    let endTime: number;

    beforeEach(async function () {
      const currentTime = await time.latest();
      startTime = currentTime + 3600;
      endTime = startTime + 86400;

      await idoPool.setIDOParameters(startTime, endTime, tokenPrice, softCap, hardCap);
      await time.increaseTo(startTime + 1);
      await idoPool.startIDO();

      // User1 buys tokens
      await paymentToken.connect(user1).approve(idoPool.target, toWei(10));
      await idoPool.connect(user1).buyTokens(toWei(10));
    });

    it("Should not allow refunds when refunds are not enabled", async function () {
      await expect(idoPool.connect(user1).claimRefundUser())
        .to.be.revertedWith("Refunds not enabled");
    });

    it("Should allow refunds when IDO fails (soft cap not met)", async function () {
      await time.increaseTo(endTime + 1);
      await idoPool.endIDO(); // This will enable refunds if soft cap not met
      
      const userBalance = await paymentToken.balanceOf(await user1.getAddress());
      const refundAmount = toWei(10);
      
      await expect(idoPool.connect(user1).claimRefundUser())
        .to.emit(idoPool, "RefundClaimed")
        .withArgs(await user1.getAddress(), refundAmount);
      
      expect(await paymentToken.balanceOf(await user1.getAddress())).to.equal(userBalance + refundAmount);
      expect(await idoPool.userHasRefunded(await user1.getAddress())).to.equal(true);
      expect(await idoPool.userContributedPaymentAmount(await user1.getAddress())).to.equal(0);
      expect(await idoPool.userOwedIDOTokens(await user1.getAddress())).to.equal(0);
    });

    it("Should allow refunds when admin triggers global refund", async function () {
      await idoPool.triggerGlobalRefund();
      
      const userBalance = await paymentToken.balanceOf(await user1.getAddress());
      const refundAmount = toWei(10);
      
      await expect(idoPool.connect(user1).claimRefundUser())
        .to.emit(idoPool, "RefundClaimed")
        .withArgs(await user1.getAddress(), refundAmount);
      
      expect(await paymentToken.balanceOf(await user1.getAddress())).to.equal(userBalance + refundAmount);
    });

    it("Should not allow refund twice", async function () {
      await idoPool.triggerGlobalRefund();
      await idoPool.connect(user1).claimRefundUser();
      
      await expect(idoPool.connect(user1).claimRefundUser())
        .to.be.revertedWith("Already refunded");
    });
  });

  describe("Token Distribution", function () {
    let startTime: number;
    let endTime: number;

    beforeEach(async function () {
      const currentTime = await time.latest();
      startTime = currentTime + 3600;
      endTime = startTime + 86400;

      await idoPool.setIDOParameters(startTime, endTime, tokenPrice, softCap, hardCap);
      await time.increaseTo(startTime + 1);
      await idoPool.startIDO();

      // Users buy tokens
      await paymentToken.connect(user1).approve(idoPool.target, softCap);
      await idoPool.connect(user1).buyTokens(softCap); // Meets soft cap
    });

    it("Should not allow claiming tokens before IDO ends", async function () {
      await expect(idoPool.connect(user1).claimIDOTokens())
        .to.be.revertedWith("IDO not ended");
    });

    it("Should allow claiming tokens after successful IDO", async function () {
      await time.increaseTo(endTime + 1);
      await idoPool.endIDO();
      
      const expectedIdoTokens = softCap / tokenPrice;
      const userIdoTokens = await idoPool.userOwedIDOTokens(await user1.getAddress());
      expect(userIdoTokens).to.equal(expectedIdoTokens);
      
      await expect(idoPool.connect(user1).claimIDOTokens())
        .to.emit(idoPool, "IDOTokensClaimed")
        .withArgs(await user1.getAddress(), expectedIdoTokens);
      
      expect(await idoToken.balanceOf(await user1.getAddress())).to.equal(expectedIdoTokens);
      expect(await idoPool.userHasClaimedIDOTokens(await user1.getAddress())).to.equal(true);
      expect(await idoPool.userOwedIDOTokens(await user1.getAddress())).to.equal(0);
    });

    it("Should not allow claiming tokens if refunded", async function () {
      await idoPool.triggerGlobalRefund();
      await idoPool.connect(user1).claimRefundUser();
      
      await expect(idoPool.connect(user1).claimIDOTokens())
        .to.be.revertedWith("Contribution was refunded");
    });

    it("Should not allow claiming tokens twice", async function () {
      await time.increaseTo(endTime + 1);
      await idoPool.endIDO();
      await idoPool.connect(user1).claimIDOTokens();
      
      await expect(idoPool.connect(user1).claimIDOTokens())
        .to.be.revertedWith("Tokens already claimed");
    });
  });
}); 