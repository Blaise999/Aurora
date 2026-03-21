require("dotenv").config();
const { Wallet } = require("ethers");

const raw = process.env.DEPLOYER_PRIVATE_KEY;

if (!raw) {
  throw new Error("DEPLOYER_PRIVATE_KEY not found in .env");
}

const pk = raw.startsWith("0x") ? raw : `0x${raw}`;
const wallet = new Wallet(pk);

console.log("Wallet address:", wallet.address);