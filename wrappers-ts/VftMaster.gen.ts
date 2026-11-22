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

type uint16 = bigint
type uint32 = bigint

/**
 > struct VftData {
 >     statement: string
 >     url: string?
 >     lang: uint16
 > }
 */
export interface VftData {
    readonly $: 'VftData'
    statement: string
    url: string | null
    lang: uint16
}

export const VftData = {
    create(args: {
        statement: string
        url: string | null
        lang: uint16
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
            lang: s.loadUintBig(16),
        }
    },
    store(self: VftData, b: c.Builder): void {
        b.storeStringRefTail(self.statement);
        storeTolkNullable<string>(self.url, b,
            (v,b) => b.storeStringRefTail(v)
        );
        b.storeUint(self.lang, 16);
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
        'Errors.InvalidLang': 114,
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
