# Merkle Distributor SDK

## Installing

```
npm i @jup-ag/merkle-distributor-sdk
```

## How to use

1. Initialize MerkleDistributor instance

```ts
import MerkleDistributor from '@jup-ag/merkle-distributor-sdk';
import { PublicKey } from '@solana/web3.js';
import { AnchorProvider, web3 } from '@coral-xyz/anchor';
import { Connection } from '@solana/web3.js';

const mainnetConnection = new Connection('https://api.mainnet-beta.solana.com');
const mockWallet = new Wallet(new Keypair());
const provider = new AnchorProvider(mainnetConnection, mockWallet, {
  commitment: 'confirmed',
});

const merkleDistributor = new MerkleDistributor(provider, {
  targetToken: new PublicKey(TARGET_TOKEN),
  claimProofEndpoint: CLAIM_PROOF_ENDPOINT,
});
```

2. To claim token with MerkleDistributor

```ts
const ixs = await merkleDistributor.claimToken(publicKey);
const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
let transaction = new Transaction({
  feePayer: publicKey,
  blockhash,
  lastValidBlockHeight,
}).add(...ixs);

transaction = await wallet.signTransaction(transaction);

const rawTransaction = transaction.serialize();
const txid = await connection.sendRawTransaction(rawTransaction, {
  skipPreflight: true,
});
```
