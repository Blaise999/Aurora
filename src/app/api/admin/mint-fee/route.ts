import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { getSessionData } from "@/lib/auth/session";

export const runtime = "nodejs";

const LOG = "[/api/admin/mint-fee]";

const CREATOR_ABI = [
  "function owner() view returns (address)",
  "function mintFee() view returns (uint256)",
  "function setMintFee(uint256 newFee) external",
];

function jsonError(
  message: string,
  status = 400,
  extra?: Record<string, unknown>
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      ...(extra || {}),
    },
    { status }
  );
}

function parseFeeEth(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) throw new Error("Missing feeEth");
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Invalid feeEth");
  }
  return raw;
}

export async function POST(req: Request) {
  try {
    // 1) Protect this route properly
    const session = await getSessionData();

    if (!session?.email || !session?.profileId) {
      return jsonError("Unauthorized", 401);
    }

    // Replace this with your real admin check
    // Example ideas:
    // - profiles.is_admin === true
    // - allowlist of admin emails in env
    const adminEmails = String(process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean);

    const requesterEmail = String(session.email).toLowerCase();

    if (!adminEmails.includes(requesterEmail)) {
      return jsonError("Admin access required", 403);
    }

    // 2) Read body
    const body = await req.json();
    const feeEth = parseFeeEth(body?.feeEth);

    // 3) Load server signer
    const rpcUrl =
      process.env.BASE_RPC_URL ||
      "https://mainnet.base.org";

    const privateKey = process.env.ADMIN_OWNER_PRIVATE_KEY;
    const contractAddress = process.env.NEXT_PUBLIC_CREATOR_CONTRACT;

    if (!privateKey) {
      return jsonError("Missing ADMIN_OWNER_PRIVATE_KEY", 500);
    }

    if (!contractAddress) {
      return jsonError("Missing NEXT_PUBLIC_CREATOR_CONTRACT", 500);
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(contractAddress, CREATOR_ABI, signer);

    // 4) Optional safety check: confirm signer owns the contract
    let ownerAddress: string | null = null;
    try {
      ownerAddress = String(await contract.owner()).toLowerCase();
    } catch {
      ownerAddress = null;
    }

    if (ownerAddress && ownerAddress !== signer.address.toLowerCase()) {
      return jsonError("Server signer is not the contract owner", 500, {
        signer: signer.address,
        owner: ownerAddress,
      });
    }

    // 5) Send tx
    const newFeeWei = ethers.parseEther(feeEth);

    console.log(LOG, "sending setMintFee tx", {
      requestedBy: requesterEmail,
      signer: signer.address,
      contractAddress,
      feeEth,
    });

    const tx = await contract.setMintFee(newFeeWei);
    console.log(LOG, "submitted tx", { hash: tx.hash });

    const receipt = await tx.wait();

    const confirmedFeeWei = await contract.mintFee();
    const confirmedFeeEth = ethers.formatEther(confirmedFeeWei);

    return NextResponse.json({
      success: true,
      txHash: tx.hash,
      blockNumber: receipt?.blockNumber ?? null,
      contractAddress,
      signer: signer.address,
      mintFeeEth: confirmedFeeEth,
      requestedBy: requesterEmail,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error(LOG, error);
    return jsonError(message, 500);
  }
}