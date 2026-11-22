// Shared types, messages, constants and helpers of Vote For Truth contracts.
// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

enum Errors {
    InvalidMessage = 0xFFFF
    NotOwner = 100
    NotParent = 101
    NotStatement = 102
    AlreadyInitialized = 103
    NotInitialized = 104
    NotEnoughValue = 105
    EmptyStatement = 106
    StatementTooLong = 107
    EmptyUrl = 108
    UrlTooLong = 109
    ZeroAmount = 110
    AmountExceedsVote = 111
    InsufficientBalance = 112
    HasArguments = 113
    InvalidLang = 114
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIN_MASTER_TON = grams("0.02") // kept on master for storage
const STATEMENT_RESERVE = grams("0.05") // kept on every statement for storage
const CREATE_GAS = grams("0.05") // required on top of the reserve to create a statement
const VOTE_RESERVE = grams("0.01") // kept on every vote for storage
const VOTE_GAS = grams("0.05") // required on top of the vote amount

const MAX_STATEMENT_BYTES = 500
const MAX_URL_BYTES = 256

const DONATE_COMMENT: slice = "donate".literalSlice()

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

struct VftData {
    statement: string // short thesis, 1..MAX_STATEMENT_BYTES bytes
    url: string?      // optional link to the source / full material
    lang: uint16      // language of the text: ISO 639-1 code as two ASCII letters, "ru" = 0x7275
}

// ---------------------------------------------------------------------------
// Storages
// ---------------------------------------------------------------------------

struct MasterStorage {
    owner: address
    statementsCount: uint32
}

// A statement is deployed with "empty" storage (owner and data are null),
// so its address depends only on (parent, idx, pro) and can be computed by anyone.
struct StatementStorage {
    parent: address
    idx: uint32
    pro: bool
    owner: address?
    data: Cell<VftData>?
    proCount: uint32
    conCount: uint32
}

// A vote is addressed by (statement, owner); amount is 0 in the initial state.
struct VoteStorage {
    statement: address
    owner: address
    amount: coins
}

fun MasterStorage.load(): MasterStorage {
    return MasterStorage.fromCell(contract.getData());
}

fun MasterStorage.save(self) {
    contract.setData(self.toCell());
}

fun StatementStorage.load(): StatementStorage {
    return StatementStorage.fromCell(contract.getData());
}

fun StatementStorage.save(self) {
    contract.setData(self.toCell());
}

fun VoteStorage.load(): VoteStorage {
    return VoteStorage.fromCell(contract.getData());
}

fun VoteStorage.save(self) {
    contract.setData(self.toCell());
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

// user -> master: create a root statement (topic)
struct (0x56f40001) NewParentStatement {
    data: VftData
}

// user -> statement: create a pro/con argument under this statement
struct (0x56f40002) NewChildStatement {
    data: VftData
    pro: bool
}

// parent -> new child, sent together with the deploy
struct (0x56f40003) SetStatementData {
    owner: address
    data: VftData
}

// new child -> author, carries the change
struct (0x56f40004) ChildCreated {
    idx: uint32
}

// user -> statement: vote for this statement with `amount`
// (attached value must be >= amount + VOTE_GAS, the excess is returned)
struct (0x56f40005) Vote {
    amount: coins
}

// statement -> vote of (statement, user)
struct (0x56f40006) AddVote {
    amount: coins
}

// owner -> vote: revoke part of the vote; owner -> master: withdraw tips
struct (0x56f40007) Withdraw {
    amount: coins
}

// owner -> vote: revoke the whole vote and destroy the contract
struct (0x56f40008) WithdrawAll {}

// author -> statement: delete it while nobody has answered it; the storage
// reserve returns to the author
struct (0x56f40009) DeleteStatement {}

// author -> statement: replace the source link (null removes it). The text stays
// immutable; changes are public, the indexer keeps the history of links.
struct (0x56f4000a) SetUrl {
    url: string?
}

// a plain text comment from a wallet, e.g. "donate"
struct (0x00000000) TextComment {
    text: RemainingBitsAndRefs
}

// ---------------------------------------------------------------------------
// Getter results
// ---------------------------------------------------------------------------

// flat on purpose: easy to decode by any client
struct StatementInfo {
    parent: address
    idx: uint32
    pro: bool
    owner: address?
    statement: string?
    url: string?
    lang: uint16 // 0 while the statement is not initialized
    proCount: uint32
    conCount: uint32
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Size of a string in bytes. Strings that don't fit into `maxCells` cells
// throw a cell overflow (exit code 8), which also rejects the message.
fun string.byteLength(self, maxCells: int): int {
    val (_cells, bits, _refs) = self.beginParse().calculateSizeStrict(maxCells);
    return bits / 8;
}

fun VftData.validate(self) {
    val len = self.statement.byteLength(8);
    assert (len > 0) throw Errors.EmptyStatement;
    assert (len <= MAX_STATEMENT_BYTES) throw Errors.StatementTooLong;
    validateUrl(self.url);
    validateLang(self.lang);
}

// The language is required: exactly two lowercase latin letters (ISO 639-1).
fun validateLang(lang: int) {
    val first = lang >> 8;
    val second = lang & 0xFF;
    assert (first >= 97 && first <= 122) throw Errors.InvalidLang;
    assert (second >= 97 && second <= 122) throw Errors.InvalidLang;
}

fun validateUrl(url: string?) {
    if (url != null) {
        val urlLen = url.byteLength(4);
        assert (urlLen > 0) throw Errors.EmptyUrl;
        assert (urlLen <= MAX_URL_BYTES) throw Errors.UrlTooLong;
    }
}

fun statementDeployAddress(
    statementCode: cell,
    parent: address,
    idx: int,
    pro: bool,
): AutoDeployAddress {
    val initial: StatementStorage = {
        parent,
        idx,
        pro,
        owner: null,
        data: null,
        proCount: 0,
        conCount: 0,
    };
    return { stateInit: { code: statementCode, data: initial.toCell() } };
}

fun voteDeployAddress(voteCode: cell, statement: address, owner: address): AutoDeployAddress {
    val initial: VoteStorage = {
        statement,
        owner,
        amount: 0,
    };
    return { stateInit: { code: voteCode, data: initial.toCell() } };
}

// Deploys a statement and forwards everything that came with the current
// message to it. The child keeps STATEMENT_RESERVE and refunds the rest.
fun deployStatement(
    statementCode: cell,
    idx: int,
    pro: bool,
    data: VftData,
    author: address,
    value: coins,
) {
    assert (value >= STATEMENT_RESERVE + CREATE_GAS) throw Errors.NotEnoughValue;
    data.validate();

    val deployMsg = createMessage({
        bounce: BounceMode.Only256BitsOfBody,
        value: 0,
        dest: statementDeployAddress(statementCode, contract.getAddress(), idx, pro),
        body: SetStatementData {
            owner: author,
            data,
        },
    });
    deployMsg.send(SEND_MODE_CARRY_ALL_REMAINING_MESSAGE_VALUE);
}
