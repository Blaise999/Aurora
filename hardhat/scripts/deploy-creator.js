const hre = require("hardhat");
const { ethers } = hre;
const fs = require("fs");

/**
 * Deploy AuroraCreator contract.
 *
 * Required .env:
 *   DEPLOYER_PRIVATE_KEY=0x...
 *   TREASURY_ADDRESS=0x...
 *   MINT_FEE_ETH=0.005
 *   NFT_NAME=Aurora
 *   NFT_SYMBOL=ACREATE
 */
async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying with account:", deployer.address);
  console.log(
    "Balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "ETH"
  );

  const treasury = process.env.TREASURY_ADDRESS || deployer.address;
  const mintFeeEth = process.env.MINT_FEE_ETH || "0.005";
  const mintFeeWei = ethers.parseEther(mintFeeEth);
  const nftName = process.env.NFT_NAME || "Aurora";
  const nftSymbol = process.env.NFT_SYMBOL || "ACREATE";

  console.log("\n── Deployment Config ──");
  console.log("Treasury:  ", treasury);
  console.log("Mint Fee:  ", mintFeeEth, "ETH");
  console.log("NFT Name:  ", nftName);
  console.log("NFT Symbol:", nftSymbol);
  console.log("");

  const Factory = await ethers.getContractFactory("AuroraCreator");
  const contract = await Factory.deploy(treasury, mintFeeWei, nftName, nftSymbol);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("✅ AuroraCreator deployed to:", address);

  // Save deployment info FIRST so a flaky RPC read doesn't lose the address
  const deployInfo = {
    contract: "AuroraCreator",
    address,
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    deployer: deployer.address,
    treasury,
    mintFee: mintFeeEth,
    nftName,
    nftSymbol,
    deployedAt: new Date().toISOString(),
    constructorArgs: [treasury, mintFeeWei.toString(), nftName, nftSymbol],
  };

  const outPath = `./deployments/${hre.network.name}-AuroraCreator.json`;
  fs.mkdirSync("./deployments", { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(deployInfo, null, 2));
  console.log(`Deployment info saved to ${outPath}`);

  // Optional post-deploy reads
  try {
    const fee = await contract.mintFee();
    const tres = await contract.treasury();
    const active = await contract.mintActive();
    const total = await contract.totalMinted();

    console.log("\n── Post-Deploy State ──");
    console.log("Mint Fee:     ", ethers.formatEther(fee), "ETH");
    console.log("Treasury:     ", tres);
    console.log("Mint Active:  ", active);
    console.log("Total Minted: ", total.toString());
  } catch (err) {
    console.log("\nPost-deploy reads skipped due to RPC response issue:");
    console.log(err.shortMessage || err.message);
  }

  console.log("\n══════════════════════════════════════════");
  console.log("Add to your root .env.local:");
  console.log(`NEXT_PUBLIC_CREATOR_CONTRACT=${address}`);
  console.log("══════════════════════════════════════════");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});