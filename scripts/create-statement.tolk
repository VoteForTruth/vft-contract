// Creates a root statement (topic).
// Inputs: VFT_TEXT, VFT_URL (empty for none), VFT_MASTER (optional).
import "@acton/io"
import "@acton/emulation/network"
import "@wrappers/VftMaster.gen"
import "@wrappers/VftStatement.gen"
import "utils/common"

fun main() {
    val wallet = vftWallet();
    val master = vftMaster(wallet.address);
    val text = inputText("VFT_TEXT", "Statement text");
    val url = inputUrl("VFT_URL");

    val idx = master.statementsCount();
    val statement = VftStatement.fromAddress(master.statementAddress(idx));
    master
        .sendNewParentStatement(wallet.address, { statement: text, url }, { value: CREATE_VALUE })
        .waitForTrace();

    println("Statement #{} created", idx);
    printStatement(statement);
}
