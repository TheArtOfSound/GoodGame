// Client wallet connect + sign-in. EIP-6963 discovers every injected EVM wallet;
// window.solana/solflare/backpack cover Solana. No bundler — plain inline JS.

export const WALLET_MODAL =
  '<div id="wallet-modal" class="wm-overlay" hidden>' +
    '<div class="wm-panel">' +
      '<div class="wm-head"><b>Connect a wallet</b><button class="wm-x" id="wm-close" aria-label="Close">✕</button></div>' +
      '<div class="wm-sub">Sign a free message to prove it’s you — no funds move, no password, no email.</div>' +
      '<div id="wm-list" class="wm-list"></div>' +
      '<div id="wm-msg" class="wm-msg"></div>' +
    '</div>' +
  '</div>';

export const WALLET_JS = `
(function(){
  var evm = [], seen = {};
  window.addEventListener('eip6963:announceProvider', function(e){
    var d = e.detail; if (d && d.info && !seen[d.info.uuid]) { seen[d.info.uuid] = 1; evm.push(d); }
  });
  window.dispatchEvent(new Event('eip6963:requestProvider'));

  function evmWallets(){
    var out = evm.map(function(w){ return { name:w.info.name, icon:w.info.icon, provider:w.provider, chain:'evm' }; });
    if (out.length === 0 && window.ethereum) out.push({ name: window.ethereum.isMetaMask?'MetaMask':'Browser Wallet', icon:'', provider:window.ethereum, chain:'evm' });
    return out;
  }
  function solWallets(){
    var out = [];
    if (window.solana && window.solana.isPhantom) out.push({ name:'Phantom', icon:'', provider:window.solana, chain:'sol' });
    if (window.solflare && window.solflare.isSolflare) out.push({ name:'Solflare', icon:'', provider:window.solflare, chain:'sol' });
    if (window.backpack) out.push({ name:'Backpack', icon:'', provider:window.backpack, chain:'sol' });
    return out;
  }
  function hexOf(u8){ var s=''; for (var i=0;i<u8.length;i++) s += ('0'+u8[i].toString(16)).slice(-2); return s; }
  function msg(t, err){ var m=document.getElementById('wm-msg'); if(m){ m.textContent=t||''; m.style.color = err?'#f0556b':'var(--text-3)'; } }

  function render(){
    var list = document.getElementById('wm-list'); if(!list) return; list.innerHTML=''; msg('');
    var ws = evmWallets().concat(solWallets());
    if (ws.length === 0){ list.innerHTML = '<div class="wm-empty">No wallet detected. Install <a href="https://metamask.io" target="_blank" rel="noopener">MetaMask</a> (EVM) or <a href="https://phantom.app" target="_blank" rel="noopener">Phantom</a> (Solana), then refresh.</div>'; return; }
    ws.forEach(function(w){
      var b = document.createElement('button'); b.className='wm-item';
      var ic = w.icon ? '<img src="'+w.icon+'" alt=""/>' : '<span class="wm-dot" style="background:'+(w.chain==='sol'?'#9945FF':'#6b93ff')+'"></span>';
      b.innerHTML = ic + '<span class="wm-name">'+w.name+'</span><span class="wm-chain">'+(w.chain==='sol'?'Solana':'EVM')+'</span>';
      b.onclick = function(){ connect(w); };
      list.appendChild(b);
    });
  }

  function connect(w){
    msg('Connecting…');
    (async function(){
      try{
        var address, chain = w.chain;
        if (chain === 'evm'){
          var accts = await w.provider.request({ method:'eth_requestAccounts' });
          address = accts[0];
        } else {
          var resp = await w.provider.connect();
          address = (resp && resp.publicKey ? resp.publicKey : w.provider.publicKey).toString();
        }
        var nr = await fetch('/auth/nonce?address='+encodeURIComponent(address)+'&chain='+chain).then(function(r){ return r.json(); });
        msg('Check your wallet to sign…');
        var signature;
        if (chain === 'evm'){
          signature = await w.provider.request({ method:'personal_sign', params:[nr.message, address] });
        } else {
          var enc = new TextEncoder().encode(nr.message);
          var sig = await w.provider.signMessage(enc, 'utf8');
          signature = hexOf(sig.signature || sig);
        }
        msg('Verifying…');
        var vr = await fetch('/auth/verify', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ address:address, chain:chain, signature:signature, nonce:nr.nonce }) }).then(function(r){ return r.json(); });
        if (vr.ok){ msg('Signed in!'); location.reload(); } else { msg(vr.error||'Sign-in failed.', true); }
      } catch(e){ msg((e && e.message) ? e.message : 'Connection cancelled.', true); }
    })();
  }

  function buyMsg(t, err){ var m=document.getElementById('buy-msg'); if(m){ m.textContent=t; m.style.color = err?'#f0556b':'var(--text-3)'; } }
  function pad32(hex){ return hex.replace(/^0x/,'').toLowerCase().padStart(64,'0'); }
  async function ensureChain(provider, chainId){
    var hex = '0x' + chainId.toString(16);
    try { await provider.request({ method:'wallet_switchEthereumChain', params:[{ chainId:hex }] }); }
    catch(e){
      if (e && e.code === 4902){
        var p = chainId === 84532
          ? { chainId:hex, chainName:'Base Sepolia', rpcUrls:['https://sepolia.base.org'], nativeCurrency:{name:'Ether',symbol:'ETH',decimals:18}, blockExplorerUrls:['https://sepolia.basescan.org'] }
          : { chainId:hex, chainName:'Base', rpcUrls:['https://mainnet.base.org'], nativeCurrency:{name:'Ether',symbol:'ETH',decimals:18}, blockExplorerUrls:['https://basescan.org'] };
        await provider.request({ method:'wallet_addEthereumChain', params:[p] });
      } else throw e;
    }
  }
  function loadScript(src){ return new Promise(function(res, rej){ if (document.querySelector('script[data-gg="'+src+'"]')){ res(); return; } var s=document.createElement('script'); s.src=src; s.setAttribute('data-gg', src); s.onload=function(){ res(); }; s.onerror=function(){ rej(new Error('Failed to load Solana library.')); }; document.head.appendChild(s); }); }
  async function buySolana(q){
    if (!window.solanaWeb3) await loadScript('https://unpkg.com/@solana/web3.js@1.95.3/lib/index.iife.min.js');
    var w3 = window.solanaWeb3;
    var provider = window.solana || window.solflare;
    if (!provider){ buyMsg('No Solana wallet found — install Phantom.', true); return null; }
    if (q.token !== 'SOL'){ buyMsg('USDC-on-Solana from the browser is the next step — this build pays in native SOL.', true); return null; }
    var resp = await provider.connect(); var from = (resp && resp.publicKey ? resp.publicKey : provider.publicKey).toString();
    var conn = new w3.Connection(q.rpc, 'confirmed');
    var tx = new w3.Transaction().add(w3.SystemProgram.transfer({ fromPubkey: new w3.PublicKey(from), toPubkey: new w3.PublicKey(q.payTo), lamports: Number(BigInt(q.amount)) }));
    tx.feePayer = new w3.PublicKey(from);
    tx.recentBlockhash = (await conn.getLatestBlockhash()).blockhash;
    var sig = await provider.signAndSendTransaction(tx);
    return sig && sig.signature ? sig.signature : sig;
  }
  window.ggBuy = function(slug){
    (async function(){
      try{
        buyMsg('Creating order…');
        var q = await fetch('/buy/create', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ gameSlug: slug }) }).then(function(r){ return r.json(); });
        if (q.error){ buyMsg(q.error, true); if (/wallet/i.test(q.error)) window.ggOpenWallet(); return; }
        var txHash;
        if (q.kind === 'solana') {
          buyMsg('Confirm the payment in your wallet…');
          txHash = await buySolana(q);
          if (!txHash) return;
        } else {
          var provider = window.ethereum;
          if (!provider){ buyMsg('No EVM wallet found — install MetaMask to pay on Base.', true); return; }
          var accts = await provider.request({ method:'eth_requestAccounts' }); var from = accts[0];
          buyMsg('Switch your wallet to the right network…');
          await ensureChain(provider, q.chainId);
          buyMsg('Confirm the payment in your wallet…');
          var txp;
          if (q.token === 'USDC') txp = { from:from, to:q.tokenContract, data:'0xa9059cbb' + pad32(q.payTo) + pad32(BigInt(q.amount).toString(16)) };
          else txp = { from:from, to:q.payTo, value:'0x' + BigInt(q.amount).toString(16) };
          txHash = await provider.request({ method:'eth_sendTransaction', params:[txp] });
        }
        buyMsg('Payment sent. Verifying on-chain…');
        var ok=false, tries=0;
        while (tries < 20){
          var r = await fetch('/buy/confirm', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ orderId:q.orderId, txHash:txHash }) }).then(function(x){ return x.json(); });
          if (r.ok){ ok=true; break; }
          if (r.error && !/wait|not found|confirmation/i.test(r.error)){ buyMsg(r.error, true); return; }
          tries++; await new Promise(function(res){ setTimeout(res, 3000); });
        }
        if (ok){ buyMsg('Purchased — unlocking…'); location.reload(); }
        else buyMsg('Payment sent but not confirmed yet. Refresh in a minute.', true);
      } catch(e){ buyMsg((e && e.message) ? e.message : 'Purchase cancelled.', true); }
    })();
  };

  window.ggFollow = function(btn){
    var slug = btn.getAttribute('data-slug'); if(!slug) return;
    btn.disabled = true;
    fetch('/api/follow/'+slug, { method:'POST' }).then(function(r){
      if (r.status === 401){ window.ggOpenWallet(); throw new Error('connect'); }
      return r.json();
    }).then(function(j){
      if (j && j.following){ btn.textContent='★ Following'; btn.classList.add('on'); }
      else { btn.textContent='★ Follow'; btn.classList.remove('on'); }
    }).catch(function(){}).finally(function(){ btn.disabled=false; });
  };
  window.ggOpenWallet = function(){ var m=document.getElementById('wallet-modal'); if(m){ m.hidden=false; render(); } };
  document.addEventListener('click', function(e){
    var t = e.target; if(!t) return;
    if (t.id === 'wallet-connect-btn') window.ggOpenWallet();
    else if (t.id === 'wm-close' || (t.classList && t.classList.contains('wm-overlay'))) { var m=document.getElementById('wallet-modal'); if(m) m.hidden=true; }
    else if (t.id === 'wallet-logout') { fetch('/auth/logout',{method:'POST'}).then(function(){ location.reload(); }); }
    else if (t.id === 'buy-btn') window.ggBuy(t.getAttribute('data-slug'));
    else if (t.id === 'follow-btn') window.ggFollow(t);
  });

  fetch('/auth/me').then(function(r){ return r.json(); }).then(function(d){
    if (d && d.user){
      var cta = document.getElementById('wallet-cta');
      if (cta) cta.innerHTML =
        '<a class="btn btn-ghost btn-sm" href="/dashboard" title="'+d.user.wallet_address+'">'+
        '<span class="wm-ava" style="background:'+(d.user.avatar||'#6b93ff')+'"></span>'+d.user.display_name+'</a>'+
        '<button class="btn btn-sm" id="wallet-logout" style="background:var(--panel-3);color:var(--text);border:1px solid var(--line)">Logout</button>';
    }
  }).catch(function(){});
})();
`;
