import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import IDOPoolABI from './abis/IDOPool.json';
import ERC20ABI from './abis/ERC20.json';
import './App.css';

function App() {
  // State variables
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [idoPool, setIdoPool] = useState(null);
  const [paymentToken, setPaymentToken] = useState(null);
  const [idoToken, setIdoToken] = useState(null);
  const [idoStatus, setIdoStatus] = useState('Not Started');
  const [idoInfo, setIdoInfo] = useState({
    startTime: 0,
    endTime: 0,
    tokenPrice: 0,
    softCap: 0,
    hardCap: 0,
    totalRaised: 0,
    idoActive: false,
    idoEnded: false,
    refundEnabled: false
  });
  const [userInfo, setUserInfo] = useState({
    contributedAmount: 0,
    owedTokens: 0,
    paymentTokenBalance: 0,
    idoTokenBalance: 0,
    hasRefunded: false,
    hasClaimedTokens: false
  });
  const [paymentAmount, setPaymentAmount] = useState('');
  const [idoTokensToReceive, setIdoTokensToReceive] = useState(0);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');
  const [countdown, setCountdown] = useState('');

  // Contract addresses
  const idoPoolAddress = '0x7c33fE2D2744Afe0eb0e59577156f512d7E206DF'; 
  const paymentTokenAddress = '0x0188F4043223fa10961CE1987ABfEE47690092D8';
  const idoTokenAddress = '0x0188F4043223fa10961CE1987ABfEE47690092D8';

  // Connect to wallet
  async function connectWallet() {
    try {
      setLoading(true);
      setError('');
      
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed. Please install it to use this app.');
      }

      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const account = await signer.getAddress();
      
      // Initialize contract instances
      const idoPool = new ethers.Contract(idoPoolAddress, IDOPoolABI, signer);
      const paymentToken = new ethers.Contract(paymentTokenAddress, ERC20ABI, signer);
      const idoToken = new ethers.Contract(idoTokenAddress, ERC20ABI, signer);
      
      setProvider(provider);
      setSigner(signer);
      setAccount(account);
      setIdoPool(idoPool);
      setPaymentToken(paymentToken);
      setIdoToken(idoToken);
      
      // Check if user is owner
      const owner = await idoPool.owner();
      setIsOwner(owner.toLowerCase() === account.toLowerCase());
      
      // Get IDO info and user info
      await fetchIdoInfo();
      await fetchUserInfo(account);
      
      setLoading(false);
    } catch (error) {
      console.error(error);
      setError(error.message);
      setLoading(false);
    }
  }

  // Fetch IDO information
  async function fetchIdoInfo() {
    if (!idoPool) return;
    
    try {
      const startTime = await idoPool.startTime();
      const endTime = await idoPool.endTime();
      const tokenPrice = await idoPool.tokenPrice();
      const softCap = await idoPool.softCap();
      const hardCap = await idoPool.hardCap();
      const totalRaised = await idoPool.totalRaised();
      const idoActive = await idoPool.idoActive();
      const idoEnded = await idoPool.idoEnded();
      const refundEnabled = await idoPool.refundGloballyEnabled();
      
      setIdoInfo({
        startTime,
        endTime,
        tokenPrice,
        softCap,
        hardCap,
        totalRaised,
        idoActive,
        idoEnded,
        refundEnabled
      });
      
      // Set IDO status
      if (idoActive) {
        setIdoStatus('Active');
      } else if (idoEnded) {
        if (totalRaised.gte(softCap)) {
          setIdoStatus('Ended - Successful');
        } else {
          setIdoStatus('Ended - Failed');
        }
      } else if (refundEnabled) {
        setIdoStatus('Refunds Active');
      } else {
        setIdoStatus('Not Started');
      }
      
      // Update countdown
      updateCountdown(startTime, endTime, idoActive, idoEnded);
    } catch (error) {
      console.error('Error fetching IDO info:', error);
    }
  }

  // Update countdown timer
  function updateCountdown(startTime, endTime, idoActive, idoEnded) {
    const now = Math.floor(Date.now() / 1000);
    let timeLeft;
    let label;
    
    if (!idoActive && !idoEnded && startTime > now) {
      // Countdown to start
      timeLeft = startTime - now;
      label = 'Starts in: ';
    } else if (idoActive && !idoEnded && endTime > now) {
      // Countdown to end
      timeLeft = endTime - now;
      label = 'Ends in: ';
    } else {
      setCountdown('');
      return;
    }
    
    const days = Math.floor(timeLeft / 86400);
    const hours = Math.floor((timeLeft % 86400) / 3600);
    const minutes = Math.floor((timeLeft % 3600) / 60);
    const seconds = timeLeft % 60;
    
    setCountdown(`${label}${days}d ${hours}h ${minutes}m ${seconds}s`);
  }

  // Fetch user information
  async function fetchUserInfo(userAddress) {
    if (!idoPool || !paymentToken || !idoToken) return;
    
    try {
      const contributedAmount = await idoPool.userContributedPaymentAmount(userAddress);
      const owedTokens = await idoPool.userOwedIDOTokens(userAddress);
      const paymentTokenBalance = await paymentToken.balanceOf(userAddress);
      const idoTokenBalance = await idoToken.balanceOf(userAddress);
      const hasRefunded = await idoPool.userHasRefunded(userAddress);
      const hasClaimedTokens = await idoPool.userHasClaimedIDOTokens(userAddress);
      
      setUserInfo({
        contributedAmount,
        owedTokens,
        paymentTokenBalance,
        idoTokenBalance,
        hasRefunded,
        hasClaimedTokens
      });
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  }

  // Calculate IDO tokens based on payment amount
  function calculateTokens(amount) {
    if (!amount || !idoInfo.tokenPrice || idoInfo.tokenPrice.eq(0)) return 0;
    
    try {
      const paymentAmountBN = ethers.utils.parseEther(amount);
      return paymentAmountBN.div(idoInfo.tokenPrice);
    } catch (error) {
      console.error('Error calculating tokens:', error);
      return 0;
    }
  }

  // Handle payment amount input change
  function handlePaymentAmountChange(e) {
    const value = e.target.value;
    setPaymentAmount(value);
    setIdoTokensToReceive(calculateTokens(value));
  }

  // Buy tokens
  async function buyTokens() {
    if (!idoPool || !paymentToken) return;
    
    try {
      setLoading(true);
      setError('');
      
      // Check IDO is active
      if (!idoInfo.idoActive) {
        throw new Error('IDO is not active');
      }
      
      const paymentAmountBN = ethers.utils.parseEther(paymentAmount);
      
      // Check allowance
      const allowance = await paymentToken.allowance(account, idoPoolAddress);
      if (allowance.lt(paymentAmountBN)) {
        // Approve payment token spending
        const approveTx = await paymentToken.approve(idoPoolAddress, paymentAmountBN);
        await approveTx.wait();
      }
      
      // Buy tokens
      const tx = await idoPool.buyTokens(paymentAmountBN);
      setTxHash(tx.hash);
      await tx.wait();
      
      // Refresh data
      await fetchIdoInfo();
      await fetchUserInfo(account);
      
      setPaymentAmount('');
      setIdoTokensToReceive(0);
      setLoading(false);
    } catch (error) {
      console.error('Error buying tokens:', error);
      setError(error.message);
      setLoading(false);
    }
  }

  // Claim refund
  async function claimRefund() {
    if (!idoPool) return;
    
    try {
      setLoading(true);
      setError('');
      
      const tx = await idoPool.claimRefundUser();
      setTxHash(tx.hash);
      await tx.wait();
      
      // Refresh data
      await fetchIdoInfo();
      await fetchUserInfo(account);
      
      setLoading(false);
    } catch (error) {
      console.error('Error claiming refund:', error);
      setError(error.message);
      setLoading(false);
    }
  }

  // Claim IDO tokens
  async function claimIDOTokens() {
    if (!idoPool) return;
    
    try {
      setLoading(true);
      setError('');
      
      const tx = await idoPool.claimIDOTokens();
      setTxHash(tx.hash);
      await tx.wait();
      
      // Refresh data
      await fetchIdoInfo();
      await fetchUserInfo(account);
      
      setLoading(false);
    } catch (error) {
      console.error('Error claiming IDO tokens:', error);
      setError(error.message);
      setLoading(false);
    }
  }

  // Admin: Set IDO parameters
  async function setIDOParameters(startTime, endTime, tokenPrice, softCap, hardCap) {
    if (!idoPool || !isOwner) return;
    
    try {
      setLoading(true);
      setError('');
      
      const tx = await idoPool.setIDOParameters(
        startTime,
        endTime,
        ethers.utils.parseEther(tokenPrice),
        ethers.utils.parseEther(softCap),
        ethers.utils.parseEther(hardCap)
      );
      setTxHash(tx.hash);
      await tx.wait();
      
      // Refresh data
      await fetchIdoInfo();
      
      setLoading(false);
    } catch (error) {
      console.error('Error setting IDO parameters:', error);
      setError(error.message);
      setLoading(false);
    }
  }

  // Admin: Start IDO
  async function startIDO() {
    if (!idoPool || !isOwner) return;
    
    try {
      setLoading(true);
      setError('');
      
      const tx = await idoPool.startIDO();
      setTxHash(tx.hash);
      await tx.wait();
      
      // Refresh data
      await fetchIdoInfo();
      
      setLoading(false);
    } catch (error) {
      console.error('Error starting IDO:', error);
      setError(error.message);
      setLoading(false);
    }
  }

  // Admin: End IDO
  async function endIDO() {
    if (!idoPool || !isOwner) return;
    
    try {
      setLoading(true);
      setError('');
      
      const tx = await idoPool.endIDO();
      setTxHash(tx.hash);
      await tx.wait();
      
      // Refresh data
      await fetchIdoInfo();
      
      setLoading(false);
    } catch (error) {
      console.error('Error ending IDO:', error);
      setError(error.message);
      setLoading(false);
    }
  }

  // Admin: Trigger global refund
  async function triggerGlobalRefund() {
    if (!idoPool || !isOwner) return;
    
    try {
      setLoading(true);
      setError('');
      
      const tx = await idoPool.triggerGlobalRefund();
      setTxHash(tx.hash);
      await tx.wait();
      
      // Refresh data
      await fetchIdoInfo();
      
      setLoading(false);
    } catch (error) {
      console.error('Error triggering global refund:', error);
      setError(error.message);
      setLoading(false);
    }
  }

  // Update countdown every second
  useEffect(() => {
    if (idoInfo.startTime && idoInfo.endTime) {
      const timer = setInterval(() => {
        updateCountdown(
          idoInfo.startTime,
          idoInfo.endTime,
          idoInfo.idoActive,
          idoInfo.idoEnded
        );
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [idoInfo]);

  // Add auto-refresh for IDO info
  useEffect(() => {
    if (account && idoPool) {
      // Initial fetch
      fetchIdoInfo();
      
      // Set up recurring fetch every 10 seconds
      const refreshTimer = setInterval(() => {
        fetchIdoInfo();
        if (account) {
          fetchUserInfo(account);
        }
      }, 10000);
      
      return () => clearInterval(refreshTimer);
    }
  }, [account, idoPool]);

  return (
    <div className="App">
      <header className="App-header">
        <h1>IDO Pool dApp</h1>
        {!account ? (
          <button onClick={connectWallet} disabled={loading}>
            Connect Wallet
          </button>
        ) : (
          <p>Connected: {account}</p>
        )}
      </header>

      {account && (
        <div className="container">
          <div className="ido-info">
            <h2>IDO Information</h2>
            <p><strong>Status:</strong> {idoStatus}</p>
            {countdown && <p><strong>{countdown}</strong></p>}
            <p><strong>Token Price:</strong> {idoInfo.tokenPrice ? ethers.utils.formatEther(idoInfo.tokenPrice) : 0} Payment Tokens per IDO Token</p>
            <p><strong>Soft Cap:</strong> {idoInfo.softCap ? ethers.utils.formatEther(idoInfo.softCap) : 0} Payment Tokens</p>
            <p><strong>Hard Cap:</strong> {idoInfo.hardCap ? ethers.utils.formatEther(idoInfo.hardCap) : 0} Payment Tokens</p>
            <p><strong>Total Raised:</strong> {idoInfo.totalRaised ? ethers.utils.formatEther(idoInfo.totalRaised) : 0} Payment Tokens</p>
            
            <div className="progress-bar">
              <div
                className="progress"
                style={{
                  width: `${idoInfo.hardCap && idoInfo.hardCap.gt(0) ? 
                    Math.min(100, idoInfo.totalRaised.mul(100).div(idoInfo.hardCap).toNumber()) : 0}%`
                }}
              ></div>
            </div>
            <p>{idoInfo.hardCap && idoInfo.hardCap.gt(0) ? 
              Math.min(100, idoInfo.totalRaised.mul(100).div(idoInfo.hardCap).toNumber()) : 0}% of Hard Cap</p>
          </div>

          <div className="user-info">
            <h2>Your Information</h2>
            <p><strong>Contribution:</strong> {userInfo.contributedAmount ? ethers.utils.formatEther(userInfo.contributedAmount) : 0} Payment Tokens</p>
            <p><strong>Owed IDO Tokens:</strong> {userInfo.owedTokens ? ethers.utils.formatEther(userInfo.owedTokens) : 0} IDO Tokens</p>
            <p><strong>Payment Token Balance:</strong> {userInfo.paymentTokenBalance ? ethers.utils.formatEther(userInfo.paymentTokenBalance) : 0}</p>
            <p><strong>IDO Token Balance:</strong> {userInfo.idoTokenBalance ? ethers.utils.formatEther(userInfo.idoTokenBalance) : 0}</p>
          </div>

          {idoInfo.idoActive && !idoInfo.idoEnded && (
            <div className="buy-tokens">
              <h2>Buy Tokens</h2>
              <div className="input-group">
                <input
                  type="number"
                  placeholder="Amount of Payment Tokens"
                  value={paymentAmount}
                  onChange={handlePaymentAmountChange}
                />
                <p>You will receive: {idoTokensToReceive.toString()} IDO Tokens</p>
              </div>
              <button onClick={buyTokens} disabled={loading || !paymentAmount}>
                {loading ? 'Processing...' : 'Buy Tokens'}
              </button>
            </div>
          )}

          <div className="user-actions">
            <h2>Actions</h2>
            {idoInfo.idoEnded && idoInfo.totalRaised && idoInfo.softCap && 
             idoInfo.totalRaised.gte(idoInfo.softCap) && 
             userInfo.owedTokens && userInfo.owedTokens.gt(0) && 
             !userInfo.hasClaimedTokens && !userInfo.hasRefunded && (
              <button onClick={claimIDOTokens} disabled={loading}>
                Claim IDO Tokens
              </button>
            )}
            
            {idoInfo.refundEnabled && 
             userInfo.contributedAmount && userInfo.contributedAmount.gt(0) && 
             !userInfo.hasRefunded && !userInfo.hasClaimedTokens && (
              <button onClick={claimRefund} disabled={loading}>
                Claim Refund
              </button>
            )}
          </div>

          {isOwner && (
            <div className="admin-panel">
              <h2>Admin Panel</h2>
              <div className="admin-actions">
                {!idoInfo.idoActive && !idoInfo.idoEnded && (
                  <button onClick={startIDO} disabled={loading}>
                    Start IDO
                  </button>
                )}
                
                {idoInfo.idoActive && !idoInfo.idoEnded && (
                  <button onClick={endIDO} disabled={loading}>
                    End IDO
                  </button>
                )}
                
                {!idoInfo.refundEnabled && (
                  <button onClick={triggerGlobalRefund} disabled={loading}>
                    Trigger Global Refund
                  </button>
                )}
              </div>
            </div>
          )}

          {txHash && (
            <div className="transaction">
              <h3>Transaction Submitted</h3>
              <p><a href={`https://etherscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer">
                View on Etherscan
              </a></p>
            </div>
          )}

          {error && (
            <div className="error">
              <p>{error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App; 