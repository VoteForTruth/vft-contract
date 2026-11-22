// Deploys the master owned by the signing wallet.
import "@acton/io"
import "@acton/emulation/network"
import "@acton/emulation/scripts"
import "@wrappers/VftMaster.gen"
import "utils/common"

fun main() {
    val wallet = vftWallet();
    val master = VftMaster.fromStorage({ owner: wallet.address, statementsCount: 0 });

    if (scripts.isContractDeployed(master.address)) {
        println("Master is already deployed");
    } else {
        // the value stays on the master as a storage reserve
        master.deploy(wallet.address, { value: grams("0.05") }).waitForFirstTransaction();
    }

    println("VFT_MASTER={}", master.address);
    println("owner: {}", master.owner());
    println("statements: {}", master.statementsCount());
}
