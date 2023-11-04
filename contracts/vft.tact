import "@stdlib/deploy";
import "@stdlib/ownable";

struct VftData {
    statement: String?;
    url: String?;
}

message NewParentStatement {
    data: VftData;
}

message NewChildStatement {
    data: VftData;
    pro: Bool;
}

message SetStatementData {
    owner: Address;
    data: VftData;
}

message SetVoteData {
    owner: Address;
}

message ChildCreated {
    idx: Int as uint256;
}

message Withdraw {
    amount: Int as coins;
}

// These values are required to deploy these contracts
const MinMasterTon: Int = ton("0.02");
const MinStatementTon: Int = ton("0.1");
const MinVoteTon: Int = ton("0.02");

contract VftMaster with Deployable, Ownable {
    owner: Address;
    statementsCount: Int as uint256 = 0;

    init() {
        self.owner = sender();
    }

    receive(msg: NewParentStatement) {
        let init: StateInit = initOf VftStatement(myAddress(), self.statementsCount, true);
        send(
            SendParameters{
                to: contractAddress(init),
                body: SetStatementData{owner: sender(), data: msg.data}.toCell(),
                value: MinStatementTon, // pay for the deployment and leave some TON in the child for storage
                mode: SendIgnoreErrors,
                code: init.code,
                data: init.data
            }
        );

        // this will return excess gas to sender
        self.reply(ChildCreated{idx: self.statementsCount}.toCell());

        self.statementsCount = self.statementsCount + 1;
    }

    // Receiving TON coins
    // Anyone can send to tip the master
    receive() {
        dump("funds received");
    }

    // this will withdraw the entire balance but leave 0.01 for storage rent costs
    receive("withdraw safe") {
        require(sender() == self.owner, "Only owner is allowed to withdraw");
        send(SendParameters{
            to: sender(),
            bounce: true,
            value: myBalance() - context().value - MinMasterTon,
            mode: SendRemainingValue + SendIgnoreErrors
        });
    }

    receive(msg: Withdraw) {
        require(sender() == self.owner, "Only owner is allowed to withdraw");

        let amount: Int = min(msg.amount, myBalance() - context().value - MinMasterTon);
        require(amount > 0, "Insufficient balance");
        send(SendParameters{
            to: sender(),
            bounce: true,
            value: amount,
            mode: SendRemainingValue + SendIgnoreErrors
        });
    }

    get fun balance(): String {
        return myBalance().toCoinsString();
    }

    get fun statementsCount(): Int {
        return self.statementsCount;
    }

    get fun statementAddress(idx: Int): Address {
        return contractAddress(initOf VftStatement(myAddress(), idx, true));
    }
}

contract VftStatement {
    parent: Address;
    idx: Int as uint256;
    pro: Bool;

    owner: Address?;
    data: VftData?;

    proStatementsCount: Int as uint256 = 0;
    conStatementsCount: Int as uint256 = 0;
    votesCount: Int as uint256 = 0;

    init(parent: Address, idx: Int, pro: Bool) {
        require(sender() == parent, "Only parent is allowed to deploy");

        self.parent = parent;
        self.idx = idx;
        self.pro = pro;
    }

    receive(msg: SetStatementData) {
        require(sender() == self.parent, "Only parent is allowed to set data");

        self.owner = msg.owner;
        self.data = msg.data;
    }

    receive(msg: NewChildStatement) {
        if (msg.pro) {
            let init: StateInit = initOf VftStatement(myAddress(), self.proStatementsCount, true);
            send(
                SendParameters{
                    to: contractAddress(init),
                    body: SetStatementData{owner: sender(), data: msg.data}.toCell(),
                    value: MinStatementTon, // pay for the deployment and leave some TON in the child for storage
                    mode: SendIgnoreErrors,
                    code: init.code,
                    data: init.data
                }
            );

            // this will return excess gas to sender
            self.reply(ChildCreated{idx: self.proStatementsCount}.toCell());

            self.proStatementsCount = self.proStatementsCount + 1;
        } else {
            let init: StateInit = initOf VftStatement(myAddress(), self.conStatementsCount, false);
            send(
                SendParameters{
                    to: contractAddress(init),
                    body: SetStatementData{owner: sender(), data: msg.data}.toCell(),
                    value: MinStatementTon, // pay for the deployment and leave some TON in the child for storage
                    mode: SendIgnoreErrors,
                    code: init.code,
                    data: init.data
                }
            );

            // this will return excess gas to sender
            self.reply(ChildCreated{idx: self.conStatementsCount}.toCell());

            self.conStatementsCount = self.conStatementsCount + 1;
        }
    }

    receive("vote") {
        let init: StateInit = initOf VftVoteContract(myAddress(), self.votesCount);
        send(
            SendParameters{
                to: contractAddress(init),
                body: SetVoteData{owner: sender()}.toCell(),
                value: MinVoteTon, // pay for the deployment and leave some TON for storage
                mode: SendIgnoreErrors,
                code: init.code,
                data: init.data
            }
        );

        // this will return excess gas to sender
        self.reply(ChildCreated{idx: self.votesCount}.toCell());

        self.votesCount = self.votesCount + 1;
    }

    get fun data(): VftData {
        return self.data!!;
    }

    get fun proStatementsCount(): Int {
        return self.proStatementsCount;
    }

    get fun proStatementAddress(idx: Int): Address {
        return contractAddress(initOf VftStatement(myAddress(), idx, true));
    }

    get fun conStatementsCount(): Int {
        return self.conStatementsCount;
    }

    get fun conStatementAddress(idx: Int): Address {
        return contractAddress(initOf VftStatement(myAddress(), idx, false));
    }

    get fun votesCount(): Int {
        return self.votesCount;
    }

    get fun voteAddress(idx: Int): Address {
        return contractAddress(initOf VftVoteContract(myAddress(), idx));
    }
}

contract VftVoteContract {
    statement: Address;
    idx: Int as uint256;

    owner: Address?;

    // Setting data and owner separately, so that we can identify contract with init parameters only
    init(statement: Address, idx: Int) {
        require(sender() == statement, "Only statement is allowed to deploy");

        self.statement = statement;
        self.idx = idx;
    }

    receive(msg: SetVoteData) {
        require(sender() == self.statement, "Only statement is allowed to set data");

        self.owner = msg.owner;
    }

    // Receiving TON coins
    receive() {
        require(sender() == self.owner, "Only statement is allowed to add funds");
        dump("funds received");
    }

    // this will withdraw the entire balance of the contract and leave 0
    receive("withdraw all") {
        require(sender() == self.owner, "Only owner is allowed to withdraw");
        send(SendParameters{
            to: sender(),
            bounce: true,
            value: 0,
            mode: SendRemainingBalance + SendIgnoreErrors
        });
    }

    // this will withdraw the entire balance but leave 0.01 for storage rent costs
    receive("withdraw safe") {
        require(sender() == self.owner, "Only owner is allowed to withdraw");
        send(SendParameters{
            to: sender(),
            bounce: true,
            value: myBalance() - context().value - MinVoteTon,
            mode: SendRemainingValue + SendIgnoreErrors
        });
    }

    receive(msg: Withdraw) {
        require(sender() == self.owner, "Only owner is allowed to withdraw");

        let amount: Int = min(msg.amount, myBalance() - context().value - MinVoteTon);
        require(amount > 0, "Insufficient balance");
        send(SendParameters{
            to: sender(),
            bounce: true,
            value: amount,
            mode: SendRemainingValue + SendIgnoreErrors
        });
    }

    get fun balance(): String {
        return myBalance().toCoinsString();
    }
}
