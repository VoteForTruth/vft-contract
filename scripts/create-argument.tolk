// Creates a pro/con argument under a statement.
// Inputs: VFT_STATEMENT, VFT_SIDE (pro|con), VFT_TEXT, VFT_URL (empty for none).
import "@stdlib/strings"
import "@acton/env"
import "@acton/io"
import "@acton/prompts"
import "@acton/emulation/network"
import "@wrappers/VftStatement.gen"
import "utils/common"

fun main() {
    val wallet = vftWallet();
    val parent = inputStatement();
    val side = env<string>("VFT_SIDE") ?? select("Side", ["pro", "con"]);
    val pro = side.equalTo("pro");
    val text = inputText("VFT_TEXT", "Argument text");
    val url = inputUrl("VFT_URL");

    val idx = parent.childCount(pro);
    val argument = VftStatement.fromAddress(parent.childAddress(idx, pro));
    parent
        .sendNewChildStatement(
            wallet.address,
            { statement: text, url },
            pro,
            { value: CREATE_VALUE },
        )
        .waitForTrace();

    println("{} argument #{} created", pro ? "Pro" : "Con", idx);
    printStatement(argument);
}
