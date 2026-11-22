import "@gen/VftStatement.code"
import "types"

// Registry of root statements (topics).
contract VftMaster {
    version: "2.0.0"
    description: "Vote For Truth: registry of root statements"
    storage: MasterStorage
    incomingMessages: MasterMessage
}

type MasterMessage = NewParentStatement | Withdraw

fun onInternalMessage(in: InMessage) {
    val msg = lazy MasterMessage.fromSlice(in.body);

    match (msg) {
        NewParentStatement => {
            var storage = lazy MasterStorage.load();
            deployStatement(
                vftStatementCompiledCode(),
                storage.statementsCount,
                true,
                msg.data,
                in.senderAddress,
                in.valueCoins,
            );
            storage.statementsCount += 1;
            storage.save();
        }

        Withdraw => {
            val storage = lazy MasterStorage.load();
            assert (in.senderAddress == storage.owner) throw Errors.NotOwner;
            val available = contract.getOriginalBalance() - in.valueCoins - MIN_MASTER_TON;
            val amount = min(msg.amount, available);
            assert (amount > 0) throw Errors.InsufficientBalance;

            val reply = createMessage({
                bounce: BounceMode.NoBounce,
                value: amount,
                dest: storage.owner,
            });
            reply.send(SEND_MODE_CARRY_ALL_REMAINING_MESSAGE_VALUE);
        }

        else => {
            // deploy and tips: anyone can send plain TON to the master
            assert (in.body.isEmpty()) throw Errors.InvalidMessage;
        }
    }
}

fun onBouncedMessage(_in: InMessageBounced) {}

get fun statementsCount(): int {
    val storage = lazy MasterStorage.load();
    return storage.statementsCount;
}

get fun statementAddress(idx: int): address {
    return statementDeployAddress(
        vftStatementCompiledCode(),
        contract.getAddress(),
        idx,
        true,
    ).calculateAddress();
}

get fun owner(): address {
    val storage = lazy MasterStorage.load();
    return storage.owner;
}
