import "@gen/VftVote.code"
import "types"

// A node of the tree: a root topic or a pro/con argument. The text is immutable;
// the author can replace the source link and delete the statement while it has
// no arguments.
contract VftStatement {
    version: "2.2.0"
    description: "Vote For Truth: statement or argument"
    storage: StatementStorage
    incomingMessages: StatementMessage
}

type StatementMessage =
    | SetStatementData
    | NewChildStatement
    | Vote
    | TextComment
    | DeleteStatement
    | SetUrl

fun onInternalMessage(in: InMessage) {
    val msg = lazy StatementMessage.fromSlice(in.body);

    match (msg) {
        SetStatementData => {
            var storage = lazy StatementStorage.load();
            assert (in.senderAddress == storage.parent) throw Errors.NotParent;
            assert (storage.owner == null) throw Errors.AlreadyInitialized;
            storage.owner = msg.owner;
            storage.data = msg.data.toCell();
            storage.save();

            // keep the storage reserve, return the change to the author
            reserveGramsOnBalance(STATEMENT_RESERVE, RESERVE_MODE_AT_MOST);
            val reply = createMessage({
                bounce: BounceMode.NoBounce,
                value: 0,
                dest: msg.owner,
                body: ChildCreated { idx: storage.idx },
            });
            // SAFETY: called after reserveGramsOnBalance(STATEMENT_RESERVE), so only the change above the reserve leaves
            reply.send(SEND_MODE_CARRY_ALL_BALANCE | SEND_MODE_IGNORE_ERRORS);
        }

        NewChildStatement => {
            var storage = lazy StatementStorage.load();
            assert (storage.owner != null) throw Errors.NotInitialized;
            if (msg.pro) {
                deployStatement(
                    contract.getCode(),
                    storage.proCount,
                    true,
                    msg.data,
                    in.senderAddress,
                    in.valueCoins,
                );
                storage.proCount += 1;
            } else {
                deployStatement(
                    contract.getCode(),
                    storage.conCount,
                    false,
                    msg.data,
                    in.senderAddress,
                    in.valueCoins,
                );
                storage.conCount += 1;
            }
            storage.save();
        }

        // Vote for this statement with money. Creates the vote contract on the
        // first vote, adds to it on the next ones.
        Vote => {
            val storage = lazy StatementStorage.load();
            assert (storage.owner != null) throw Errors.NotInitialized;
            assert (msg.amount > 0) throw Errors.ZeroAmount;
            assert (in.valueCoins >= msg.amount + VOTE_GAS) throw Errors.NotEnoughValue;

            val voteMsg = createMessage({
                bounce: BounceMode.Only256BitsOfBody,
                value: 0,
                dest: voteDeployAddress(
                    vftVoteCompiledCode(),
                    contract.getAddress(),
                    in.senderAddress,
                ),
                body: AddVote { amount: msg.amount },
            });
            voteMsg.send(SEND_MODE_CARRY_ALL_REMAINING_MESSAGE_VALUE);
        }

        // Donation to the author: a "donate" text comment from any wallet.
        TextComment => {
            assert (msg.text.bitsEqual(DONATE_COMMENT)) throw Errors.InvalidMessage;
            val storage = lazy StatementStorage.load();
            assert (storage.owner != null) throw Errors.NotInitialized;

            val donation = createMessage({
                bounce: BounceMode.NoBounce,
                value: 0,
                dest: storage.owner,
            });
            donation.send(SEND_MODE_CARRY_ALL_REMAINING_MESSAGE_VALUE);
        }

        // The author deletes the statement while nobody has answered it: arguments
        // of other people are never deleted. Votes live in their own contracts and
        // are withdrawn by their owners as usual. The text stays in the history of
        // transactions — deleting only removes the contract.
        DeleteStatement => {
            val storage = lazy StatementStorage.load();
            assert (storage.owner != null) throw Errors.NotInitialized;
            assert (in.senderAddress == storage.owner) throw Errors.NotOwner;
            assert (storage.proCount == 0) throw Errors.HasArguments;
            assert (storage.conCount == 0) throw Errors.HasArguments;

            val refund = createMessage({
                bounce: BounceMode.NoBounce,
                value: 0,
                dest: storage.owner,
            });
            // SAFETY: only the author can trigger this, only without arguments; donations are forwarded at once, so the balance is the author's reserve plus this message
            refund.send(SEND_MODE_CARRY_ALL_BALANCE | SEND_MODE_DESTROY);
        }

        // The author replaces the source link, e.g. when the site is blocked or
        // moved. The text can't change. The change returns to the author.
        SetUrl => {
            var storage = lazy StatementStorage.load();
            assert (storage.owner != null) throw Errors.NotInitialized;
            assert (in.senderAddress == storage.owner) throw Errors.NotOwner;
            validateUrl(msg.url);

            var data = storage.data!.load();
            data.url = msg.url;
            storage.data = data.toCell();
            storage.save();

            reserveGramsOnBalance(STATEMENT_RESERVE, RESERVE_MODE_AT_MOST);
            val change = createMessage({
                bounce: BounceMode.NoBounce,
                value: 0,
                dest: in.senderAddress,
            });
            // SAFETY: called after reserveGramsOnBalance(STATEMENT_RESERVE), so only the change above the reserve leaves
            change.send(SEND_MODE_CARRY_ALL_BALANCE | SEND_MODE_IGNORE_ERRORS);
        }

        else => throw Errors.InvalidMessage,
    }
}

fun onBouncedMessage(_in: InMessageBounced) {}

get fun info(): StatementInfo {
    val storage = lazy StatementStorage.load();
    var statement: string? = null;
    var url: string? = null;
    if (storage.data != null) {
        val data = storage.data.load();
        statement = data.statement;
        url = data.url;
    }
    return {
        parent: storage.parent,
        idx: storage.idx,
        pro: storage.pro,
        owner: storage.owner,
        statement,
        url,
        proCount: storage.proCount,
        conCount: storage.conCount,
    };
}

get fun childCount(pro: bool): int {
    val storage = lazy StatementStorage.load();
    return pro ? storage.proCount : storage.conCount;
}

get fun childAddress(idx: int, pro: bool): address {
    return statementDeployAddress(
        contract.getCode(),
        contract.getAddress(),
        idx,
        pro,
    ).calculateAddress();
}

get fun voteAddress(owner: address): address {
    return voteDeployAddress(
        vftVoteCompiledCode(),
        contract.getAddress(),
        owner,
    ).calculateAddress();
}
