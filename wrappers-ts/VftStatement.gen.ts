// AUTO-GENERATED, do not edit
// It's a TypeScript wrapper for a VftStatement contract in Tolk.
/* eslint-disable */

import * as c from '@ton/core';
import { beginCell, ContractProvider, Sender, SendMode } from '@ton/core';

// ————————————————————————————————————————————
//   predefined types and functions
//

type RemainingBitsAndRefs = c.Slice

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

function storeTolkRemaining(v: RemainingBitsAndRefs, b: c.Builder): void {
    b.storeSlice(v);
}

function loadTolkRemaining(s: c.Slice): RemainingBitsAndRefs {
    let rest = s.clone();
    s.loadBits(s.remainingBits);
    while (s.remainingRefs) {
        s.loadRef();
    }
    return rest;
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

    readSnakeString(): string {
        return this.readCell().beginParse().loadStringTail();
    }

    readNullable<T>(readFn_T: (r: StackReader) => T): T | null {
        if (this.tuple[0].type === 'null') {
            this.tuple.shift();
            return null;
        }
        return readFn_T(this);
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
 > struct StatementStorage {
 >     parent: address
 >     idx: uint32
 >     pro: bool
 >     owner: address?
 >     data: Cell<VftData>?
 >     proCount: uint32
 >     conCount: uint32
 > }
 */
export interface StatementStorage {
    readonly $: 'StatementStorage'
    parent: c.Address
    idx: uint32
    pro: boolean
    owner: c.Address | null
    data: CellRef<VftData> | null
    proCount: uint32
    conCount: uint32
}

export const StatementStorage = {
    create(args: {
        parent: c.Address
        idx: uint32
        pro: boolean
        owner: c.Address | null
        data: CellRef<VftData> | null
        proCount: uint32
        conCount: uint32
    }): StatementStorage {
        return {
            $: 'StatementStorage',
            ...args
        }
    },
    fromSlice(s: c.Slice): StatementStorage {
        return {
            $: 'StatementStorage',
            parent: s.loadAddress(),
            idx: s.loadUintBig(32),
            pro: s.loadBoolean(),
            owner: s.loadMaybeAddress(),
            data: s.loadBoolean() ? loadCellRef<VftData>(s, VftData.fromSlice) : null,
            proCount: s.loadUintBig(32),
            conCount: s.loadUintBig(32),
        }
    },
    store(self: StatementStorage, b: c.Builder): void {
        b.storeAddress(self.parent);
        b.storeUint(self.idx, 32);
        b.storeBit(self.pro);
        b.storeAddress(self.owner);
        storeTolkNullable<CellRef<VftData>>(self.data, b,
            (v,b) => storeCellRef<VftData>(v, b, VftData.store)
        );
        b.storeUint(self.proCount, 32);
        b.storeUint(self.conCount, 32);
    },
    toCell(self: StatementStorage): c.Cell {
        return makeCellFrom<StatementStorage>(self, StatementStorage.store);
    }
}

/**
 > struct (0x56f40002) NewChildStatement {
 >     data: VftData
 >     pro: bool
 > }
 */
export interface NewChildStatement {
    readonly $: 'NewChildStatement'
    data: VftData
    pro: boolean
}

export const NewChildStatement = {
    PREFIX: 0x56f40002,

    create(args: {
        data: VftData
        pro: boolean
    }): NewChildStatement {
        return {
            $: 'NewChildStatement',
            ...args
        }
    },
    fromSlice(s: c.Slice): NewChildStatement {
        loadAndCheckPrefix32(s, 0x56f40002, 'NewChildStatement');
        return {
            $: 'NewChildStatement',
            data: VftData.fromSlice(s),
            pro: s.loadBoolean(),
        }
    },
    store(self: NewChildStatement, b: c.Builder): void {
        b.storeUint(0x56f40002, 32);
        VftData.store(self.data, b);
        b.storeBit(self.pro);
    },
    toCell(self: NewChildStatement): c.Cell {
        return makeCellFrom<NewChildStatement>(self, NewChildStatement.store);
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
 > struct (0x56f40004) ChildCreated {
 >     idx: uint32
 > }
 */
export interface ChildCreated {
    readonly $: 'ChildCreated'
    idx: uint32
}

export const ChildCreated = {
    PREFIX: 0x56f40004,

    create(args: {
        idx: uint32
    }): ChildCreated {
        return {
            $: 'ChildCreated',
            ...args
        }
    },
    fromSlice(s: c.Slice): ChildCreated {
        loadAndCheckPrefix32(s, 0x56f40004, 'ChildCreated');
        return {
            $: 'ChildCreated',
            idx: s.loadUintBig(32),
        }
    },
    store(self: ChildCreated, b: c.Builder): void {
        b.storeUint(0x56f40004, 32);
        b.storeUint(self.idx, 32);
    },
    toCell(self: ChildCreated): c.Cell {
        return makeCellFrom<ChildCreated>(self, ChildCreated.store);
    }
}

/**
 > struct (0x56f40005) Vote {
 >     amount: coins
 > }
 */
export interface Vote {
    readonly $: 'Vote'
    amount: coins
}

export const Vote = {
    PREFIX: 0x56f40005,

    create(args: {
        amount: coins
    }): Vote {
        return {
            $: 'Vote',
            ...args
        }
    },
    fromSlice(s: c.Slice): Vote {
        loadAndCheckPrefix32(s, 0x56f40005, 'Vote');
        return {
            $: 'Vote',
            amount: s.loadCoins(),
        }
    },
    store(self: Vote, b: c.Builder): void {
        b.storeUint(0x56f40005, 32);
        b.storeCoins(self.amount);
    },
    toCell(self: Vote): c.Cell {
        return makeCellFrom<Vote>(self, Vote.store);
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
 > struct (0x56f40009) DeleteStatement {
 > }
 */
export interface DeleteStatement {
    readonly $: 'DeleteStatement'
}

export const DeleteStatement = {
    PREFIX: 0x56f40009,

    create(): DeleteStatement {
        return {
            $: 'DeleteStatement',
        }
    },
    fromSlice(s: c.Slice): DeleteStatement {
        loadAndCheckPrefix32(s, 0x56f40009, 'DeleteStatement');
        return {
            $: 'DeleteStatement',
        }
    },
    store(self: DeleteStatement, b: c.Builder): void {
        b.storeUint(0x56f40009, 32);
    },
    toCell(self: DeleteStatement): c.Cell {
        return makeCellFrom<DeleteStatement>(self, DeleteStatement.store);
    }
}

/**
 > struct (0x00000000) TextComment {
 >     text: RemainingBitsAndRefs
 > }
 */
export interface TextComment {
    readonly $: 'TextComment'
    text: RemainingBitsAndRefs
}

export const TextComment = {
    PREFIX: 0x00000000,

    create(args: {
        text: RemainingBitsAndRefs
    }): TextComment {
        return {
            $: 'TextComment',
            ...args
        }
    },
    fromSlice(s: c.Slice): TextComment {
        loadAndCheckPrefix32(s, 0x00000000, 'TextComment');
        return {
            $: 'TextComment',
            text: loadTolkRemaining(s),
        }
    },
    store(self: TextComment, b: c.Builder): void {
        b.storeUint(0x00000000, 32);
        storeTolkRemaining(self.text, b);
    },
    toCell(self: TextComment): c.Cell {
        return makeCellFrom<TextComment>(self, TextComment.store);
    }
}

/**
 > struct StatementInfo {
 >     parent: address
 >     idx: uint32
 >     pro: bool
 >     owner: address?
 >     statement: string?
 >     url: string?
 >     proCount: uint32
 >     conCount: uint32
 > }
 */
export interface StatementInfo {
    readonly $: 'StatementInfo'
    parent: c.Address
    idx: uint32
    pro: boolean
    owner: c.Address | null
    statement: string | null
    url: string | null
    proCount: uint32
    conCount: uint32
}

export const StatementInfo = {
    create(args: {
        parent: c.Address
        idx: uint32
        pro: boolean
        owner: c.Address | null
        statement: string | null
        url: string | null
        proCount: uint32
        conCount: uint32
    }): StatementInfo {
        return {
            $: 'StatementInfo',
            ...args
        }
    },
    fromSlice(s: c.Slice): StatementInfo {
        return {
            $: 'StatementInfo',
            parent: s.loadAddress(),
            idx: s.loadUintBig(32),
            pro: s.loadBoolean(),
            owner: s.loadMaybeAddress(),
            statement: s.loadBoolean() ? s.loadStringRefTail() : null,
            url: s.loadBoolean() ? s.loadStringRefTail() : null,
            proCount: s.loadUintBig(32),
            conCount: s.loadUintBig(32),
        }
    },
    store(self: StatementInfo, b: c.Builder): void {
        b.storeAddress(self.parent);
        b.storeUint(self.idx, 32);
        b.storeBit(self.pro);
        b.storeAddress(self.owner);
        storeTolkNullable<string>(self.statement, b,
            (v,b) => b.storeStringRefTail(v)
        );
        storeTolkNullable<string>(self.url, b,
            (v,b) => b.storeStringRefTail(v)
        );
        b.storeUint(self.proCount, 32);
        b.storeUint(self.conCount, 32);
    },
    toCell(self: StatementInfo): c.Cell {
        return makeCellFrom<StatementInfo>(self, StatementInfo.store);
    }
}

// ————————————————————————————————————————————
//    class VftStatement
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

export class VftStatement implements c.Contract {
    static CodeCell = c.Cell.fromBase64('te6ccgECGwEABMoAART/APSkE/S88sgLAQIBYgIDAfjQ+JGRMODXLCK3oAAcjm3tRND6SNMf1gD6UPQEMfiSJccF8uBlAW7y4GcE+kjU0wABktdMkjBt4iICyMwhbpMxz4GTz4PM4skFyPpSJM8LHxPOEvpUE/QAE87J7VSCCvrwgHL7AsjPhQj6UoIQVvQABM8LjssfyYEAgvsABAIBIAsMBKLg1ywit6AAFI827UTQ+kjWIPpQ9ATTH9cLHyNu8tBoBtTTAAGR1JJtAeLXCgDjDwTI+lITzvpU9ADLH8sfye1U4NcsIregACzjAtcsIAAAAAQFBgcIAf74KviS+JeCEAX14QC+8uBpeCTQAflDMDGrAiDCAPLgaoEB9Lvy4Gsibo4WdCPQAflDMDGrAiDCAPLgbIMHu/Lgbd/4KG1tJwPI+lITyx/Pg/pU9ABwzws/ycjPkVvQAA4S+lIUzCJulGwSz4GUz4MSzOLJyM+JiAFdyM+E0MzMCQH++Cr4kviXghAF9eEAvvLgaXgk0AH5QzAxqwIgwgDy4GqBAfS78uBrIm6OFnQj0AH5QzAxqwIgwgDy4GyDB7vy4G3f+ChtbSwDyPpSE8sfz4H6VPQAcM8LP8nIz5Fb0AAOEvpSFMwibpRsEs+BlM+DEsziycjPiYgBXcjPhNDMzAoBvO1E0PpIMdMgMfpQMG7y0Gj6ADAgwgDy4G74lyGCCvrwgKC+8uBpiPgo+JIByPpS+lLPhCDJyM+JiAFTEsjPhNDMzPkWzwv/gQCMzwt0EszMz5Fb0AAaAfoCyYBA+wARAO6OL4QPAYtmRvbmF0ZYxwXy9O1E0PpIMdMgMfpQMCBu8tBoyM+FCPpScM8LbsmAQPsA4NcsIregAEwxjjbtRND6SDHTIDH6UPQB0x/XCx8ibvLQaPiSI8cF8uBkAfLQcfLQccjPhQj6UnDPC27JgQCg+wDghA/y8AAs+RbPC/+BAI3PC3QSzBLMzMmAQPsApAAw+RbPC/+BAI3PC3QSzBLMzMmAQPsABaQFAgFIDQ4BQ74rJEfBRkfSkJfSlnwhBkgORnwmhmZnyLZGfFACBl/+eoQRAgFqDxAAXbdmPwVfBQ2toFkfSkK5Y+J5QAJ/Sp6ADhnhZ/kgORnwmhmZnyLZGfFACBl/+eoQAC6oM+1E0PpIMdMgMfpQMfQB0x/XCx/jBABwqgrtRNBtbQL6SNMf0gD6UPQE0x/XCx8ibpEyjhA3N9DU0wABkdSSbQHi0VBn4hBXEEYQNRAkQwABFP8A9KQT9LzyyAsSAgFiExQCzND4kZEw4NcsIregADSOP+1E0PpI+kj6ADD4kiPHBfLgZgP6ADAToAHI+lJSIPpSIfoCye1UggiYloCgcvsCyM+FCPpScM8LbsmBAIL7AODXLCK3oAA84wLXLCK3oABEMeMChA/y8BUWAgEgFxgAiu1E0PpI+kj6ADD4kiLHBfLgZAP6ADAgwgDy4G5TA7vy4G9RM6ECyPpSUhD6Ulj6AsntVMjPhQj6UgH6AnDPC2rJgED7AABC7UTQ+kgx+kgw+JIhxwXy4GTIz4UI+lJwzwtuyYEAoPsAAgJ0GRoAHbxXZ2omh9JBj9JBj9ABhAAXro72omh9JBj9JBhAABGu5XaiaH0kGEA=');

    static Errors = {
        'Errors.NotOwner': 100,
        'Errors.NotParent': 101,
        'Errors.AlreadyInitialized': 103,
        'Errors.NotInitialized': 104,
        'Errors.NotEnoughValue': 105,
        'Errors.EmptyStatement': 106,
        'Errors.StatementTooLong': 107,
        'Errors.EmptyUrl': 108,
        'Errors.UrlTooLong': 109,
        'Errors.ZeroAmount': 110,
        'Errors.HasArguments': 113,
        'Errors.InvalidMessage': 65535,
    }

    readonly address: c.Address
    readonly init: { code: c.Cell, data: c.Cell } | undefined

    protected constructor(address: c.Address, init?: { code: c.Cell, data: c.Cell }) {
        this.address = address;
        this.init = init;
    }

    static fromAddress(address: c.Address) {
        return new VftStatement(address);
    }

    static fromStorage(emptyStorage: {
        parent: c.Address
        idx: uint32
        pro: boolean
        owner: c.Address | null
        data: CellRef<VftData> | null
        proCount: uint32
        conCount: uint32
    }, deployedOptions?: DeployedAddrOptions) {
        const initialState = {
            code: deployedOptions?.overrideContractCode ?? VftStatement.CodeCell,
            data: StatementStorage.toCell(StatementStorage.create(emptyStorage)),
        };
        const address = calculateDeployedAddress(initialState.code, initialState.data, deployedOptions ?? {});
        return new VftStatement(address, initialState);
    }

    static createCellOfSetStatementData(body: {
        owner: c.Address
        data: VftData
    }) {
        return SetStatementData.toCell(SetStatementData.create(body));
    }

    static createCellOfNewChildStatement(body: {
        data: VftData
        pro: boolean
    }) {
        return NewChildStatement.toCell(NewChildStatement.create(body));
    }

    static createCellOfVote(body: {
        amount: coins
    }) {
        return Vote.toCell(Vote.create(body));
    }

    static createCellOfTextComment(body: {
        text: RemainingBitsAndRefs
    }) {
        return TextComment.toCell(TextComment.create(body));
    }

    static createCellOfDeleteStatement(body: {
    }) {
        return DeleteStatement.toCell(DeleteStatement.create());
    }

    async sendDeploy(provider: ContractProvider, via: Sender, msgValue: coins, extraOptions?: ExtraSendOptions) {
        return provider.internal(via, {
            value: msgValue,
            body: c.Cell.EMPTY,
            ...extraOptions
        });
    }

    async sendSetStatementData(provider: ContractProvider, via: Sender, msgValue: coins, body: {
        owner: c.Address
        data: VftData
    }, extraOptions?: ExtraSendOptions) {
        return provider.internal(via, {
            value: msgValue,
            body: SetStatementData.toCell(SetStatementData.create(body)),
            ...extraOptions
        });
    }

    async sendNewChildStatement(provider: ContractProvider, via: Sender, msgValue: coins, body: {
        data: VftData
        pro: boolean
    }, extraOptions?: ExtraSendOptions) {
        return provider.internal(via, {
            value: msgValue,
            body: NewChildStatement.toCell(NewChildStatement.create(body)),
            ...extraOptions
        });
    }

    async sendVote(provider: ContractProvider, via: Sender, msgValue: coins, body: {
        amount: coins
    }, extraOptions?: ExtraSendOptions) {
        return provider.internal(via, {
            value: msgValue,
            body: Vote.toCell(Vote.create(body)),
            ...extraOptions
        });
    }

    async sendTextComment(provider: ContractProvider, via: Sender, msgValue: coins, body: {
        text: RemainingBitsAndRefs
    }, extraOptions?: ExtraSendOptions) {
        return provider.internal(via, {
            value: msgValue,
            body: TextComment.toCell(TextComment.create(body)),
            ...extraOptions
        });
    }

    async sendDeleteStatement(provider: ContractProvider, via: Sender, msgValue: coins, body: {
    }, extraOptions?: ExtraSendOptions) {
        return provider.internal(via, {
            value: msgValue,
            body: DeleteStatement.toCell(DeleteStatement.create()),
            ...extraOptions
        });
    }

    async getInfo(provider: ContractProvider): Promise<StatementInfo> {
        const r = StackReader.fromGetMethod(8, await provider.get('info', []));
        return ({
            $: 'StatementInfo',
            parent: r.readSlice().loadAddress(),
            idx: r.readBigInt(),
            pro: r.readBoolean(),
            owner: r.readNullable<c.Address>(
                (r) => r.readSlice().loadAddress()
            ),
            statement: r.readNullable<string>(
                (r) => r.readSnakeString()
            ),
            url: r.readNullable<string>(
                (r) => r.readSnakeString()
            ),
            proCount: r.readBigInt(),
            conCount: r.readBigInt(),
        });
    }

    async getChildCount(provider: ContractProvider, pro: boolean): Promise<bigint> {
        const r = StackReader.fromGetMethod(1, await provider.get('childCount', [
            { type: 'int', value: (pro ? -1n : 0n) },
        ]));
        return r.readBigInt();
    }

    async getChildAddress(provider: ContractProvider, idx: bigint, pro: boolean): Promise<c.Address> {
        const r = StackReader.fromGetMethod(1, await provider.get('childAddress', [
            { type: 'int', value: idx },
            { type: 'int', value: (pro ? -1n : 0n) },
        ]));
        return r.readSlice().loadAddress();
    }

    async getVoteAddress(provider: ContractProvider, owner: c.Address): Promise<c.Address> {
        const r = StackReader.fromGetMethod(1, await provider.get('voteAddress', [
            { type: 'slice', cell: makeCellFrom<c.Address>(owner,
                (v,b) => b.storeAddress(v)
            ) },
        ]));
        return r.readSlice().loadAddress();
    }
}
