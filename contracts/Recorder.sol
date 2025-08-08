// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract Recorder is Ownable, ReentrancyGuard {
    using Address for address payable;

    constructor() Ownable(msg.sender) {}

    uint256 public baseBaitFee = 0.0003 ether;
    mapping(address => uint256) public baitCount;
    uint256 public constant BAIT_FEE_MULTIPLIER = 110; // 10% increase per bait

    uint256 public powDifficulty = 10**18; // Adjustable difficulty

    function submitBait(bytes32 baitId, uint256 nonce) external payable nonReentrant {
        bytes32 proof = keccak256(abi.encodePacked(baitId, nonce));
        require(uint256(proof) < powDifficulty, "Invalid PoW");

        uint256 fee = baseBaitFee;
        uint256 count = baitCount[msg.sender];
        for (uint256 i = 0; i < count; i++) {
            fee = fee * BAIT_FEE_MULTIPLIER / 100;
        }
        require(msg.value >= fee, "Insufficient bait fee");

        baitCount[msg.sender] += 1;

        if (msg.value > fee) {
            payable(msg.sender).sendValue(msg.value - fee);
        }
    }

    function adjustDifficulty(uint256 newDifficulty) external onlyOwner {
        powDifficulty = newDifficulty;
    }
}
