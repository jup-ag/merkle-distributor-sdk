import { BN, web3 } from '@coral-xyz/anchor';
import * as anchor from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { TransactionInstruction } from '@solana/web3.js';

import { MerkleDistributor as MerkleDistributorType } from './types/merkle_distributor';
import {
  createMerkleDistributorProgram,
  deriveClaimStatus,
  getOrCreateATAInstruction,
  MERKLE_DISTRIBUTOR_PROGRAM_ID,
} from './utils';

export interface UserResponse {
  merkle_tree: string;
  amount: number;
  proof: number[][];
}

export class MerkleDistributor {
  private mdProgram?: anchor.Program<MerkleDistributorType>;
  private mint: web3.PublicKey;
  private claimProofEndpoint: string;
  private user?: UserResponse | null;

  constructor(
    private provider: anchor.AnchorProvider,
    options: {
      targetToken: web3.PublicKey;
      claimProofEndpoint: string;
    },
  ) {
    this.mdProgram = createMerkleDistributorProgram(this.provider, MERKLE_DISTRIBUTOR_PROGRAM_ID);
    this.mint = options.targetToken;
    this.claimProofEndpoint = options.claimProofEndpoint;
  }

  async getUser(claimant: web3.PublicKey): Promise<UserResponse | null> {
    if (this.user) {
      return this.user;
    }
    try {
      const res = await fetch(`${this.claimProofEndpoint}/${this.mint.toBase58()}/${claimant.toBase58()}`);

      if (!res.ok) {
        return null;
      }
      const user = await res.json();
      this.user = user;
      return user;
    } catch (error) {
      return null;
    }
  }

  async claimToken(claimant: web3.PublicKey) {
    const {
      provider: { connection },
      mdProgram,
      mint,
    } = this;

    if (!claimant || !mint || !mdProgram) {
      return;
    }

    const user = await this.getUser(claimant);

    if (!user) {
      return;
    }

    const { proof, merkle_tree } = user;
    const distributor = new web3.PublicKey(merkle_tree);
    const [claimStatus, _csBump] = deriveClaimStatus(claimant, distributor, mdProgram.programId);

    const preInstructions: TransactionInstruction[] = [];

    const [toATA, toATAIx] = await getOrCreateATAInstruction(mint, claimant, connection, true, claimant);
    toATAIx && preInstructions.push(toATAIx);

    const [mdATA, mdATAIx] = await getOrCreateATAInstruction(mint, distributor, connection, true, claimant);
    mdATAIx && preInstructions.push(mdATAIx);

    return [
      ...preInstructions,
      await mdProgram.methods
        .newClaim(new BN(user.amount), new BN(0), proof as any)
        .accounts({
          claimant,
          claimStatus,
          distributor: distributor,
          from: mdATA,
          to: toATA,
          systemProgram: web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .instruction(),
    ];
  }
}
