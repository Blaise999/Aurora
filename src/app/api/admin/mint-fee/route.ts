import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { getSessionData } from "@/lib/auth/session";

export const runtime = "nodejs";

const LOG = "[/api/admin/mint-fee]";

const CREATOR_ABI = [
  "function owner() view returns (address)",
  "function mintFee() view returns (uint256)",
  "function setMintFee(uint256 newFee) external",
] as const;

type AdminPayload = {
  role?: string;
  email?: string;
  profileId?: string;
};

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

function getErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "shortMessage" in error &&
    typeof (error as { shortMessage?: unknown }).shortMessage === "string"
  ) {
    return (error as { shortMessage: string }).shortMessage;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected error";
}

function parseFeeEth(value: unknown) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    throw new Error("Missing feeEth");
  }

  // Accept only normal decimal strings
  if (!/^\d+(\.\d+)?$/.test(raw)) {
    throw new Error("Invalid feeEth");
  }

  const parsed = Number.parseFloat(raw);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Invalid feeEth");
  }

  return raw;
}

function cleanPrivateKey(input?: string | null) {
  const raw = String(input ?? "").trim().replace(/^["']|["']$/g, "");

  if (!raw) {
    throw new Error("Missing ADMIN_OWNER_PRIVATE_KEY");
  }

  const withPrefix = raw.startsWith("0x") ? raw : `0x${raw}`;
  const hex = withPrefix.slice(2);

  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error("Invalid ADMIN_OWNER_PRIVATE_KEY");
  }

  return withPrefix;
}

function cleanContractAddress(input?: string | null) {
  const raw = String(input ?? "").trim().replace(/^["']|["']$/g, "");

  if (!raw) {
    throw new Error("Missing creator contract address");
  }

  if (!ethers.isAddress(raw)) {
    throw new Error("Invalid creator contract address");
  }

  return ethers.getAddress(raw);
}

function getExpectedChainId() {
  const raw = String(process.env.NEXT_PUBLIC_CHAIN_ID || "8453").trim();

  if (raw !== "8453" && raw !== "84532") {
    throw new Error("NEXT_PUBLIC_CHAIN_ID must be 8453 or 84532");
  }

  return Number(raw);
}

function buildDefaultRpcUrl(chainId: number) {
  const alchemyKey = String(process.env.ALCHEMY_API_KEY || "").trim();

  if (alchemyKey) {
    return chainId === 84532
      ? `https://base-sepolia.g.alchemy.com/v2/${alchemyKey}`
      : `https://base-mainnet.g.alchemy.com/v2/${alchemyKey}`;
  }

  return chainId === 84532
    ? "https://sepolia.base.org"
    : "https://mainnet.base.org";
}

function resolveRpcUrl() {
  const chainId = getExpectedChainId();
  const rawEnv = String(process.env.BASE_RPC_URL || "").trim();
  let rpc = rawEnv || buildDefaultRpcUrl(chainId);

  rpc = rpc.replace(/\s+/g, "");

  if (!/^https?:\/\//i.test(rpc)) {
    rpc = `https://${rpc}`;
  }

  const withoutProtocol = rpc.replace(/^https?:\/\//i, "");

  // catches stuff like:
  // base-mainnet.g.alchemy.comhttps
  // https://https://...
  // https://base-mainnet.g.alchemy.comhttps/v2/...
  if (/https?:\/\//i.test(withoutProtocol) || /https$/i.test(withoutProtocol)) {
    throw new Error(
      `Invalid BASE_RPC_URL. Got "${rawEnv}". Expected a full URL like https://base-mainnet.g.alchemy.com/v2/KEY`
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(rpc);
  } catch {
    throw new Error(
      `Invalid BASE_RPC_URL. Got "${rawEnv}". Expected a valid URL.`
    );
  }

  if (!parsed.hostname) {
    throw new Error("Invalid BASE_RPC_URL: missing hostname");
  }

  return parsed.toString().replace(/\/$/, "");
}

async function verifyAdmin(): Promise<AdminPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_session")?.value;

    if (!token) {
      return null;
    }

    const secretValue =
      process.env.SESSION_SECRET || process.env.ADMIN_SECRET || "";

    if (!secretValue) {
      console.error(LOG, "Missing SESSION_SECRET / ADMIN_SECRET");
      return null;
    }

    const secret = new TextEncoder().encode(secretValue);
    const { payload } = await jwtVerify(token, secret);

    if (payload?.role !== "admin") {
      return null;
    }

    return {
      role: typeof payload.role === "string" ? payload.role : undefined,
      email: typeof payload.email === "string" ? payload.email : undefined,
      profileId:
        typeof payload.profileId === "string" ? payload.profileId : undefined,
    };
  } catch (error) {
    console.error(LOG, "verifyAdmin failed", error);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const admin = await verifyAdmin();

    if (!admin) {
      return jsonError("Admin access required", 403);
    }

    const session = await getSessionData().catch(() => null);

    const body = await req.json();
    const feeEth = parseFeeEth(body?.feeEth);

    const rpcUrl = resolveRpcUrl();
    const expectedChainId = getExpectedChainId();
    const privateKey = cleanPrivateKey(process.env.ADMIN_OWNER_PRIVATE_KEY);
    const contractAddress = cleanContractAddress(
      process.env.CREATOR_CONTRACT_ADDRESS ||
        process.env.NEXT_PUBLIC_CREATOR_CONTRACT
    );

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const network = await provider.getNetwork();
    const actualChainId = Number(network.chainId);

    if (actualChainId !== expectedChainId) {
      return jsonError("RPC network does not match NEXT_PUBLIC_CHAIN_ID", 500, {
        expectedChainId,
        actualChainId,
        rpcUrl,
      });
    }

    const signer = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(contractAddress, CREATOR_ABI, signer);

    let ownerAddress: string;
    try {
      ownerAddress = ethers.getAddress(await contract.owner());
    } catch (error) {
      console.error(LOG, "owner() read failed", error);
      return jsonError("Failed to read contract owner()", 500, {
        contractAddress,
      });
    }

    if (ownerAddress.toLowerCase() !== signer.address.toLowerCase()) {
      return jsonError("Server signer is not the contract owner", 500, {
        signer: signer.address,
        owner: ownerAddress,
      });
    }

    const newFeeWei = ethers.parseEther(feeEth);

    let currentFeeWei: bigint;
    try {
      currentFeeWei = await contract.mintFee();
    } catch (error) {
      console.error(LOG, "mintFee() read failed", error);
      return jsonError("Failed to read current mint fee", 500, {
        contractAddress,
      });
    }

    const requestedBy = session?.email || admin.email || "admin";

    if (currentFeeWei === newFeeWei) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: "Mint fee is already set to that value",
        contractAddress,
        signer: signer.address,
        mintFeeEth: ethers.formatEther(currentFeeWei),
        requestedBy,
      });
    }

    console.log(LOG, "sending setMintFee tx", {
      requestedBy,
      adminProfileId: admin.profileId || null,
      signer: signer.address,
      contractAddress,
      feeEth,
      rpcUrl,
      expectedChainId,
    });

    const tx = await contract.setMintFee(newFeeWei);

    console.log(LOG, "submitted tx", {
      hash: tx.hash,
    });

    const receipt = await tx.wait();

    if (!receipt) {
      return jsonError("Transaction was submitted but no receipt was returned", 500, {
        txHash: tx.hash,
      });
    }

    const confirmedFeeWei = await contract.mintFee();
    const confirmedFeeEth = ethers.formatEther(confirmedFeeWei);

    return NextResponse.json({
      success: true,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber ?? null,
      contractAddress,
      signer: signer.address,
      mintFeeEth: confirmedFeeEth,
      requestedBy,
      chainId: actualChainId,
    });
  } catch (error: unknown) {
    const message = getErrorMessage(error);

    console.error(LOG, error);

    return jsonError(message, 500);
  }
}