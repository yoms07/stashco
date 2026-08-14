import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}




export const Errors = {
  1: {message:"AlreadyInitialized"},
  2: {message:"NotInitialized"},
  3: {message:"NotAuthorized"},
  4: {message:"OwnerIsApprover"},
  5: {message:"RequestNotFound"},
  6: {message:"RequestNotPending"},
  7: {message:"InsufficientFunds"},
  8: {message:"InvalidAmount"}
}

export type DataKey = {tag: "Owner", values: void} | {tag: "Approver", values: void} | {tag: "Pool", values: void} | {tag: "Usdc", values: void} | {tag: "NextRequestId", values: void} | {tag: "Request", values: readonly [u32]};


export interface PayoutRequest {
  amount: i128;
  destination: string;
  memo: string;
  status: RequestStatus;
}

export type RequestStatus = {tag: "Pending", values: void} | {tag: "Approved", values: void} | {tag: "Rejected", values: void};


export interface Request {
  address: string;
  amount: i128;
  request_type: u32;
}


export interface Reserve {
  asset: string;
  config: ReserveConfig;
  data: ReserveData;
  scalar: i128;
}


export interface Positions {
  collateral: Map<u32, i128>;
  liabilities: Map<u32, i128>;
  supply: Map<u32, i128>;
}


export interface ReserveData {
  b_rate: i128;
  b_supply: i128;
  backstop_credit: i128;
  d_rate: i128;
  d_supply: i128;
  ir_mod: i128;
  last_time: u64;
}


export interface ReserveConfig {
  c_factor: u32;
  decimals: u32;
  enabled: boolean;
  index: u32;
  l_factor: u32;
  max_util: u32;
  r_base: u32;
  r_one: u32;
  r_three: u32;
  r_two: u32;
  reactivity: u32;
  supply_cap: i128;
  util: u32;
}

export interface Client {
  /**
   * Construct and simulate a init transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * `owner == approver` is rejected here because, under approver-only rotation, this is the
   * only moment separation can ever be established. Allow it once and the owner is both
   * parties permanently and the entire security claim is void.
   */
  init: ({owner, approver, pool, usdc}: {owner: string, approver: string, pool: string, usdc: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a balance transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * The treasury's Blend position in underlying USDC.
   * 
   * Blend reports positions in bTokens, which appreciate against the underlying as `b_rate`
   * rises — that appreciation *is* the yield. Returning the raw position would understate the
   * treasury and make the `InsufficientFunds` pre-check compare bTokens against underlying.
   */
  balance: (options?: MethodOptions) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a deposit transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Anyone may deposit. Depositing buys no claim on the funds — there is no per-depositor
   * accounting, just one pooled position. Funds are supplied to Blend in the same
   * transaction; there is no idle buffer.
   */
  deposit: ({from, amount}: {from: string, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_owner transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_owner: (options?: MethodOptions) => Promise<AssembledTransaction<Result<string>>>

  /**
   * Construct and simulate a get_request transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_request: ({id}: {id: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Result<PayoutRequest>>>

  /**
   * Construct and simulate a get_approver transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_approver: (options?: MethodOptions) => Promise<AssembledTransaction<Result<string>>>

  /**
   * Construct and simulate a set_approver transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Approver only — the owner can never rotate the approver. This asymmetry is what makes
   * the gate real rather than decorative, and it is why a lost approver key is unrecoverable.
   */
  set_approver: ({new_approver}: {new_approver: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a reject_payout transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Approver only. The record is kept, never deleted — the request log is the audit trail.
   */
  reject_payout: ({id}: {id: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a approve_payout transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Approver only. Withdraws from Blend and pays the destination in one transaction.
   * 
   * Funds are checked here and nowhere else — a request is queued without regard to balance,
   * so several may be pending at once. If the treasury cannot cover this one the call reverts
   * and the request stays `Pending` for a retry after the next deposit.
   */
  approve_payout: ({id}: {id: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a request_payout transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Owner only. Moves no money — it queues an intent that only the approver can execute.
   */
  request_payout: ({destination, amount, memo}: {destination: string, amount: i128, memo: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<u32>>>

  /**
   * Construct and simulate a next_request_id transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  next_request_id: (options?: MethodOptions) => Promise<AssembledTransaction<u32>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy(null, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAACAAAAAAAAAASQWxyZWFkeUluaXRpYWxpemVkAAAAAAABAAAAAAAAAA5Ob3RJbml0aWFsaXplZAAAAAAAAgAAAAAAAAANTm90QXV0aG9yaXplZAAAAAAAAAMAAAAAAAAAD093bmVySXNBcHByb3ZlcgAAAAAEAAAAAAAAAA9SZXF1ZXN0Tm90Rm91bmQAAAAABQAAAAAAAAARUmVxdWVzdE5vdFBlbmRpbmcAAAAAAAAGAAAAAAAAABFJbnN1ZmZpY2llbnRGdW5kcwAAAAAAAAcAAAAAAAAADUludmFsaWRBbW91bnQAAAAAAAAI",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAABgAAAAAAAAAAAAAABU93bmVyAAAAAAAAAAAAAAAAAAAIQXBwcm92ZXIAAAAAAAAAAAAAAARQb29sAAAAAAAAAAAAAAAEVXNkYwAAAAAAAAAAAAAADU5leHRSZXF1ZXN0SWQAAAAAAAABAAAAAAAAAAdSZXF1ZXN0AAAAAAEAAAAE",
        "AAAAAQAAAAAAAAAAAAAADVBheW91dFJlcXVlc3QAAAAAAAAEAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAAC2Rlc3RpbmF0aW9uAAAAABMAAAAAAAAABG1lbW8AAAAQAAAAAAAAAAZzdGF0dXMAAAAAB9AAAAANUmVxdWVzdFN0YXR1cwAAAA==",
        "AAAAAgAAAAAAAAAAAAAADVJlcXVlc3RTdGF0dXMAAAAAAAADAAAAAAAAAAAAAAAHUGVuZGluZwAAAAAAAAAAAAAAAAhBcHByb3ZlZAAAAAAAAAAAAAAACFJlamVjdGVk",
        "AAAAAAAAAOZgb3duZXIgPT0gYXBwcm92ZXJgIGlzIHJlamVjdGVkIGhlcmUgYmVjYXVzZSwgdW5kZXIgYXBwcm92ZXItb25seSByb3RhdGlvbiwgdGhpcyBpcyB0aGUKb25seSBtb21lbnQgc2VwYXJhdGlvbiBjYW4gZXZlciBiZSBlc3RhYmxpc2hlZC4gQWxsb3cgaXQgb25jZSBhbmQgdGhlIG93bmVyIGlzIGJvdGgKcGFydGllcyBwZXJtYW5lbnRseSBhbmQgdGhlIGVudGlyZSBzZWN1cml0eSBjbGFpbSBpcyB2b2lkLgAAAAAABGluaXQAAAAEAAAAAAAAAAVvd25lcgAAAAAAABMAAAAAAAAACGFwcHJvdmVyAAAAEwAAAAAAAAAEcG9vbAAAABMAAAAAAAAABHVzZGMAAAATAAAAAQAAA+kAAAACAAAAAw==",
        "AAAAAAAAAT5UaGUgdHJlYXN1cnkncyBCbGVuZCBwb3NpdGlvbiBpbiB1bmRlcmx5aW5nIFVTREMuCgpCbGVuZCByZXBvcnRzIHBvc2l0aW9ucyBpbiBiVG9rZW5zLCB3aGljaCBhcHByZWNpYXRlIGFnYWluc3QgdGhlIHVuZGVybHlpbmcgYXMgYGJfcmF0ZWAKcmlzZXMg4oCUIHRoYXQgYXBwcmVjaWF0aW9uICppcyogdGhlIHlpZWxkLiBSZXR1cm5pbmcgdGhlIHJhdyBwb3NpdGlvbiB3b3VsZCB1bmRlcnN0YXRlIHRoZQp0cmVhc3VyeSBhbmQgbWFrZSB0aGUgYEluc3VmZmljaWVudEZ1bmRzYCBwcmUtY2hlY2sgY29tcGFyZSBiVG9rZW5zIGFnYWluc3QgdW5kZXJseWluZy4AAAAAAAdiYWxhbmNlAAAAAAAAAAABAAAACw==",
        "AAAAAAAAAMtBbnlvbmUgbWF5IGRlcG9zaXQuIERlcG9zaXRpbmcgYnV5cyBubyBjbGFpbSBvbiB0aGUgZnVuZHMg4oCUIHRoZXJlIGlzIG5vIHBlci1kZXBvc2l0b3IKYWNjb3VudGluZywganVzdCBvbmUgcG9vbGVkIHBvc2l0aW9uLiBGdW5kcyBhcmUgc3VwcGxpZWQgdG8gQmxlbmQgaW4gdGhlIHNhbWUKdHJhbnNhY3Rpb247IHRoZXJlIGlzIG5vIGlkbGUgYnVmZmVyLgAAAAAHZGVwb3NpdAAAAAACAAAAAAAAAARmcm9tAAAAEwAAAAAAAAAGYW1vdW50AAAAAAALAAAAAQAAA+kAAAACAAAAAw==",
        "AAAAAAAAAAAAAAAJZ2V0X293bmVyAAAAAAAAAAAAAAEAAAPpAAAAEwAAAAM=",
        "AAAAAAAAAAAAAAALZ2V0X3JlcXVlc3QAAAAAAQAAAAAAAAACaWQAAAAAAAQAAAABAAAD6QAAB9AAAAANUGF5b3V0UmVxdWVzdAAAAAAAAAM=",
        "AAAAAAAAAAAAAAAMZ2V0X2FwcHJvdmVyAAAAAAAAAAEAAAPpAAAAEwAAAAM=",
        "AAAAAAAAALFBcHByb3ZlciBvbmx5IOKAlCB0aGUgb3duZXIgY2FuIG5ldmVyIHJvdGF0ZSB0aGUgYXBwcm92ZXIuIFRoaXMgYXN5bW1ldHJ5IGlzIHdoYXQgbWFrZXMKdGhlIGdhdGUgcmVhbCByYXRoZXIgdGhhbiBkZWNvcmF0aXZlLCBhbmQgaXQgaXMgd2h5IGEgbG9zdCBhcHByb3ZlciBrZXkgaXMgdW5yZWNvdmVyYWJsZS4AAAAAAAAMc2V0X2FwcHJvdmVyAAAAAQAAAAAAAAAMbmV3X2FwcHJvdmVyAAAAEwAAAAEAAAPpAAAAAgAAAAM=",
        "AAAAAAAAAFhBcHByb3ZlciBvbmx5LiBUaGUgcmVjb3JkIGlzIGtlcHQsIG5ldmVyIGRlbGV0ZWQg4oCUIHRoZSByZXF1ZXN0IGxvZyBpcyB0aGUgYXVkaXQgdHJhaWwuAAAADXJlamVjdF9wYXlvdXQAAAAAAAABAAAAAAAAAAJpZAAAAAAABAAAAAEAAAPpAAAAAgAAAAM=",
        "AAAAAAAAAUpBcHByb3ZlciBvbmx5LiBXaXRoZHJhd3MgZnJvbSBCbGVuZCBhbmQgcGF5cyB0aGUgZGVzdGluYXRpb24gaW4gb25lIHRyYW5zYWN0aW9uLgoKRnVuZHMgYXJlIGNoZWNrZWQgaGVyZSBhbmQgbm93aGVyZSBlbHNlIOKAlCBhIHJlcXVlc3QgaXMgcXVldWVkIHdpdGhvdXQgcmVnYXJkIHRvIGJhbGFuY2UsCnNvIHNldmVyYWwgbWF5IGJlIHBlbmRpbmcgYXQgb25jZS4gSWYgdGhlIHRyZWFzdXJ5IGNhbm5vdCBjb3ZlciB0aGlzIG9uZSB0aGUgY2FsbCByZXZlcnRzCmFuZCB0aGUgcmVxdWVzdCBzdGF5cyBgUGVuZGluZ2AgZm9yIGEgcmV0cnkgYWZ0ZXIgdGhlIG5leHQgZGVwb3NpdC4AAAAAAA5hcHByb3ZlX3BheW91dAAAAAAAAQAAAAAAAAACaWQAAAAAAAQAAAABAAAD6QAAAAIAAAAD",
        "AAAAAAAAAFZPd25lciBvbmx5LiBNb3ZlcyBubyBtb25leSDigJQgaXQgcXVldWVzIGFuIGludGVudCB0aGF0IG9ubHkgdGhlIGFwcHJvdmVyIGNhbiBleGVjdXRlLgAAAAAADnJlcXVlc3RfcGF5b3V0AAAAAAADAAAAAAAAAAtkZXN0aW5hdGlvbgAAAAATAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAABG1lbW8AAAAQAAAAAQAAA+kAAAAEAAAAAw==",
        "AAAAAAAAAAAAAAAPbmV4dF9yZXF1ZXN0X2lkAAAAAAAAAAABAAAABA==",
        "AAAAAQAAAAAAAAAAAAAAB1JlcXVlc3QAAAAAAwAAAAAAAAAHYWRkcmVzcwAAAAATAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAADHJlcXVlc3RfdHlwZQAAAAQ=",
        "AAAAAQAAAAAAAAAAAAAAB1Jlc2VydmUAAAAABAAAAAAAAAAFYXNzZXQAAAAAAAATAAAAAAAAAAZjb25maWcAAAAAB9AAAAANUmVzZXJ2ZUNvbmZpZwAAAAAAAAAAAAAEZGF0YQAAB9AAAAALUmVzZXJ2ZURhdGEAAAAAAAAAAAZzY2FsYXIAAAAAAAs=",
        "AAAAAQAAAAAAAAAAAAAACVBvc2l0aW9ucwAAAAAAAAMAAAAAAAAACmNvbGxhdGVyYWwAAAAAA+wAAAAEAAAACwAAAAAAAAALbGlhYmlsaXRpZXMAAAAD7AAAAAQAAAALAAAAAAAAAAZzdXBwbHkAAAAAA+wAAAAEAAAACw==",
        "AAAAAQAAAAAAAAAAAAAAC1Jlc2VydmVEYXRhAAAAAAcAAAAAAAAABmJfcmF0ZQAAAAAACwAAAAAAAAAIYl9zdXBwbHkAAAALAAAAAAAAAA9iYWNrc3RvcF9jcmVkaXQAAAAACwAAAAAAAAAGZF9yYXRlAAAAAAALAAAAAAAAAAhkX3N1cHBseQAAAAsAAAAAAAAABmlyX21vZAAAAAAACwAAAAAAAAAJbGFzdF90aW1lAAAAAAAABg==",
        "AAAAAQAAAAAAAAAAAAAADVJlc2VydmVDb25maWcAAAAAAAANAAAAAAAAAAhjX2ZhY3RvcgAAAAQAAAAAAAAACGRlY2ltYWxzAAAABAAAAAAAAAAHZW5hYmxlZAAAAAABAAAAAAAAAAVpbmRleAAAAAAAAAQAAAAAAAAACGxfZmFjdG9yAAAABAAAAAAAAAAIbWF4X3V0aWwAAAAEAAAAAAAAAAZyX2Jhc2UAAAAAAAQAAAAAAAAABXJfb25lAAAAAAAABAAAAAAAAAAHcl90aHJlZQAAAAAEAAAAAAAAAAVyX3R3bwAAAAAAAAQAAAAAAAAACnJlYWN0aXZpdHkAAAAAAAQAAAAAAAAACnN1cHBseV9jYXAAAAAAAAsAAAAAAAAABHV0aWwAAAAE" ]),
      options
    )
  }
  public readonly fromJSON = {
    init: this.txFromJSON<Result<void>>,
        balance: this.txFromJSON<i128>,
        deposit: this.txFromJSON<Result<void>>,
        get_owner: this.txFromJSON<Result<string>>,
        get_request: this.txFromJSON<Result<PayoutRequest>>,
        get_approver: this.txFromJSON<Result<string>>,
        set_approver: this.txFromJSON<Result<void>>,
        reject_payout: this.txFromJSON<Result<void>>,
        approve_payout: this.txFromJSON<Result<void>>,
        request_payout: this.txFromJSON<Result<u32>>,
        next_request_id: this.txFromJSON<u32>
  }
}