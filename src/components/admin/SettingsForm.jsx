"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useReadContract } from "wagmi";
import { formatEther } from "viem";
import {
  getChainId,
  getCreatorContractAddress,
  getExplorerUrl,
  AURORA_CREATOR_ABI,
} from "@/lib/web3/contract";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import {
  Save,
  AlertTriangle,
  Loader2,
  Check,
  DollarSign,
  Sparkles,
  ExternalLink,
  RefreshCw,
  Shield,
} from "lucide-react";

function formatUsd(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: num % 1 === 0 ? 0 : 2,
  }).format(num);
}

function formatEth(value, digits = 8) {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return num.toFixed(digits).replace(/\.?0+$/, "");
}

function safeNum(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

async function readJsonSafe(res) {
  const raw = await res.text();
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return { error: raw || "Invalid server response" };
  }
}

export default function SettingsForm() {
  const [settings, setSettings] = useState({
    mint_price_eth: "0.005",
    create_mint_fee_usd: "5",
  });

  const [loading, setLoading] = useState(true);

  const [ethPrice, setEthPrice] = useState(null);
  const [ethPriceSource, setEthPriceSource] = useState("");
  const [ethPriceUpdatedAt, setEthPriceUpdatedAt] = useState("");
  const [ethPriceLoading, setEthPriceLoading] = useState(false);
  const [ethPriceError, setEthPriceError] = useState(null);

  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [txHash, setTxHash] = useState(null);

  const targetChainId = getChainId();
  const creatorContract = getCreatorContractAddress();
  const explorerUrl = getExplorerUrl();
  const chainName = targetChainId === 8453 ? "Base" : "Base Sepolia";

  const { data: onChainFeeRaw, refetch: refetchFee } = useReadContract({
    address: creatorContract || undefined,
    abi: AURORA_CREATOR_ABI,
    functionName: "mintFee",
    chainId: targetChainId,
    query: { enabled: Boolean(creatorContract) },
  });

  const onChainFee = onChainFeeRaw != null ? formatEther(onChainFeeRaw) : null;

  const loadEthPrice = useCallback(async () => {
    setEthPriceLoading(true);
    setEthPriceError(null);

    try {
      const res = await fetch("/api/pricing/eth-usd", {
        method: "GET",
        cache: "no-store",
      });

      const data = await readJsonSafe(res);

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Failed to load ETH price");
      }

      const usd = Number(data.usd);
      if (!Number.isFinite(usd) || usd <= 0) {
        throw new Error("Invalid ETH price received");
      }

      setEthPrice(usd);
      setEthPriceSource(data.source || "server");
      setEthPriceUpdatedAt(data.fetchedAt || new Date().toISOString());
    } catch (err) {
      setEthPriceError(err?.message || "Failed to load ETH price");
      setEthPrice(null);
      setEthPriceSource("");
      setEthPriceUpdatedAt("");
    } finally {
      setEthPriceLoading(false);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings", {
        method: "GET",
        cache: "no-store",
      });

      const data = await readJsonSafe(res);

      if (data?.settings) {
        setSettings((prev) => ({
          ...prev,
          mint_price_eth: data.settings.mint_price_eth ?? prev.mint_price_eth,
          create_mint_fee_usd:
            data.settings.create_mint_fee_usd ?? prev.create_mint_fee_usd,
        }));
      }
    } catch (err) {
      console.error("[SettingsForm] fetchSettings error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    loadEthPrice();

    const id = setInterval(() => {
      loadEthPrice();
    }, 30000);

    return () => clearInterval(id);
  }, [fetchSettings, loadEthPrice]);

  const updateField = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const saveDbSetting = useCallback(async (key, value) => {
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value, adminWallet: null }),
    });

    const data = await readJsonSafe(res);

    if (!res.ok) {
      throw new Error(data?.error || `Failed to save ${key}`);
    }

    return data;
  }, []);

  const targetUsdNumber = safeNum(settings.create_mint_fee_usd);

  const liveCreateMintEth = useMemo(() => {
    if (targetUsdNumber === null || !ethPrice) return null;
    return formatEth(targetUsdNumber / ethPrice, 8);
  }, [targetUsdNumber, ethPrice]);

  const liveCreateMintUsdLabel = useMemo(() => {
    return (
      formatUsd(settings.create_mint_fee_usd) ||
      `$${settings.create_mint_fee_usd || "0"}`
    );
  }, [settings.create_mint_fee_usd]);

  const onChainFeeUsd = useMemo(() => {
    if (!onChainFee || !ethPrice) return null;
    const feeNum = Number(onChainFee);
    if (!Number.isFinite(feeNum)) return null;
    return (feeNum * ethPrice).toFixed(2);
  }, [onChainFee, ethPrice]);

  const targetMatchTone = useMemo(() => {
    if (!liveCreateMintEth || !onChainFee) return "default";

    const target = Number(liveCreateMintEth);
    const live = Number(onChainFee);

    if (!Number.isFinite(target) || !Number.isFinite(live) || target <= 0) {
      return "default";
    }

    const diffPercent = Math.abs(((live - target) / target) * 100);

    if (diffPercent <= 3) return "success";
    if (diffPercent <= 10) return "warning";
    return "danger";
  }, [liveCreateMintEth, onChainFee]);

  const targetMatchLabel = useMemo(() => {
    if (!liveCreateMintEth || !onChainFee) return "No comparison";

    const target = Number(liveCreateMintEth);
    const live = Number(onChainFee);

    if (!Number.isFinite(target) || !Number.isFinite(live) || target <= 0) {
      return "No comparison";
    }

    const diff = ((live - target) / target) * 100;

    if (diff === 0) return "Perfect match";
    if (Math.abs(diff) < 0.05) return "Perfect match";

    const abs = Math.abs(diff).toFixed(1);
    return diff > 0 ? `${abs}% above target` : `${abs}% below target`;
  }, [liveCreateMintEth, onChainFee]);

  const handleSaveCreateMintPrice = useCallback(async () => {
    setSaveError(null);
    setSaveSuccess(false);
    setTxHash(null);

    const usdVal = parseFloat(String(settings.create_mint_fee_usd || ""));
    if (!Number.isFinite(usdVal) || usdVal < 0) {
      setSaveError("Enter a valid USD mint price.");
      return;
    }

    if (!ethPrice || !Number.isFinite(ethPrice) || ethPrice <= 0) {
      setSaveError("ETH price is unavailable right now.");
      return;
    }

    const convertedEth = formatEth(usdVal / ethPrice, 8);
    if (!convertedEth) {
      setSaveError("Failed to convert USD to ETH.");
      return;
    }

    setSaveLoading(true);

    try {
      // 1) Push exact ETH fee on-chain through backend signer
      const feeRes = await fetch("/api/admin/mint-fee", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          feeEth: convertedEth,
        }),
      });

      const feeData = await readJsonSafe(feeRes);

      if (!feeRes.ok || !feeData?.success) {
        throw new Error(feeData?.error || "Failed to update on-chain mint fee");
      }

      const confirmedFeeEth = String(feeData.mintFeeEth || convertedEth);

      // 2) Save the USD target and the exact locked ETH into DB
      await saveDbSetting("create_mint_fee_usd", String(settings.create_mint_fee_usd));
      await saveDbSetting("mint_price_eth", confirmedFeeEth);

      updateField("mint_price_eth", confirmedFeeEth);
      setTxHash(feeData?.txHash || null);

      await refetchFee();

      setSaveSuccess(true);

      window.setTimeout(() => {
        setSaveSuccess(false);
      }, 4000);
    } catch (err) {
      setSaveError(err?.message || "Failed to save create/mint price.");
    } finally {
      setSaveLoading(false);
    }
  }, [settings.create_mint_fee_usd, ethPrice, saveDbSetting, refetchFee]);

  const txExplorerLink = txHash ? `${explorerUrl}/tx/${txHash}` : null;

  if (loading) {
    return (
      <div className="p-12 text-center">
        <Loader2 size={24} className="mx-auto animate-spin text-accent" />
        <p className="mt-3 text-sm text-muted">Loading create / mint price...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-5 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-violet/10">
            <Sparkles size={18} className="text-accent-violet" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-text">Create / Mint Price</h3>
            <p className="text-xs text-muted">
              Set your price in USD. On save, the current ETH equivalent is pushed on-chain and
              stored as the locked mint price until you change it again.
            </p>
          </div>
        </div>

        <Input
          label="Mint Price (USD)"
          value={settings.create_mint_fee_usd}
          onChange={(e) => updateField("create_mint_fee_usd", e.target.value)}
          placeholder="5"
          type="number"
          step="0.01"
          min="0"
        />

        <div className="rounded-xl bg-surface2/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] text-muted">Preview — this is what will be locked on save:</p>

            <button
              onClick={loadEthPrice}
              className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline"
              disabled={ethPriceLoading}
            >
              {ethPriceLoading ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <RefreshCw size={11} />
              )}
              Refresh rate
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted">You set</span>
              <span className="font-mono text-text">{liveCreateMintUsdLabel}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-muted">ETH rate</span>
              <span className="font-mono text-xs">
                {ethPrice ? `1 ETH = ${formatUsd(ethPrice)}` : "Loading..."}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-muted">ETH to lock</span>
              <span className="font-mono font-semibold text-accent">
                {liveCreateMintEth ? `${liveCreateMintEth} ETH` : "—"}
              </span>
            </div>

            <div className="flex justify-between border-t border-border-light pt-2 text-sm">
              <span className="text-muted">Currently locked</span>
              <span className="font-mono text-success">
                {settings.mint_price_eth ? `${settings.mint_price_eth} ETH` : "—"}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-muted">Current on-chain fee</span>
              <span className="font-mono text-accent">
                {onChainFee ? `${onChainFee} ETH` : "—"}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-muted">Current on-chain USD</span>
              <span className="font-mono text-xs">
                {onChainFeeUsd ? formatUsd(onChainFeeUsd) : "—"}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-muted">Target match</span>
              <Badge color={targetMatchTone} className="!text-[10px]">
                {targetMatchLabel}
              </Badge>
            </div>

            {creatorContract && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Contract</span>
                  <a
                    href={`${explorerUrl}/address/${creatorContract}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 font-mono text-xs text-accent hover:underline"
                  >
                    {creatorContract.slice(0, 6)}...{creatorContract.slice(-4)}
                    <ExternalLink size={10} />
                  </a>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-muted">Network</span>
                  <span className="font-mono text-xs">{chainName}</span>
                </div>
              </>
            )}

            {ethPriceSource && (
              <div className="flex justify-between text-sm">
                <span className="text-muted">Rate source</span>
                <span className="font-mono text-xs">{ethPriceSource}</span>
              </div>
            )}

            {ethPriceUpdatedAt && (
              <div className="flex justify-between text-sm">
                <span className="text-muted">Rate updated</span>
                <span className="font-mono text-xs">
                  {new Date(ethPriceUpdatedAt).toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>

          {ethPriceError && (
            <div className="mt-3 rounded-lg border border-warning/20 bg-warning/10 p-3 text-[11px] text-warning">
              {ethPriceError}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-accent/20 bg-accent/5 p-3">
          <Shield size={14} className="text-accent" />
          <p className="text-xs text-muted">
            Saving here pushes the new fee on-chain through your secure backend signer, then stores
            the same locked ETH value in the database.
          </p>
        </div>

        {saveError && (
          <div className="flex items-start gap-2 rounded-xl border border-danger/20 bg-danger/10 p-3">
            <AlertTriangle size={14} className="mt-0.5 text-danger" />
            <p className="break-all text-xs text-danger">{saveError}</p>
          </div>
        )}

        {saveSuccess && (
          <div className="flex items-center gap-2 rounded-xl border border-success/20 bg-success/10 p-3">
            <Check size={14} className="text-success" />
            <p className="text-xs text-success">
              Create / mint price updated. Locked at {settings.mint_price_eth} ETH.
            </p>

            {txExplorerLink && (
              <a
                href={txExplorerLink}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto flex items-center gap-1 text-xs text-accent hover:underline"
              >
                <ExternalLink size={10} />
                Tx
              </a>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={handleSaveCreateMintPrice}
            disabled={saveLoading || !ethPrice || !liveCreateMintEth}
          >
            {saveLoading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Saving & locking...
              </>
            ) : (
              <>
                <Save size={14} />
                Save & Lock ETH Price
              </>
            )}
          </Button>

          {settings.mint_price_eth && !saveSuccess && (
            <Badge color="success">Locked at {settings.mint_price_eth} ETH</Badge>
          )}
        </div>
      </Card>
    </div>
  );
}