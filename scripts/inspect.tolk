// Read-only dump of the whole tree. Run against the real network with:
//   acton script --fork-net testnet scripts/inspect.tolk
// Inputs: VFT_MASTER (or the master of VFT_WALLET), VFT_VOTER (optional).
import "@stdlib/strings"
import "@acton/env"
import "@acton/io"
import "@acton/emulation/scripts"
import "@wrappers/VftMaster.gen"
import "@wrappers/VftStatement.gen"
import "@wrappers/VftVote.gen"
import "utils/common"

fun printTree(statement: VftStatement, depth: int, voter: address?): void {
    val info = statement.info();
    var sb = StringBuilder.create().append("");
    repeat (depth) {
        sb.append("    ");
    }
    val pad = sb.build();
    println("{}[{} #{}] {}", pad, info.pro ? "PRO" : "CON", info.idx, info.statement);
    println("{}  {} url: {}", pad, statement.address, info.url);
    println(
        "{}  balance {:ton}, author {}",
        pad,
        scripts.fetchAccountBalance(statement.address),
        info.owner,
    );
    if (voter != null) {
        val voteAddress = statement.voteAddress(voter);
        if (scripts.isContractDeployed(voteAddress)) {
            println(
                "{}  vote of the voter: {:ton}",
                pad,
                VftVote.fromAddress(voteAddress).amount(),
            );
        } else {
            println("{}  vote of the voter: none", pad);
        }
    }
    var i = 0;
    while (i < info.proCount) {
        printTree(VftStatement.fromAddress(statement.childAddress(i, true)), depth + 1, voter);
        i += 1;
    }
    i = 0;
    while (i < info.conCount) {
        printTree(VftStatement.fromAddress(statement.childAddress(i, false)), depth + 1, voter);
        i += 1;
    }
}

fun main() {
    val master = env<address>("VFT_MASTER") != null
        ? VftMaster.fromAddress(env<address>("VFT_MASTER")!)
        : vftMaster(vftWallet().address);
    val voter = env<address>("VFT_VOTER");

    val count = master.statementsCount();
    println("Master {} owner {}", master.address, master.owner());
    println("balance {:ton}, statements {}", scripts.fetchAccountBalance(master.address), count);
    var i = 0;
    while (i < count) {
        printTree(VftStatement.fromAddress(master.statementAddress(i)), 0, voter);
        i += 1;
    }
}
