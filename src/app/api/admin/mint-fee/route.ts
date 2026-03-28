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
];

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

function parseFeeEth(value: unknown) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    throw new Error("Missing feeEth");
  }

  const parsed = Number.parseFloat(raw);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Invalid feeEth");
  }

  return raw;
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
    // Real admin protection
    const admin = await verifyAdmin();

    if (!admin) {
      return jsonError("Admin access required", 403);
    }

    // Optional normal session lookup for nicer logs / response
    const session = await getSessionData().catch(() => null);

    // Read body
    const body = await req.json();
    const feeEth = parseFeeEth(body?.feeEth);

    // Load signer + contract
    const rpcUrl = process.env.BASE_RPC_URL || "https://mainnet.base.org";
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

    // Optional safety check: signer must own contract
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

    // Send tx
    const newFeeWei = ethers.parseEther(feeEth);

    const requestedBy =
      session?.email ||
      admin.email ||
      "admin";

    console.log(LOG, "sending setMintFee tx", {
      requestedBy,
      adminProfileId: admin.profileId || null,
      signer: signer.address,
      contractAddress,
      feeEth,
    });

    const tx = await contract.setMintFee(newFeeWei);

    console.log(LOG, "submitted tx", {
      hash: tx.hash,
    });

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
      requestedBy,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unexpected error";

    console.error(LOG, error);

    return jsonError(message, 500);
  }
}