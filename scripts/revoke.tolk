// Revokes a vote partially, or fully with "all" (the vote contract is destroyed).
// Inputs: VFT_STATEMENT, VFT_AMOUNT (in TON, or "all").
import "@stdlib/strings"
import "@acton/io"
import "@acton/emulation/network"
import "@acton/emulation/scripts"
import "@wrappers/VftStatement.gen"
import "@wrappers/VftVote.gen"
import "utils/common"

fun main() {
    val wallet = vftWallet();
    val statement = inputStatement();
    val vote = VftVote.fromAddress(statement.voteAddress(wallet.address));
    val amount = inputAmountString("Amount to revoke, TON (or \"all\")");

    if (amount.equalTo("all")) {
        vote.sendWithdrawAll(wallet.address, { value: CONTROL_VALUE }).waitForTrace();
        println("vote {} revoked completely", vote.address);
        return;
    }

    vote.sendWithdraw(wallet.address, parseTon(amount), { value: CONTROL_VALUE }).waitForTrace();
    println("vote {}: {:ton}", vote.address, vote.amount());
}
