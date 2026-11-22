// AUTO-GENERATED, do not edit
// It's a TypeScript wrapper for a VftMaster contract in Tolk.
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

type uint32 = bigint

/**
 > struct VftData {
 >     statement: string
 >     url: string?
 > }
 */
export interface VftData {
    readonly $: 'VftData'
    statement: string
    url: string | null
}

export const VftData = {
    create(args: {
        statement: string
        url: string | null
    }): VftData {
        return {
            $: 'VftData',
            ...args
        }
    },
    fromSlice(s: c.Slice): VftData {
        return {
            $: 'VftData',
            statement: s.loadStringRefTail(),
            url: s.loadBoolean() ? s.loadStringRefTail() : null,
        }
    },
    store(self: VftData, b: c.Builder): void {
        b.storeStringRefTail(self.statement);
        storeTolkNullable<string>(self.url, b,
            (v,b) => b.storeStringRefTail(v)
        );
    },
    toCell(self: VftData): c.Cell {
        return makeCellFrom<VftData>(self, VftData.store);
    }
}

/**
 > struct MasterStorage {
 >     owner: address
 >     statementsCount: uint32
 > }
 */
export interface MasterStorage {
    readonly $: 'MasterStorage'
    owner: c.Address
    statementsCount: uint32
}

export const MasterStorage = {
    create(args: {
        owner: c.Address
        statementsCount: uint32
    }): MasterStorage {
        return {
            $: 'MasterStorage',
            ...args
        }
    },
    fromSlice(s: c.Slice): MasterStorage {
        return {
            $: 'MasterStorage',
            owner: s.loadAddress(),
            statementsCount: s.loadUintBig(32),
        }
    },
    store(self: MasterStorage, b: c.Builder): void {
        b.storeAddress(self.owner);
        b.storeUint(self.statementsCount, 32);
    },
    toCell(self: MasterStorage): c.Cell {
        return makeCellFrom<MasterStorage>(self, MasterStorage.store);
    }
}

/**
 > struct (0x56f40001) NewParentStatement {
 >     data: VftData
 > }
 */
export interface NewParentStatement {
    readonly $: 'NewParentStatement'
    data: VftData
}

export const NewParentStatement = {
    PREFIX: 0x56f40001,

    create(args: {
        data: VftData
    }): NewParentStatement {
        return {
            $: 'NewParentStatement',
            ...args
        }
    },
    fromSlice(s: c.Slice): NewParentStatement {
        loadAndCheckPrefix32(s, 0x56f40001, 'NewParentStatement');
        return {
            $: 'NewParentStatement',
            data: VftData.fromSlice(s),
        }
    },
    store(self: NewParentStatement, b: c.Builder): void {
        b.storeUint(0x56f40001, 32);
        VftData.store(self.data, b);
    },
    toCell(self: NewParentStatement): c.Cell {
        return makeCellFrom<NewParentStatement>(self, NewParentStatement.store);
    }
}

/**
 > struct (0x56f40003) SetStatementData {
 >     owner: address
 >     data: VftData
 > }
 */
export interface SetStatementData {
    readonly $: 'SetStatementData'
    owner: c.Address
    data: VftData
}

export const SetStatementData = {
    PREFIX: 0x56f40003,

    create(args: {
        owner: c.Address
        data: VftData
    }): SetStatementData {
        return {
            $: 'SetStatementData',
            ...args
        }
    },
    fromSlice(s: c.Slice): SetStatementData {
        loadAndCheckPrefix32(s, 0x56f40003, 'SetStatementData');
        return {
            $: 'SetStatementData',
            owner: s.loadAddress(),
            data: VftData.fromSlice(s),
        }
    },
    store(self: SetStatementData, b: c.Builder): void {
        b.storeUint(0x56f40003, 32);
        b.storeAddress(self.owner);
        VftData.store(self.data, b);
    },
    toCell(self: SetStatementData): c.Cell {
        return makeCellFrom<SetStatementData>(self, SetStatementData.store);
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

// ————————————————————————————————————————————
//    class VftMaster
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

export class VftMaster implements c.Contract {
    static CodeCell = c.Cell.fromBase64('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');

    static Errors = {
        'Errors.NotOwner': 100,
        'Errors.NotEnoughValue': 105,
        'Errors.EmptyStatement': 106,
        'Errors.StatementTooLong': 107,
        'Errors.EmptyUrl': 108,
        'Errors.UrlTooLong': 109,
        'Errors.InsufficientBalance': 112,
        'Errors.InvalidMessage': 65535,
    }

    readonly address: c.Address
    readonly init: { code: c.Cell, data: c.Cell } | undefined

    protected constructor(address: c.Address, init?: { code: c.Cell, data: c.Cell }) {
        this.address = address;
        this.init = init;
    }

    static fromAddress(address: c.Address) {
        return new VftMaster(address);
    }

    static fromStorage(emptyStorage: {
        owner: c.Address
        statementsCount: uint32
    }, deployedOptions?: DeployedAddrOptions) {
        const initialState = {
            code: deployedOptions?.overrideContractCode ?? VftMaster.CodeCell,
            data: MasterStorage.toCell(MasterStorage.create(emptyStorage)),
        };
        const address = calculateDeployedAddress(initialState.code, initialState.data, deployedOptions ?? {});
        return new VftMaster(address, initialState);
    }

    static createCellOfNewParentStatement(body: {
        data: VftData
    }) {
        return NewParentStatement.toCell(NewParentStatement.create(body));
    }

    static createCellOfWithdraw(body: {
        amount: coins
    }) {
        return Withdraw.toCell(Withdraw.create(body));
    }

    async sendDeploy(provider: ContractProvider, via: Sender, msgValue: coins, extraOptions?: ExtraSendOptions) {
        return provider.internal(via, {
            value: msgValue,
            body: c.Cell.EMPTY,
            ...extraOptions
        });
    }

    async sendNewParentStatement(provider: ContractProvider, via: Sender, msgValue: coins, body: {
        data: VftData
    }, extraOptions?: ExtraSendOptions) {
        return provider.internal(via, {
            value: msgValue,
            body: NewParentStatement.toCell(NewParentStatement.create(body)),
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

    async getStatementsCount(provider: ContractProvider): Promise<bigint> {
        const r = StackReader.fromGetMethod(1, await provider.get('statementsCount', []));
        return r.readBigInt();
    }

    async getStatementAddress(provider: ContractProvider, idx: bigint): Promise<c.Address> {
        const r = StackReader.fromGetMethod(1, await provider.get('statementAddress', [
            { type: 'int', value: idx },
        ]));
        return r.readSlice().loadAddress();
    }

    async getOwner(provider: ContractProvider): Promise<c.Address> {
        const r = StackReader.fromGetMethod(1, await provider.get('owner', []));
        return r.readSlice().loadAddress();
    }
}
