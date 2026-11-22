import "@stdlib/ownable";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

struct VftData {
    statement: String; // short thesis, 1..MaxStatementBytes bytes
    url: String?;      // optional link to the source / full material
}

struct StatementInfo {
    parent: Address;
    idx: Int;
    pro: Bool;
    owner: Address?;
    // flat on purpose: nested structs in getters are not decoded by some
    // clients (e.g. @ton/ton TonClient over toncenter v2)
    statement: String?;
    url: String?;
    proCount: Int;
    conCount: Int;
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

// user -> master: create a root statement (topic)
message NewParentStatement {
    data: VftData;
}

// user -> statement: create a pro/con argument under this statement
message NewChildStatement {
    data: VftData;
    pro: Bool;
}

// parent -> new child, sent together with the deploy
message SetStatementData {
    owner: Address;
    data: VftData;
}

// new child -> author, carries the change
message ChildCreated {
    idx: Int as uint32;
}

// user -> statement: vote for this statement with `amount` (value must be >= amount + VoteGas)
message Vote {
    amount: Int as coins;
}

// statement -> vote of (statement, user)
message AddVote {
    amount: Int as coins;
}

// owner -> vote (revoke part of the vote) / owner -> master (tips)
message Withdraw {
    amount: Int as coins;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MinMasterTon: Int = ton("0.02");     // kept on master for storage
const StatementReserve: Int = ton("0.05"); // kept on every statement for storage
const CreateGas: Int = ton("0.05");        // required on top of the reserve to create a statement
const VoteReserve: Int = ton("0.01");      // kept on every vote for storage
const VoteGas: Int = ton("0.05");          // required on top of the vote amount

const MaxStatementBytes: Int = 500;
const MaxUrlBytes: Int = 256;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Size of a string in bytes. Strings that don't fit into `maxCells` cells
// make computeDataSize throw (exit code 8), which also rejects the message.
fun stringBytes(s: String, maxCells: Int): Int {
    return s.asSlice().computeDataSize(maxCells).bits / 8;
}

fun validateData(data: VftData) {
    let len: Int = stringBytes(data.statement, 8);
    require(len > 0, "Empty statement");
    require(len <= MaxStatementBytes, "Statement too long");
    if (data.url != null) {
        let urlLen: Int = stringBytes(data.url!!, 4);
        require(urlLen > 0, "Empty url");
        require(urlLen <= MaxUrlBytes, "Url too long");
    }
}

// Deploys a statement and forwards everything that came with the current
// message to it. The child keeps StatementReserve and refunds the rest.
inline fun deployStatement(parent: Address, idx: Int, pro: Bool, data: VftData) {
    require(context().value >= StatementReserve + CreateGas, "Not enough value");
    validateData(data);

    let init: StateInit = initOf VftStatement(parent, idx, pro);
    send(SendParameters{
        to: contractAddress(init),
        value: 0,
        mode: SendRemainingValue,
        body: SetStatementData{owner: sender(), data: data}.toCell(),
        code: init.code,
        data: init.data
    });
}

// ---------------------------------------------------------------------------
// Master: registry of root statements
// ---------------------------------------------------------------------------

contract VftMaster with Ownable {
    owner: Address;
    statementsCount: Int as uint32 = 0;

    // The owner is part of the address, so nobody can front-run the deploy
    // and become the owner of "our" master.
    init(owner: Address) {
        self.owner = owner;
    }

    receive(msg: NewParentStatement) {
        deployStatement(myAddress(), self.statementsCount, true, msg.data);
        self.statementsCount += 1;
    }

    // Deploy (empty message) and tips: anyone can send TON to the master
    receive() {}

    receive(msg: Withdraw) {
        require(sender() == self.owner, "Only owner is allowed to withdraw");
        let available: Int = myBalance() - context().value - MinMasterTon;
        let amount: Int = min(msg.amount, available);
        require(amount > 0, "Insufficient balance");
        send(SendParameters{
            to: sender(),
            value: amount,
            mode: SendRemainingValue,
            bounce: false
        });
    }

    get fun statementsCount(): Int {
        return self.statementsCount;
    }

    get fun statementAddress(idx: Int): Address {
        return contractAddress(initOf VftStatement(myAddress(), idx, true));
    }
}

// ---------------------------------------------------------------------------
// Statement: a node of the tree (root topic or pro/con argument).
// Immutable after creation.
// ---------------------------------------------------------------------------

contract VftStatement {
    parent: Address;
    idx: Int as uint32;
    pro: Bool;

    owner: Address?;
    data: VftData?;

    proCount: Int as uint32 = 0;
    conCount: Int as uint32 = 0;

    init(parent: Address, idx: Int, pro: Bool) {
        require(sender() == parent, "Only parent is allowed to deploy");
        self.parent = parent;
        self.idx = idx;
        self.pro = pro;
    }

    receive(msg: SetStatementData) {
        require(sender() == self.parent, "Only parent is allowed to set data");
        require(self.owner == null, "Already initialized");
        self.owner = msg.owner;
        self.data = msg.data;

        // keep the storage reserve, return the change to the author
        nativeReserve(StatementReserve, ReserveAtMost);
        send(SendParameters{
            to: msg.owner,
            value: 0,
            mode: SendRemainingBalance + SendIgnoreErrors,
            bounce: false,
            body: ChildCreated{idx: self.idx}.toCell()
        });
    }

    receive(msg: NewChildStatement) {
        require(self.owner != null, "Not initialized");
        if (msg.pro) {
            deployStatement(myAddress(), self.proCount, true, msg.data);
            self.proCount += 1;
        } else {
            deployStatement(myAddress(), self.conCount, false, msg.data);
            self.conCount += 1;
        }
    }

    // Vote for this statement with money. Creates the vote contract on the
    // first vote, adds to it on the next ones.
    receive(msg: Vote) {
        require(self.owner != null, "Not initialized");
        require(msg.amount > 0, "Zero vote");
        require(context().value >= msg.amount + VoteGas, "Not enough value");

        let init: StateInit = initOf VftVote(myAddress(), sender());
        send(SendParameters{
            to: contractAddress(init),
            value: 0,
            mode: SendRemainingValue,
            body: AddVote{amount: msg.amount}.toCell(),
            code: init.code,
            data: init.data
        });
    }

    // Donation to the author. Can be sent from any wallet as a text comment.
    receive("donate") {
        require(self.owner != null, "Not initialized");
        send(SendParameters{
            to: self.owner!!,
            value: 0,
            mode: SendRemainingValue,
            bounce: false
        });
    }

    get fun info(): StatementInfo {
        return StatementInfo{
            parent: self.parent,
            idx: self.idx,
            pro: self.pro,
            owner: self.owner,
            statement: self.data == null ? null : self.data!!.statement,
            url: self.data == null ? null : self.data!!.url,
            proCount: self.proCount,
            conCount: self.conCount
        };
    }

    get fun childCount(pro: Bool): Int {
        return pro ? self.proCount : self.conCount;
    }

    get fun childAddress(idx: Int, pro: Bool): Address {
        return contractAddress(initOf VftStatement(myAddress(), idx, pro));
    }

    get fun voteAddress(owner: Address): Address {
        return contractAddress(initOf VftVote(myAddress(), owner));
    }
}

// ---------------------------------------------------------------------------
// Vote: money of one owner for one statement. Holds the money.
// ---------------------------------------------------------------------------

contract VftVote {
    statement: Address;
    owner: Address;
    amount: Int as coins = 0;

    init(statement: Address, owner: Address) {
        require(sender() == statement, "Only statement is allowed to deploy");
        self.statement = statement;
        self.owner = owner;
    }

    receive(msg: AddVote) {
        require(sender() == self.statement, "Only statement is allowed to add to the vote");
        self.amount += msg.amount;

        // keep the vote amount and the storage reserve, return the excess gas
        nativeReserve(self.amount + VoteReserve, ReserveAtMost);
        send(SendParameters{
            to: self.owner,
            value: 0,
            mode: SendRemainingBalance + SendIgnoreErrors,
            bounce: false
        });
    }

    receive(msg: Withdraw) {
        require(sender() == self.owner, "Only owner is allowed to withdraw");
        require(msg.amount > 0, "Zero amount");
        require(msg.amount <= self.amount, "Amount exceeds vote");
        self.amount -= msg.amount;
        send(SendParameters{
            to: self.owner,
            value: msg.amount,
            mode: SendRemainingValue, // + the rest of the incoming value
            bounce: false
        });
    }

    // Withdraw everything and destroy the contract. A new vote re-creates it.
    receive("withdraw all") {
        require(sender() == self.owner, "Only owner is allowed to withdraw");
        self.amount = 0;
        send(SendParameters{
            to: self.owner,
            value: 0,
            mode: SendRemainingBalance + SendDestroyIfZero,
            bounce: false
        });
    }

    get fun amount(): Int {
        return self.amount;
    }

    get fun owner(): Address {
        return self.owner;
    }

    get fun statement(): Address {
        return self.statement;
    }
}
