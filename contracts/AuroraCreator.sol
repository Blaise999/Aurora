// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AuroraCreator
 * @notice Open-mint ERC-721. Any user pays a flat fee to mint their own NFT.
 *         Fee goes directly to treasury (admin wallet).
 *         Each token gets a unique metadata URI pointing to the app's API.
 *
 * Flow:
 *   1. Creator uploads artwork + metadata on the frontend
 *   2. Frontend calls createNft(metadataURI) with msg.value == mintFee
 *   3. Contract mints the NFT to the caller, stores the URI, sends fee to treasury
 *   4. Server verifies the tx, saves metadata to DB, NFT is live
 *
 * On-chain data per token:
 *   - Owner (ERC721 standard)
 *   - Creator address (immutable per token)
 *   - Custom tokenURI (set once at mint, points to /api/nft/token-metadata/<id>)
 */
contract AuroraCreator is ERC721, Ownable, ReentrancyGuard {
    using Strings for uint256;

    // ── State ──
    uint256 public totalMinted;
    uint256 public mintFee;
    address public treasury;
    bool   public mintActive = true;

    // Per-token storage
    mapping(uint256 => string)  private _tokenURIs;
    mapping(uint256 => address) public  creators;

    // ── Events ──
    event Created(
        address indexed creator,
        uint256 indexed tokenId,
        string  metadataURI,
        uint256 feePaid
    );
    event MintFeeUpdated(uint256 oldFee, uint256 newFee);
    event TreasuryUpdated(address oldTreasury, address newTreasury);
    event MintToggled(bool active);

    // ── Constructor ──
    constructor(
        address _treasury,
        uint256 _mintFee,
        string memory _name,
        string memory _symbol
    ) ERC721(_name, _symbol) Ownable(msg.sender) {
        require(_treasury != address(0), "Zero treasury");
        treasury = _treasury;
        mintFee  = _mintFee;
    }

    // ═══════════════════════════════════════════════════
    //                PUBLIC — MINT
    // ═══════════════════════════════════════════════════

    /**
     * @notice Mint a new NFT. Caller becomes both owner and creator.
     * @param metadataURI  Full URI for this token's metadata JSON
     *                     e.g. "https://yourapp.com/api/nft/token-metadata/42"
     */
    function createNft(string calldata metadataURI) external payable nonReentrant {
        require(mintActive, "Minting is paused");
        require(msg.value == mintFee, "Wrong fee amount");
        require(bytes(metadataURI).length > 0, "Empty metadata URI");

        // Increment token ID (starts at 1)
        totalMinted++;
        uint256 newTokenId = totalMinted;

        // Mint to caller
        _safeMint(msg.sender, newTokenId);

        // Store per-token data
        _tokenURIs[newTokenId] = metadataURI;
        creators[newTokenId]   = msg.sender;

        // Forward fee to treasury
        (bool ok, ) = payable(treasury).call{value: msg.value}("");
        require(ok, "Fee transfer failed");

        emit Created(msg.sender, newTokenId, metadataURI, msg.value);
    }

    // ═══════════════════════════════════════════════════
    //                VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════

    /**
     * @notice Returns the metadata URI for a given token.
     *         This is what marketplaces (OpenSea, etc.) call to display the NFT.
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return _tokenURIs[tokenId];
    }

    /**
     * @notice Returns the original creator of a token (even after transfers).
     */
    function creatorOf(uint256 tokenId) external view returns (address) {
        _requireOwned(tokenId);
        return creators[tokenId];
    }

    /**
     * @notice Total supply of minted tokens.
     */
    function totalSupply() external view returns (uint256) {
        return totalMinted;
    }

    // ═══════════════════════════════════════════════════
    //                ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════

    function setMintFee(uint256 _newFee) external onlyOwner {
        uint256 oldFee = mintFee;
        mintFee = _newFee;
        emit MintFeeUpdated(oldFee, _newFee);
    }

    function setTreasury(address _newTreasury) external onlyOwner {
        require(_newTreasury != address(0), "Zero address");
        address oldTreasury = treasury;
        treasury = _newTreasury;
        emit TreasuryUpdated(oldTreasury, _newTreasury);
    }

    function toggleMint() external onlyOwner {
        mintActive = !mintActive;
        emit MintToggled(mintActive);
    }

    /**
     * @notice Emergency withdraw if ETH is stuck in contract.
     *         Should never hold a balance since createNft forwards immediately.
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 bal = address(this).balance;
        require(bal > 0, "No balance");
        (bool ok, ) = payable(treasury).call{value: bal}("");
        require(ok, "Withdraw failed");
    }

    // Reject direct ETH sends — users must call createNft()
    receive() external payable {
        revert("Use createNft()");
    }
}
