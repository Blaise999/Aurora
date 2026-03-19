const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  const treasury = process.env.TREASURY_ADDRESS || deployer.address;
  const mintFeeEth = process.env.MINT_FEE_ETH || "0.005";
  const nftName = process.env.NFT_NAME || "Aurora";
  const nftSymbol = process.env.NFT_SYMBOL || "ACREATE";

  const mintFeeWei = ethers.parseEther(mintFeeEth);

  console.log(`Deploying with account: ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH\n`);

  console.log("── Deployment Config ──");
  console.log(`Treasury:   ${treasury}`);
  console.log(`Mint Fee:   ${mintFeeEth} ETH`);
  console.log(`NFT Name:   ${nftName}`);
  console.log(`NFT Symbol: ${nftSymbol}`);
  console.log("");

  const AuroraCreator = await ethers.getContractFactory("AuroraCreator");
  const contract = await AuroraCreator.deploy(
    treasury,
    mintFeeWei,
    nftName,
    nftSymbol
  );

  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`✅ AuroraCreator deployed to: ${address}`);

  // Safe post-deploy reads
  const onchainTreasury = await contract.treasury();
  const onchainMintFee = await contract.mintFee();
  const onchainMintActive = await contract.mintActive();
  const onchainTotalMinted = await contract.totalMinted();

  console.log("\n── On-chain State ──");
  console.log(`Treasury:    ${onchainTreasury}`);
  console.log(`Mint Fee:    ${ethers.formatEther(onchainMintFee)} ETH`);
  console.log(`Mint Active: ${onchainMintActive}`);
  console.log(`Total Minted:${onchainTotalMinted}`);

  console.log("\nAdd this to your root .env.local:");
  console.log(`NEXT_PUBLIC_CREATOR_CONTRACT=${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});