const hre = require("hardhat");
const { run } = hre;
const fs = require("fs");

/**
 * Verify AuroraCreator on BaseScan.
 * Reads deployment info from ./deployments/<network>-AuroraCreator.json
 *
 * Usage:
 *   npx hardhat run scripts/verify-creator.js --network base
 */
async function main() {
  const network = hre.network.name;
  const deployPath = `./deployments/${network}-AuroraCreator.json`;

  if (!fs.existsSync(deployPath)) {
    console.error(`No deployment found at ${deployPath}`);
    console.error("Deploy first or create the deployment JSON manually.");
    process.exit(1);
  }

  const deploy = JSON.parse(fs.readFileSync(deployPath, "utf8"));
  console.log("Verifying AuroraCreator at:", deploy.address);
  console.log("Network:", network);

  try {
    await run("verify:verify", {
      address: deploy.address,
      constructorArguments: deploy.constructorArgs,
    });
    console.log("✅ Verification successful!");
  } catch (err) {
    if ((err.message || "").includes("Already Verified")) {
      console.log("✅ Already verified.");
    } else {
      console.error("Verification failed:", err.message || err);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});