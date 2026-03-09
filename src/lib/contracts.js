import { ethers } from "ethers";
import {
  AURORA_CONTRACT,
  BUY_COLLECTOR_CONTRACT,
  AURORA_ABI,
  BUY_COLLECTOR_ABI,
  RPC_URL,
} from "./constants";

// Get read-only provider
export function getProvider() {
  return new ethers.JsonRpcProvider(RPC_URL);
}

// Get signer from browser wallet
export async function getSigner() {
  if (!window.ethereum) throw new Error("No wallet detected");
  const provider = new ethers.BrowserProvider(window.ethereum);
  return provider.getSigner();
}

// Aurora contract (read-only)
export function getAuroraContract() {
  return new ethers.Contract(AURORA_CONTRACT, AURORA_ABI, getProvider());
}

// Aurora contract (with signer for writes)
export async function getAuroraContractSigned() {
  const signer = await getSigner();
  return new ethers.Contract(AURORA_CONTRACT, AURORA_ABI, signer);
}

// BuyCollector contract (with signer for writes)
export async function getBuyCollectorSigned() {
  const signer = await getSigner();
  return new ethers.Contract(BUY_COLLECTOR_CONTRACT, BUY_COLLECTOR_ABI, signer);
}

// Mint from Aurora contract
export async function mintFromContract(quantity, pricePerUnit) {
  const contract = await getAuroraContractSigned();
  const totalCost = ethers.parseEther(pricePerUnit) * BigInt(quantity);
  const tx = await contract.mint(quantity, { value: totalCost });
  const receipt = await tx.wait();
  return { tx, receipt, hash: tx.hash };
}

// Buy via BuyCollector (for external NFTs — sends ETH to treasury)
export async function buyViaCollector(nftId, totalEth) {
  const contract = await getBuyCollectorSigned();
  const value = ethers.parseEther(totalEth);
  const tx = await contract.buy(nftId, { value });
  const receipt = await tx.wait();
  return { tx, receipt, hash: tx.hash };
}

// Send ETH directly to treasury (fallback if BuyCollector not deployed)
export async function sendToTreasury(totalEth, treasuryAddress) {
  const signer = await getSigner();
  const tx = await signer.sendTransaction({
    to: treasuryAddress,
    value: ethers.parseEther(totalEth),
  });
  const receipt = await tx.wait();
  return { tx, receipt, hash: tx.hash };
}

// Read contract state
export async function getContractState() {
  try {
    const contract = getAuroraContract();
    const [price, totalMinted, maxSupply, saleActive] = await Promise.all([
      contract.price(),
      contract.totalMinted(),
      contract.MAX_SUPPLY(),
      contract.saleActive(),
    ]);
    return {
      price: ethers.formatEther(price),
      totalMinted: Number(totalMinted),
      maxSupply: Number(maxSupply),
      saleActive,
      remaining: Number(maxSupply) - Number(totalMinted),
    };
  } catch (err) {
    console.error("getContractState error:", err);
    return null;
  }
}
