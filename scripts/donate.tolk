// Donates to the author of a statement.
// Inputs: VFT_STATEMENT, VFT_AMOUNT (in TON).
// Any wallet can do the same by sending TON with the text comment "donate".
import "@acton/io"
import "@acton/emulation/network"
import "@contracts/types"
import "@wrappers/VftStatement.gen"
import "utils/common"

fun main() {
    val wallet = vftWallet();
    val statement = inputStatement();
    val amount = parseTon(inputAmountString("Donation, TON"));

    statement.sendTextComment(wallet.address, DONATE_COMMENT, { value: amount }).waitForTrace();
    println("Donated {:ton} to {}", amount, statement.info().owner);
}
