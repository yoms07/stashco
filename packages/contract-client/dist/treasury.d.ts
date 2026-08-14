import { Buffer } from "buffer";
import { AssembledTransaction, Client as ContractClient, ClientOptions as ContractClientOptions, MethodOptions, Result } from "@stellar/stellar-sdk/contract";
import type { u32, u64, i128 } from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";
export declare const Errors: {
    1: {
        message: string;
    };
    2: {
        message: string;
    };
    3: {
        message: string;
    };
    4: {
        message: string;
    };
    5: {
        message: string;
    };
    6: {
        message: string;
    };
    7: {
        message: string;
    };
    8: {
        message: string;
    };
};
export type DataKey = {
    tag: "Owner";
    values: void;
} | {
    tag: "Approver";
    values: void;
} | {
    tag: "Pool";
    values: void;
} | {
    tag: "Usdc";
    values: void;
} | {
    tag: "NextRequestId";
    values: void;
} | {
    tag: "Request";
    values: readonly [u32];
};
export interface PayoutRequest {
    amount: i128;
    destination: string;
    memo: string;
    status: RequestStatus;
}
export type RequestStatus = {
    tag: "Pending";
    values: void;
} | {
    tag: "Approved";
    values: void;
} | {
    tag: "Rejected";
    values: void;
};
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
    init: ({ owner, approver, pool, usdc }: {
        owner: string;
        approver: string;
        pool: string;
        usdc: string;
    }, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>;
    /**
     * Construct and simulate a balance transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     * The treasury's Blend position in underlying USDC.
     *
     * Blend reports positions in bTokens, which appreciate against the underlying as `b_rate`
     * rises — that appreciation *is* the yield. Returning the raw position would understate the
     * treasury and make the `InsufficientFunds` pre-check compare bTokens against underlying.
     */
    balance: (options?: MethodOptions) => Promise<AssembledTransaction<i128>>;
    /**
     * Construct and simulate a deposit transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     * Anyone may deposit. Depositing buys no claim on the funds — there is no per-depositor
     * accounting, just one pooled position. Funds are supplied to Blend in the same
     * transaction; there is no idle buffer.
     */
    deposit: ({ from, amount }: {
        from: string;
        amount: i128;
    }, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>;
    /**
     * Construct and simulate a get_owner transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    get_owner: (options?: MethodOptions) => Promise<AssembledTransaction<Result<string>>>;
    /**
     * Construct and simulate a get_request transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    get_request: ({ id }: {
        id: u32;
    }, options?: MethodOptions) => Promise<AssembledTransaction<Result<PayoutRequest>>>;
    /**
     * Construct and simulate a get_approver transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    get_approver: (options?: MethodOptions) => Promise<AssembledTransaction<Result<string>>>;
    /**
     * Construct and simulate a set_approver transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     * Approver only — the owner can never rotate the approver. This asymmetry is what makes
     * the gate real rather than decorative, and it is why a lost approver key is unrecoverable.
     */
    set_approver: ({ new_approver }: {
        new_approver: string;
    }, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>;
    /**
     * Construct and simulate a reject_payout transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     * Approver only. The record is kept, never deleted — the request log is the audit trail.
     */
    reject_payout: ({ id }: {
        id: u32;
    }, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>;
    /**
     * Construct and simulate a approve_payout transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     * Approver only. Withdraws from Blend and pays the destination in one transaction.
     *
     * Funds are checked here and nowhere else — a request is queued without regard to balance,
     * so several may be pending at once. If the treasury cannot cover this one the call reverts
     * and the request stays `Pending` for a retry after the next deposit.
     */
    approve_payout: ({ id }: {
        id: u32;
    }, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>;
    /**
     * Construct and simulate a request_payout transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     * Owner only. Moves no money — it queues an intent that only the approver can execute.
     */
    request_payout: ({ destination, amount, memo }: {
        destination: string;
        amount: i128;
        memo: string;
    }, options?: MethodOptions) => Promise<AssembledTransaction<Result<u32>>>;
    /**
     * Construct and simulate a next_request_id transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    next_request_id: (options?: MethodOptions) => Promise<AssembledTransaction<u32>>;
}
export declare class Client extends ContractClient {
    readonly options: ContractClientOptions;
    static deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions & Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
    }): Promise<AssembledTransaction<T>>;
    constructor(options: ContractClientOptions);
    readonly fromJSON: {
        init: (json: string) => AssembledTransaction<Result<void, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
        balance: (json: string) => AssembledTransaction<bigint>;
        deposit: (json: string) => AssembledTransaction<Result<void, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
        get_owner: (json: string) => AssembledTransaction<Result<string, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
        get_request: (json: string) => AssembledTransaction<Result<PayoutRequest, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
        get_approver: (json: string) => AssembledTransaction<Result<string, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
        set_approver: (json: string) => AssembledTransaction<Result<void, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
        reject_payout: (json: string) => AssembledTransaction<Result<void, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
        approve_payout: (json: string) => AssembledTransaction<Result<void, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
        request_payout: (json: string) => AssembledTransaction<Result<number, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
        next_request_id: (json: string) => AssembledTransaction<number>;
    };
}
