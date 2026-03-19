require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const rawDeployerKey = process.env.DEPLOYER_PRIVATE_KEY || "";
const DEPLOYER_KEY = rawDeployerKey
  ? rawDeployerKey.startsWith("0x")
    ? rawDeployerKey
    : `0x${rawDeployerKey}`
  : "0x" + "00".repeat(32);

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      evmVersion: "cancun",
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    baseSepolia: {
      url: process.env.BASE_SEPOLIA_RPC || "https://sepolia.base.org",
      accounts: [DEPLOYER_KEY],
      chainId: 84532,
    },
    base: {
      url: process.env.BASE_MAINNET_RPC || "https://mainnet.base.org",
      accounts: [DEPLOYER_KEY],
      chainId: 8453,
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "",
  },
};