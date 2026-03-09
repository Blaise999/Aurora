// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BuyCollector
 * @notice Collects the NFT price + platform fee from the buyer
 *         and forwards 100% to the admin's treasury wallet.
 *
 * Flow:
 *   1. Frontend reads `buyFee` + `nftPrice` from the Supabase DB
 *   2. Frontend calls `buy(nftId)` with msg.value == buyFee + nftPrice
 *   3. Contract forwards all ETH to `treasury`
 *   4. Frontend calls /api/nft/buy to save the purchase in Supabase
 */
contract BuyCollector is Ownable {
    address public treasury;

    event Purchase(
        address indexed buyer,
        string nftId,
        uint256 amount
    );
    event TreasuryUpdated(address newTreasury);

    constructor(address _treasury) Ownable(msg.sender) {
        require(_treasury != address(0), "Zero treasury");
        treasury = _treasury;
    }

    /**
     * @dev Buy an NFT. msg.value must equal buyFee + nftPrice.
     *      The exact amounts are validated off-chain by comparing
     *      to the values stored in the Supabase DB.
     *      All ETH is forwarded to the treasury.
     */
    function buy(string calldata nftId) external payable {
        require(msg.value > 0, "No ETH sent");

        // Forward everything to treasury
        (bool ok, ) = payable(treasury).call{value: msg.value}("");
        require(ok, "Transfer to treasury failed");

        emit Purchase(msg.sender, nftId, msg.value);
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Zero address");
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }

    // Safety: if ETH is sent directly, forward to treasury
    receive() external payable {
        (bool ok, ) = payable(treasury).call{value: msg.value}("");
        require(ok, "Transfer failed");
    }
}
