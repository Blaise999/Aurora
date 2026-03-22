require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
  const contractAddress = "0x50dd23c855c08B3180cd9f33D172535d381Fda75";
  const newFee = ethers.parseEther("0.000001");

  const contract = await ethers.getContractAt("AuroraCreator", contractAddress);

  const [signer] = await ethers.getSigners();
  console.log("Using wallet:", signer.address);

  try {
    const owner = await contract.owner();
    console.log("Contract owner:", owner);
  } catch {
    console.log("No owner() function found");
  }

  const tx = await contract.setMintFee(newFee);
  console.log("Submitted tx:", tx.hash);

  await tx.wait();
  console.log("Mint fee updated to:", ethers.formatEther(newFee), "ETH");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});