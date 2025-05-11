// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title FASTNUToken
 * @dev FASTNU Token implementation as an ERC20 token
 */
contract FASTNUToken is ERC20, Ownable {
    /**
     * @dev Constructor that gives the msg.sender the initial supply.
     */
    constructor() ERC20("FASTNU Token", "FASTNU") Ownable(msg.sender) {
        // Mint 1 million tokens to the deployer (with 18 decimals)
        _mint(msg.sender, 1000000 * 10**18);
    }

    /**
     * @dev Function to mint additional tokens (only owner can call)
     * @param to The address that will receive the minted tokens.
     * @param amount The amount of tokens to mint.
     * @return A boolean that indicates if the operation was successful.
     */
    function mint(address to, uint256 amount) public onlyOwner returns (bool) {
        _mint(to, amount);
        return true;
    }
} 