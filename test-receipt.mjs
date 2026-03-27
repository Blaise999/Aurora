const rpc = process.env.BASE_RPC_URL || "https://mainnet.base.org";
const txHash = "0x06bdecc41b690eccea0cc7014d31ef51b413805f3e418131f0df6503bf79fab9";

async function rpcCall(method, params = []) {
  const res = await fetch(rpc, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method,
      params,
      id: 1,
    }),
  });

  const text = await res.text();

  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  return json;
}

function printSection(title) {
  console.log("\n" + "=".repeat(70));
  console.log(title);
  console.log("=".repeat(70));
}

async function main() {
  printSection("BASIC CHECKS");

  console.log("RPC:", rpc);
  console.log("txHash:", txHash);
  console.log("txHash length:", txHash.length);
  console.log("starts with 0x:", txHash.startsWith("0x"));

  if (txHash.length !== 66) {
    console.error("❌ Bad tx hash length. Expected 66 chars total.");
    process.exit(1);
  }

  const chainIdRes = await rpcCall("eth_chainId");
  console.log("eth_chainId:", chainIdRes);

  const blockRes = await rpcCall("eth_blockNumber");
  console.log("eth_blockNumber:", blockRes);

  printSection("TRANSACTION LOOKUP");

  const txRes = await rpcCall("eth_getTransactionByHash", [txHash]);
  console.log("eth_getTransactionByHash:", JSON.stringify(txRes, null, 2));

  const txExists = !!txRes?.result;
  console.log("tx exists:", txExists);

  printSection("RECEIPT LOOKUP");

  const receiptRes = await rpcCall("eth_getTransactionReceipt", [txHash]);
  console.log("eth_getTransactionReceipt:", JSON.stringify(receiptRes, null, 2));

  const receiptExists = !!receiptRes?.result;
  console.log("receipt exists:", receiptExists);

  printSection("SUMMARY");

  if (txRes?.error) {
    console.log("❌ TX LOOKUP ERROR");
    console.log("This means the hash/request itself was rejected.");
    return;
  }

  if (receiptRes?.error) {
    console.log("❌ RECEIPT LOOKUP ERROR");
    console.log("This means the RPC rejected the receipt request.");
    return;
  }

  if (!txExists) {
    console.log("❌ Transaction not found on this chain/RPC.");
    console.log("Likely wrong hash or wrong chain.");
    return;
  }

  if (txExists && !receiptExists) {
    console.log("⚠️ Transaction exists, but receipt is missing.");
    console.log("This usually means indexing delay or timing.");
    return;
  }

  const receipt = receiptRes.result;
  const tx = txRes.result;

  console.log("✅ Transaction and receipt both found.");
  console.log("From:", tx.from);
  console.log("To:", tx.to);
  console.log("Block Number:", parseInt(receipt.blockNumber, 16));
  console.log("Status:", receipt.status === "0x1" ? "SUCCESS" : "FAILED");
  console.log("Gas Used:", parseInt(receipt.gasUsed, 16));
  console.log("Logs Count:", Array.isArray(receipt.logs) ? receipt.logs.length : 0);
}

main().catch((err) => {
  console.error("Fatal script error:", err);
  process.exit(1);
});