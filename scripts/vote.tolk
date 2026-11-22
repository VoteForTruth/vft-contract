// Votes for a statement with money, or adds to an existing vote.
// Inputs: VFT_STATEMENT, VFT_AMOUNT (in TON).
import "@acton/io"
import "@acton/emulation/network"
import "@wrappers/VftStatement.gen"
import "@wrappers/VftVote.gen"
import "utils/common"

fun main() {
    val wallet = vftWallet();
    val statement = inputStatement();
    val amount = parseTon(inputAmountString("Vote amount, TON"));

    statement.sendVote(wallet.address, amount, { value: amount + VOTE_EXTRA_GAS }).waitForTrace();

    val vote = VftVote.fromAddress(statement.voteAddress(wallet.address));
    println("vote {}: {:ton}", vote.address, vote.amount());
}
