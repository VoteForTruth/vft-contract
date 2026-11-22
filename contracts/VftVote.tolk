import "types"

// Money of one owner for one statement. Addressed by (statement, owner).
contract VftVote {
    version: "2.0.0"
    description: "Vote For Truth: vote of one owner for one statement"
    storage: VoteStorage
    incomingMessages: VoteMessage
}

type VoteMessage = AddVote | Withdraw | WithdrawAll

fun onInternalMessage(in: InMessage) {
    val msg = lazy VoteMessage.fromSlice(in.body);

    match (msg) {
        AddVote => {
            var storage = lazy VoteStorage.load();
            assert (in.senderAddress == storage.statement) throw Errors.NotStatement;
            storage.amount += msg.amount;
            storage.save();

            // keep the vote amount and the storage reserve, return the excess gas
            reserveGramsOnBalance(storage.amount + VOTE_RESERVE, RESERVE_MODE_AT_MOST);
            val excess = createMessage({
                bounce: BounceMode.NoBounce,
                value: 0,
                dest: storage.owner,
            });
            // SAFETY: called after reserving amount + VOTE_RESERVE, so only the excess gas leaves
            excess.send(SEND_MODE_CARRY_ALL_BALANCE | SEND_MODE_IGNORE_ERRORS);
        }

        // Revoke part of the vote
        Withdraw => {
            var storage = lazy VoteStorage.load();
            assert (in.senderAddress == storage.owner) throw Errors.NotOwner;
            assert (msg.amount > 0) throw Errors.ZeroAmount;
            assert (msg.amount <= storage.amount) throw Errors.AmountExceedsVote;
            storage.amount -= msg.amount;
            storage.save();

            val payout = createMessage({
                bounce: BounceMode.NoBounce,
                value: msg.amount,
                dest: storage.owner,
            });
            // + the rest of the incoming value
            payout.send(SEND_MODE_CARRY_ALL_REMAINING_MESSAGE_VALUE);
        }

        // Revoke everything and destroy the contract. A new vote re-creates it.
        WithdrawAll => {
            val storage = lazy VoteStorage.load();
            assert (in.senderAddress == storage.owner) throw Errors.NotOwner;

            val payout = createMessage({
                bounce: BounceMode.NoBounce,
                value: 0,
                dest: storage.owner,
            });
            // SAFETY: only the owner can trigger this; the whole balance is the owner's vote + reserve
            payout.send(SEND_MODE_CARRY_ALL_BALANCE | SEND_MODE_DESTROY);
        }

        else => throw Errors.InvalidMessage,
    }
}

fun onBouncedMessage(_in: InMessageBounced) {}

get fun amount(): int {
    val storage = lazy VoteStorage.load();
    return storage.amount;
}

get fun owner(): address {
    val storage = lazy VoteStorage.load();
    return storage.owner;
}

get fun statement(): address {
    val storage = lazy VoteStorage.load();
    return storage.statement;
}
