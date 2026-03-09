// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title AuroraNft
 * @notice ERC-721 mint contract deployed on Base.
 *         Payment held in contract; owner withdraws to treasury.
 */
contract AuroraNft is ERC721, Ownable {
    using Strings for uint256;

    uint256 public constant MAX_SUPPLY = 10_000;
    uint256 public constant MAX_PER_TX = 5;

    uint256 public price = 0.002 ether;
    uint256 public totalMinted;
    bool public saleActive;

    address public treasury;
    string private _baseTokenURI;

    event Minted(address indexed minter, uint256 indexed tokenId, uint256 quantity);
    event SaleToggled(bool active);
    event PriceUpdated(uint256 newPrice);
    event TreasuryUpdated(address newTreasury);

    constructor(
        address _treasury,
        string memory baseURI_
    ) ERC721("AuroraNft", "AURORA") Ownable(msg.sender) {
        require(_treasury != address(0), "Zero treasury");
        treasury = _treasury;
        _baseTokenURI = baseURI_;
    }

    function mint(uint256 quantity) external payable {
        require(saleActive, "Sale not active");
        require(quantity > 0 && quantity <= MAX_PER_TX, "Invalid quantity");
        require(totalMinted + quantity <= MAX_SUPPLY, "Exceeds max supply");
        require(msg.value == price * quantity, "Wrong ETH amount");

        for (uint256 i = 0; i < quantity; i++) {
            totalMinted++;
            _safeMint(msg.sender, totalMinted);
        }

        emit Minted(msg.sender, totalMinted, quantity);
    }

    function toggleSale() external onlyOwner {
        saleActive = !saleActive;
        emit SaleToggled(saleActive);
    }

    function setPrice(uint256 _price) external onlyOwner {
        price = _price;
        emit PriceUpdated(_price);
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Zero address");
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }

    function setBaseURI(string calldata baseURI_) external onlyOwner {
        _baseTokenURI = baseURI_;
    }

    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance");
        (bool ok, ) = payable(treasury).call{value: balance}("");
        require(ok, "Transfer failed");
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        string memory base = _baseURI();
        return bytes(base).length > 0
            ? string(abi.encodePacked(base, tokenId.toString(), ".json"))
            : "";
    }

    function remainingSupply() external view returns (uint256) {
        return MAX_SUPPLY - totalMinted;
    }
}
