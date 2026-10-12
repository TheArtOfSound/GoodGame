import { createContext, useContext, useEffect, useRef, useState } from "react";
import { getJSON } from "../lib/api";
const GGContext = createContext(null);
export function GGProvider({ children }) {
  const [address, setAddress] = useState("");
  const [balance, setBalance] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [wallet, setWallet] = useState(null);
  const [scope, setScope] = useState('');
  const generation = useRef(0);
  const clear = () => { generation.current++; setAddress(""); setBalance(null); setScope(''); setBusy(false); setNotice(""); };
  async function refresh(nextAddress = address) {
    if (!nextAddress) return;
    const ticket = ++generation.current;
    setBalance(null); setBusy(true);
    try {
      const data = await getJSON(`/gg/balance?address=${encodeURIComponent(nextAddress)}`);
      if (ticket === generation.current) { setBalance(data.balance); setScope(data.scope || ''); setNotice(data.balance > 0 ? "GG detected. Gold pilot skin unlocked." : data.scope === 'associated-token-account' ? "No GG in this wallet's standard token account. All games are still free." : "Wallet connected. No GG detected; all games are still free."); }
    } catch { if (ticket === generation.current) setNotice("Wallet connected. Balance check is unavailable; try refreshing shortly."); }
    finally { if (ticket === generation.current) setBusy(false); }
  }
  async function connect(kind) {
    const provider = kind === "solflare" ? window.solflare : (window.phantom?.solana || (window.solana?.isPhantom ? window.solana : null));
    if (!provider) { setNotice(`Open this site in the ${kind === "solflare" ? "Solflare" : "Phantom"} wallet browser or install its browser extension, then retry.`); return; }
    setBusy(true); setNotice("");
    try {
      const result = await provider.connect();
      const next = (result?.publicKey || provider.publicKey)?.toString();
      if (!next) throw new Error("Wallet did not return an address");
      setWallet(provider); setAddress(next); await refresh(next);
    } catch { setNotice("Connection cancelled or unavailable. You can keep playing as a guest."); }
    finally { setBusy(false); }
  }
  async function disconnect() { clear(); setBusy(false); try { await wallet?.disconnect(); } catch {} setWallet(null); }
  useEffect(() => {
    if (!wallet?.on) return undefined;
    const changed = (key) => { clear(); if (key) { const a = key.toString(); setAddress(a); refresh(a); } };
    wallet.on("accountChanged", changed); wallet.on("disconnect", clear);
    return () => { wallet.removeListener?.("accountChanged", changed); wallet.removeListener?.("disconnect", clear); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet]);
  return <GGContext.Provider value={{ address, balance, scope, busy, notice, connect, disconnect, refresh, gold: balance !== null && balance > 0 }}>{children}</GGContext.Provider>;
}
export const useGG = () => useContext(GGContext);
