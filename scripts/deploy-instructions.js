/**
 * AuroraNft — Hardhat Deployment
 *
 * Setup:
 *   mkdir hardhat && cd hardhat
 *   npm init -y
 *   npm i --save-dev hardhat @nomicfoundation/hardhat-toolbox @openzeppelin/contracts dotenv
 *   npx hardhat init  (empty config)
 *   cp ../contracts/AuroraNft.sol contracts/
 *
 * hardhat.config.js:
 *   require("@nomicfoundation/hardhat-toolbox");
 *   require("dotenv").config();
 *   module.exports = {
 *     solidity: "0.8.20",
 *     networks: {
 *       baseSepolia: {
 *         url: process.env.BASE_SEPOLIA_RPC || "https://sepolia.base.org",
 *         accounts: [process.env.DEPLOYER_PRIVATE_KEY],
 *         chainId: 84532,
 *       },
 *       base: {
 *         url: process.env.BASE_MAINNET_RPC || "https://mainnet.base.org",
 *         accounts: [process.env.DEPLOYER_PRIVATE_KEY],
 *         chainId: 8453,
 *       },
 *     },
 *   };
 *
 * scripts/deploy.js:
 *   const { ethers } = require("hardhat");
 *   async function main() {
 *     const [deployer] = await ethers.getSigners();
 *     const TREASURY = process.env.TREASURY_ADDRESS || deployer.address;
 *     const BASE_URI = process.env.NFT_BASE_URI || "https://api.auroranft.xyz/metadata/";
 *     const AuroraNft = await ethers.getContractFactory("AuroraNft");
 *     const c = await AuroraNft.deploy(TREASURY, BASE_URI);
 *     await c.waitForDeployment();
 *     console.log("Deployed:", await c.getAddress());
 *     await (await c.toggleSale()).wait();
 *     console.log("Sale activated");
 *   }
 *   main().catch(e => { console.error(e); process.exit(1); });
 *
 * Deploy:
 *   npx hardhat run scripts/deploy.js --network baseSepolia
 *
 * Verify:
 *   npx hardhat verify --network baseSepolia <ADDRESS> "<TREASURY>" "<BASE_URI>"
 *
 * .env:
 *   DEPLOYER_PRIVATE_KEY=0x...
 *   TREASURY_ADDRESS=0x...
 *   NFT_BASE_URI=https://api.auroranft.xyz/metadata/
 */
