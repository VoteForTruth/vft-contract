// AUTO-GENERATED, do not edit
// It's a TypeScript wrapper for a VftVote contract in Tolk.
/* eslint-disable */

import * as c from '@ton/core';
import { beginCell, ContractProvider, Sender, SendMode } from '@ton/core';

// ————————————————————————————————————————————
//   predefined types and functions
//

type StoreCallback<T> = (obj: T, b: c.Builder) => void
type LoadCallback<T> = (s: c.Slice) => T

export type CellRef<T> = {
    ref: T
}

function makeCellFrom<T>(self: T, storeFn_T: StoreCallback<T>): c.Cell {
    let b = beginCell();
    storeFn_T(self, b);
    return b.endCell();
}

function loadAndCheckPrefix32(s: c.Slice, expected: number, structName: string): void {
    let prefix = s.loadUint(32);
    if (prefix !== expected) {
        throw new Error(`Incorrect prefix for '${structName}': expected 0x${expected.toString(16).padStart(8, '0')}, got 0x${prefix.toString(16).padStart(8, '0')}`);
    }
}

function lookupPrefix(s: c.Slice, expected: number, prefixLen: number): boolean {
    return s.remainingBits >= prefixLen && s.preloadUint(prefixLen) === expected;
}

function throwNonePrefixMatch(fieldPath: string): never {
    throw new Error(`Incorrect prefix for '${fieldPath}': none of variants matched`);
}

function storeCellRef<T>(cell: CellRef<T>, b: c.Builder, storeFn_T: StoreCallback<T>): void {
    let b_ref = c.beginCell();
    storeFn_T(cell.ref, b_ref);
    b.storeRef(b_ref.endCell());
}

function loadCellRef<T>(s: c.Slice, loadFn_T: LoadCallback<T>): CellRef<T> {
    let s_ref = s.loadRef().beginParse();
    return { ref: loadFn_T(s_ref) };
}

function storeTolkNullable<T>(v: T | null, b: c.Builder, storeFn_T: StoreCallback<T>): void {
    if (v === null) {
        b.storeUint(0, 1);
    } else {
        b.storeUint(1, 1);
        storeFn_T(v, b);
    }
}

// ————————————————————————————————————————————
//   parse get methods result from a TVM stack
//

class StackReader {
    constructor(private tuple: c.TupleItem[]) {
    }

    static fromGetMethod(expectedN: number, getMethodResult: { stack: c.TupleReader }): StackReader {
        let tuple = [] as c.TupleItem[];
        while (getMethodResult.stack.remaining) {
            tuple.push(getMethodResult.stack.pop());
        }
        if (tuple.length !== expectedN) {
            throw new Error(`expected ${expectedN} stack width, got ${tuple.length}`);
        }
        return new StackReader(tuple);
    }

    private popExpecting<ItemT>(itemType: string): ItemT {
        const item = this.tuple.shift();
        if (item?.type === itemType) {
            return item as ItemT;
        }
        throw new Error(`not '${itemType}' on a stack`);
    }

    private popCellLike(): c.Cell {
        const item = this.tuple.shift();
        if (item && (item.type === 'cell' || item.type === 'slice' || item.type === 'builder')) {
            return item.cell;
        }
        throw new Error(`not cell/slice on a stack`);
    }

    readBigInt(): bigint {
        return this.popExpecting<c.TupleItemInt>('int').value;
    }

    readBoolean(): boolean {
        return this.popExpecting<c.TupleItemInt>('int').value !== 0n;
    }

    readCell(): c.Cell {
        return this.popCellLike();
    }

    readSlice(): c.Slice {
        return this.popCellLike().beginParse();
    }
}

// ————————————————————————————————————————————
//   auto-generated serializers to/from cells
//

type coins = bigint

/**
 > struct VoteStorage {
 >     statement: address
 >     owner: address
 >     amount: coins
 > }
 */
export interface VoteStorage {
    readonly $: 'VoteStorage'
    statement: c.Address
    owner: c.Address
    amount: coins
}

export const VoteStorage = {
    create(args: {
        statement: c.Address
        owner: c.Address
        amount: coins
    }): VoteStorage {
        return {
            $: 'VoteStorage',
            ...args
        }
    },
    fromSlice(s: c.Slice): VoteStorage {
        return {
            $: 'VoteStorage',
            statement: s.loadAddress(),
            owner: s.loadAddress(),
            amount: s.loadCoins(),
        }
    },
    store(self: VoteStorage, b: c.Builder): void {
        b.storeAddress(self.statement);
        b.storeAddress(self.owner);
        b.storeCoins(self.amount);
    },
    toCell(self: VoteStorage): c.Cell {
        return makeCellFrom<VoteStorage>(self, VoteStorage.store);
    }
}

/**
 > struct (0x56f40006) AddVote {
 >     amount: coins
 > }
 */
export interface AddVote {
    readonly $: 'AddVote'
    amount: coins
}

export const AddVote = {
    PREFIX: 0x56f40006,

    create(args: {
        amount: coins
    }): AddVote {
        return {
            $: 'AddVote',
            ...args
        }
    },
    fromSlice(s: c.Slice): AddVote {
        loadAndCheckPrefix32(s, 0x56f40006, 'AddVote');
        return {
            $: 'AddVote',
            amount: s.loadCoins(),
        }
    },
    store(self: AddVote, b: c.Builder): void {
        b.storeUint(0x56f40006, 32);
        b.storeCoins(self.amount);
    },
    toCell(self: AddVote): c.Cell {
        return makeCellFrom<AddVote>(self, AddVote.store);
    }
}

/**
 > struct (0x56f40007) Withdraw {
 >     amount: coins
 > }
 */
export interface Withdraw {
    readonly $: 'Withdraw'
    amount: coins
}

export const Withdraw = {
    PREFIX: 0x56f40007,

    create(args: {
        amount: coins
    }): Withdraw {
        return {
            $: 'Withdraw',
            ...args
        }
    },
    fromSlice(s: c.Slice): Withdraw {
        loadAndCheckPrefix32(s, 0x56f40007, 'Withdraw');
        return {
            $: 'Withdraw',
            amount: s.loadCoins(),
        }
    },
    store(self: Withdraw, b: c.Builder): void {
        b.storeUint(0x56f40007, 32);
        b.storeCoins(self.amount);
    },
    toCell(self: Withdraw): c.Cell {
        return makeCellFrom<Withdraw>(self, Withdraw.store);
    }
}

/**
 > struct (0x56f40008) WithdrawAll {
 > }
 */
export interface WithdrawAll {
    readonly $: 'WithdrawAll'
}

export const WithdrawAll = {
    PREFIX: 0x56f40008,

    create(): WithdrawAll {
        return {
            $: 'WithdrawAll',
        }
    },
    fromSlice(s: c.Slice): WithdrawAll {
        loadAndCheckPrefix32(s, 0x56f40008, 'WithdrawAll');
        return {
            $: 'WithdrawAll',
        }
    },
    store(self: WithdrawAll, b: c.Builder): void {
        b.storeUint(0x56f40008, 32);
    },
    toCell(self: WithdrawAll): c.Cell {
        return makeCellFrom<WithdrawAll>(self, WithdrawAll.store);
    }
}

// ————————————————————————————————————————————
//    class VftVote
//

interface ExtraSendOptions {
    bounce?: boolean                    // default: false
    sendMode?: SendMode                 // default: SendMode.PAY_GAS_SEPARATELY
    extraCurrencies?: c.ExtraCurrency   // default: empty dict
}

interface DeployedAddrOptions {
    workchain?: number                  // default: 0 (basechain)
    toShard?: { fixedPrefixLength: number; closeTo: c.Address }
    overrideContractCode?: c.Cell
}

function calculateDeployedAddress(code: c.Cell, data: c.Cell, options: DeployedAddrOptions): c.Address {
    const stateInitCell = beginCell().store(c.storeStateInit({
        code,
        data,
        splitDepth: options.toShard?.fixedPrefixLength,
        special: null,
        libraries: null,
    })).endCell();

    let addrHash = stateInitCell.hash();
    if (options.toShard) {
        const shardDepth = options.toShard.fixedPrefixLength;
        addrHash = beginCell()
            .storeBits(new c.BitString(options.toShard.closeTo.hash, 0, shardDepth))
            .storeBits(new c.BitString(stateInitCell.hash(), shardDepth, 256 - shardDepth))
            .endCell()
            .beginParse().loadBuffer(32);
    }

    return new c.Address(options.workchain ?? 0, addrHash);
}

export class VftVote implements c.Contract {
    static CodeCell = c.Cell.fromBase64('te6ccgECCgEAARoAART/APSkE/S88sgLAQIBYgIDAszQ+JGRMODXLCK3oAA0jj/tRND6SPpI+gAw+JIjxwXy4GYD+gAwE6AByPpSUiD6UiH6AsntVIIImJaAoHL7AsjPhQj6UnDPC27JgQCC+wDg1ywit6AAPOMC1ywit6AARDHjAoQP8vAEBQIBIAYHAIrtRND6SPpI+gAw+JIixwXy4GQD+gAwIMIA8uBuUwO78uBvUTOhAsj6UlIQ+lJY+gLJ7VTIz4UI+lIB+gJwzwtqyYBA+wAAQu1E0PpIMfpIMPiSIccF8uBkyM+FCPpScM8LbsmBAKD7AAICdAgJAB28V2dqJofSQY/SQY/QAYQAF66O9qJofSQY/SQYQAARruV2omh9JBhA');

    static Errors = {
        'Errors.NotOwner': 100,
        'Errors.NotStatement': 102,
        'Errors.ZeroAmount': 110,
        'Errors.AmountExceedsVote': 111,
        'Errors.InvalidMessage': 65535,
    }

    readonly address: c.Address
    readonly init: { code: c.Cell, data: c.Cell } | undefined

    protected constructor(address: c.Address, init?: { code: c.Cell, data: c.Cell }) {
        this.address = address;
        this.init = init;
    }

    static fromAddress(address: c.Address) {
        return new VftVote(address);
    }

    static fromStorage(emptyStorage: {
        statement: c.Address
        owner: c.Address
        amount: coins
    }, deployedOptions?: DeployedAddrOptions) {
        const initialState = {
            code: deployedOptions?.overrideContractCode ?? VftVote.CodeCell,
            data: VoteStorage.toCell(VoteStorage.create(emptyStorage)),
        };
        const address = calculateDeployedAddress(initialState.code, initialState.data, deployedOptions ?? {});
        return new VftVote(address, initialState);
    }

    static createCellOfAddVote(body: {
        amount: coins
    }) {
        return AddVote.toCell(AddVote.create(body));
    }

    static createCellOfWithdraw(body: {
        amount: coins
    }) {
        return Withdraw.toCell(Withdraw.create(body));
    }

    static createCellOfWithdrawAll(body: {
    }) {
        return WithdrawAll.toCell(WithdrawAll.create());
    }

    async sendDeploy(provider: ContractProvider, via: Sender, msgValue: coins, extraOptions?: ExtraSendOptions) {
        return provider.internal(via, {
            value: msgValue,
            body: c.Cell.EMPTY,
            ...extraOptions
        });
    }

    async sendAddVote(provider: ContractProvider, via: Sender, msgValue: coins, body: {
        amount: coins
    }, extraOptions?: ExtraSendOptions) {
        return provider.internal(via, {
            value: msgValue,
            body: AddVote.toCell(AddVote.create(body)),
            ...extraOptions
        });
    }

    async sendWithdraw(provider: ContractProvider, via: Sender, msgValue: coins, body: {
        amount: coins
    }, extraOptions?: ExtraSendOptions) {
        return provider.internal(via, {
            value: msgValue,
            body: Withdraw.toCell(Withdraw.create(body)),
            ...extraOptions
        });
    }

    async sendWithdrawAll(provider: ContractProvider, via: Sender, msgValue: coins, body: {
    }, extraOptions?: ExtraSendOptions) {
        return provider.internal(via, {
            value: msgValue,
            body: WithdrawAll.toCell(WithdrawAll.create()),
            ...extraOptions
        });
    }

    async getAmount(provider: ContractProvider): Promise<bigint> {
        const r = StackReader.fromGetMethod(1, await provider.get('amount', []));
        return r.readBigInt();
    }

    async getOwner(provider: ContractProvider): Promise<c.Address> {
        const r = StackReader.fromGetMethod(1, await provider.get('owner', []));
        return r.readSlice().loadAddress();
    }

    async getStatement(provider: ContractProvider): Promise<c.Address> {
        const r = StackReader.fromGetMethod(1, await provider.get('statement', []));
        return r.readSlice().loadAddress();
    }
}
