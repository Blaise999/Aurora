const { ethers } = require("hardhat");

/**
 * Deploy AuroraCreator contract.
 *
 * Required .env:
 *   DEPLOYER_PRIVATE_KEY=0x...
 *   TREASURY_ADDRESS=0x...       (admin wallet that receives fees)
 *   MINT_FEE_ETH=0.005           (fee in ETH, default 0.005)
 *   NFT_NAME=AuroraCreator       (ERC721 name)
 *   NFT_SYMBOL=ACREATE           (ERC721 symbol)
 *   APP_BASE_URL=https://yourapp.com  (for metadata URIs)
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // ── Config ──
  const treasury = process.env.TREASURY_ADDRESS || deployer.address;
  const mintFeeEth = process.env.MINT_FEE_ETH || "0.005";
  const mintFeeWei = ethers.parseEther(mintFeeEth);
  const nftName = process.env.NFT_NAME || "AuroraCreator";
  const nftSymbol = process.env.NFT_SYMBOL || "ACREATE";

  console.log("\n── Deployment Config ──");
  console.log("Treasury:  ", treasury);
  console.log("Mint Fee:  ", mintFeeEth, "ETH");
  console.log("NFT Name:  ", nftName);
  console.log("NFT Symbol:", nftSymbol);
  console.log("");

  // ── Deploy ──
  const Factory = await ethers.getContractFactory("AuroraCreator");
  const contract = await Factory.deploy(treasury, mintFeeWei, nftName, nftSymbol);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("✅ AuroraCreator deployed to:", address);

  // ── Verify initial state ──
  const fee = await contract.mintFee();
  const tres = await contract.treasury();
  const active = await contract.mintActive();
  const total = await contract.totalMinted();

  console.log("\n── Post-Deploy State ──");
  console.log("Mint Fee:     ", ethers.formatEther(fee), "ETH");
  console.log("Treasury:     ", tres);
  console.log("Mint Active:  ", active);
  console.log("Total Minted: ", total.toString());

  // ── Output for .env ──
  console.log("\n══════════════════════════════════════════");
  console.log("Add to your .env / .env.local:");
  console.log(`NEXT_PUBLIC_CREATOR_CONTRACT=${address}`);
  console.log("══════════════════════════════════════════");

  // ── Save deployment info ──
  const fs = require("fs");
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
  console.log(`\nDeployment info saved to ${outPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
