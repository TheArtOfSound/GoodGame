import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { Keypair } from '../apps/web/node_modules/@solana/web3.js/lib/index.cjs.js';
registerHooks({resolve(specifier,context,next){return next(specifier==='./gg'&&context.parentURL?.endsWith('/mission.ts')?'./gg.ts':specifier,context);}});
const {ELIGIBLE_GAMES_SQL,missionData,validSupportWallet,supportUri,isNativeRecipientAccount,checkSupportWallet}=await import('../apps/web/src/mission.ts');
const mint='5QNJ5DDnTPYW1gfNoxeXBGy85Ws5k5vH5Ass1KWYmoon';
// Deterministic test-only public key; never used as a production recipient.
const wallet=Keypair.fromSeed(new Uint8Array(32).fill(7)).publicKey.toBase58();
function fixture(){const db=new DatabaseSync(':memory:');db.exec(`
 CREATE TABLE users(id TEXT,username TEXT,display_name TEXT,status TEXT DEFAULT 'active',deleted_at TEXT);
 CREATE TABLE games(id TEXT,owner_id TEXT,slug TEXT,title TEXT,pitch TEXT,updated_at TEXT,official INTEGER DEFAULT 0,status TEXT DEFAULT 'published',deleted_at TEXT,moderation_status TEXT DEFAULT 'clear',scan_status TEXT DEFAULT 'passed',play_template TEXT DEFAULT 'test',upload_entry TEXT,embed_url TEXT,embed_verified INTEGER);
 CREATE TABLE reviews(game_id TEXT,author_id TEXT,status TEXT DEFAULT 'published',body TEXT);
 CREATE TABLE media_assets(game_id TEXT,type TEXT,moderation_status TEXT,sort INTEGER,source_path TEXT);
 INSERT INTO users(id,username,display_name) VALUES('owner','maker','Maker'),('other','other','Other');
 INSERT INTO games(id,owner_id,slug,title) VALUES('game','owner','test-game','Test Game');
 `);return db;}
test('mission reviews require distinct active accounts, useful text, and exclude self',()=>{const db=fixture();try{
 const body='Useful feedback on the controls and pacing of this game.';
 db.prepare('INSERT INTO reviews(game_id,author_id,body) VALUES(?,?,?)').run('game','other',body);
 db.prepare('INSERT INTO reviews(game_id,author_id,body) VALUES(?,?,?)').run('game','other',body);
 db.prepare('INSERT INTO reviews(game_id,author_id,body) VALUES(?,?,?)').run('game','owner',body);
 assert.equal(db.prepare(ELIGIBLE_GAMES_SQL).get().feedback_count,1);
 db.exec("UPDATE reviews SET body='nice' WHERE author_id='other'");assert.equal(db.prepare(ELIGIBLE_GAMES_SQL).get().feedback_count,0);
 db.prepare('UPDATE reviews SET body=?').run(body);db.exec("UPDATE users SET status='suspended' WHERE id='other'");assert.equal(db.prepare(ELIGIBLE_GAMES_SQL).get().feedback_count,0);
}finally{db.close();}});
test('house games, blocked builds, unpublished games, and non-playable links are excluded',()=>{for(const update of ["official=1","status='draft'","moderation_status='blocked'","scan_status='pending'","deleted_at='now'","play_template=NULL","play_template=NULL,embed_url='https://example.com/game',embed_verified=0"]){const db=fixture();try{db.exec(`UPDATE games SET ${update}`);assert.equal(db.prepare(ELIGIBLE_GAMES_SQL).all().length,0,update);}finally{db.close();}}const db=fixture();try{db.exec("UPDATE games SET play_template=NULL,embed_url='https://example.com/game',embed_verified=1");assert.equal(db.prepare(ELIGIBLE_GAMES_SQL).all().length,1);}finally{db.close();}});
test('progress counts a creator once across games and exactly five qualifying reviewers',async()=>{const db=fixture();try{for(let i=0;i<5;i++){db.prepare('INSERT INTO users(id,username) VALUES(?,?)').run(`reviewer${i}`,`reviewer${i}`);db.prepare('INSERT INTO reviews(game_id,author_id,body) VALUES(?,?,?)').run('game',`reviewer${i}`,'The idea is fun. Please make the controls clearer on mobile.');}db.exec("INSERT INTO games(id,owner_id,slug,title) VALUES('game2','owner','second','Second')");const env={DB:{prepare(sql){return {async first(){return db.prepare(sql).get();},async all(){return {results:db.prepare(sql).all()};}};}}};const result=await missionData(env);assert.equal(result.qualified_creators,1);assert.equal(result.published_creators,1);assert.equal(result.games_available,2);assert.equal(result.games[0].slug,'second');assert.ok(!('owner_id' in result.games[0]));}finally{db.close();}});
test('Solana Pay requests pin GG mint, native wallet, optional amount and decimal limits',()=>{assert.equal(validSupportWallet(wallet),true);for(const bad of [mint,'11111111111111111111111111111111','bad'])assert.equal(validSupportWallet(bad),false);const uri=new URL(supportUri(wallet,'maker','12.345678'));assert.equal(uri.protocol,'solana:');assert.equal(uri.pathname,wallet);assert.equal(uri.searchParams.get('spl-token'),mint);assert.equal(uri.searchParams.get('amount'),'12.345678');assert.equal(new URL(supportUri(wallet,'maker')).searchParams.has('amount'),false);for(const bad of ['0','-1','1e6','1.1234567','NaN','Infinity'])assert.throws(()=>supportUri(wallet,'maker',bad));});
test('recipient account checks reject token mints, program data and executable accounts',async()=>{assert.equal(isNativeRecipientAccount(null),true);const account={owner:'11111111111111111111111111111111',executable:false,data:['','base64']};assert.equal(isNativeRecipientAccount(account),true);for(const bad of [{...account,owner:mint},{...account,executable:true},{...account,data:['AA==','base64']},undefined])assert.equal(isNativeRecipientAccount(bad),false);const original=globalThis.fetch;try{globalThis.fetch=async(url,options)=>{assert.equal(url,'https://solana-rpc.publicnode.com');assert.equal(JSON.parse(options.body).params[0],wallet);return new Response(JSON.stringify({result:{value:account}}));};assert.equal(await checkSupportWallet(wallet),true);globalThis.fetch=async()=>new Response(JSON.stringify({error:{code:429}}));await assert.rejects(()=>checkSupportWallet(wallet));}finally{globalThis.fetch=original;}});
