const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AuroraCreator", function () {
  let contract, owner, user1, user2, treasury;
  const MINT_FEE = ethers.parseEther("0.005");
  const METADATA_URI = "https://app.example.com/api/nft/token-metadata/1";

  beforeEach(async function () {
    [owner, user1, user2, treasury] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("AuroraCreator");
    contract = await Factory.deploy(
      treasury.address,
      MINT_FEE,
      "AuroraCreator",
      "ACREATE"
    );
    await contract.waitForDeployment();
  });

  describe("Deployment", function () {
    it("should set correct initial state", async function () {
      expect(await contract.treasury()).to.equal(treasury.address);
      expect(await contract.mintFee()).to.equal(MINT_FEE);
      expect(await contract.mintActive()).to.be.true;
      expect(await contract.totalMinted()).to.equal(0);
      expect(await contract.name()).to.equal("AuroraCreator");
      expect(await contract.symbol()).to.equal("ACREATE");
    });
  });

  describe("createNft", function () {
    it("should mint an NFT and transfer fee to treasury", async function () {
      const treasuryBefore = await ethers.provider.getBalance(treasury.address);

      const tx = await contract
        .connect(user1)
        .createNft(METADATA_URI, { value: MINT_FEE });
      await tx.wait();

      // Token minted
      expect(await contract.totalMinted()).to.equal(1);
      expect(await contract.ownerOf(1)).to.equal(user1.address);
      expect(await contract.creatorOf(1)).to.equal(user1.address);
      expect(await contract.tokenURI(1)).to.equal(METADATA_URI);

      // Fee forwarded to treasury
      const treasuryAfter = await ethers.provider.getBalance(treasury.address);
      expect(treasuryAfter - treasuryBefore).to.equal(MINT_FEE);
    });

    it("should emit Created event", async function () {
      await expect(
        contract.connect(user1).createNft(METADATA_URI, { value: MINT_FEE })
      )
        .to.emit(contract, "Created")
        .withArgs(user1.address, 1, METADATA_URI, MINT_FEE);
    });

    it("should mint sequential token IDs", async function () {
      await contract.connect(user1).createNft("uri://1", { value: MINT_FEE });
      await contract.connect(user2).createNft("uri://2", { value: MINT_FEE });
      await contract.connect(user1).createNft("uri://3", { value: MINT_FEE });

      expect(await contract.totalMinted()).to.equal(3);
      expect(await contract.ownerOf(1)).to.equal(user1.address);
      expect(await contract.ownerOf(2)).to.equal(user2.address);
      expect(await contract.ownerOf(3)).to.equal(user1.address);
    });

    it("should revert with wrong fee", async function () {
      await expect(
        contract.connect(user1).createNft(METADATA_URI, { value: 0 })
      ).to.be.revertedWith("Wrong fee amount");

      await expect(
        contract
          .connect(user1)
          .createNft(METADATA_URI, { value: ethers.parseEther("0.01") })
      ).to.be.revertedWith("Wrong fee amount");
    });

    it("should revert with empty metadata URI", async function () {
      await expect(
        contract.connect(user1).createNft("", { value: MINT_FEE })
      ).to.be.revertedWith("Empty metadata URI");
    });

    it("should revert when minting is paused", async function () {
      await contract.toggleMint();
      expect(await contract.mintActive()).to.be.false;

      await expect(
        contract.connect(user1).createNft(METADATA_URI, { value: MINT_FEE })
      ).to.be.revertedWith("Minting is paused");
    });

    it("should track creator even after transfer", async function () {
      await contract
        .connect(user1)
        .createNft(METADATA_URI, { value: MINT_FEE });

      // Transfer NFT
      await contract
        .connect(user1)
        .transferFrom(user1.address, user2.address, 1);

      // Owner changed, creator stays
      expect(await contract.ownerOf(1)).to.equal(user2.address);
      expect(await contract.creatorOf(1)).to.equal(user1.address);
    });
  });

  describe("Admin functions", function () {
    it("should allow owner to update mint fee", async function () {
      const newFee = ethers.parseEther("0.01");
      await contract.setMintFee(newFee);
      expect(await contract.mintFee()).to.equal(newFee);

      // User must pay new fee
      await expect(
        contract.connect(user1).createNft(METADATA_URI, { value: MINT_FEE })
      ).to.be.revertedWith("Wrong fee amount");

      await contract
        .connect(user1)
        .createNft(METADATA_URI, { value: newFee });
      expect(await contract.totalMinted()).to.equal(1);
    });

    it("should allow owner to update treasury", async function () {
      await contract.setTreasury(user2.address);
      expect(await contract.treasury()).to.equal(user2.address);
    });

    it("should prevent non-owner from admin functions", async function () {
      await expect(
        contract.connect(user1).setMintFee(0)
      ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");

      await expect(
        contract.connect(user1).setTreasury(user1.address)
      ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");

      await expect(
        contract.connect(user1).toggleMint()
      ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
    });
  });

  describe("Reject direct ETH", function () {
    it("should reject plain ETH transfers", async function () {
      await expect(
        user1.sendTransaction({
          to: await contract.getAddress(),
          value: ethers.parseEther("0.1"),
        })
      ).to.be.revertedWith("Use createNft()");
    });
  });
});
