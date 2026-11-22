// Shared helpers for VFT scripts.
//
// Every input is taken from an environment variable if it is set, otherwise
// it is asked interactively. Amounts are entered in TON, e.g. "1.5".

import "@stdlib/strings"
import "@acton/env"
import "@acton/io"
import "@acton/prompts"
import "@acton/emulation/scripts"
import "@acton/testing/assert"
import "@contracts/types"
import "@wrappers/VftMaster.gen"
import "@wrappers/VftStatement.gen"

const CREATE_VALUE = grams("0.15") // statement reserve + gas, the change comes back
const VOTE_EXTRA_GAS = grams("0.1") // sent on top of the vote amount, the excess comes back
const CONTROL_VALUE = grams("0.05") // for revoke messages, comes back

// The wallet that signs transactions. With --tonconnect it is the connected wallet.
fun vftWallet(): ActonWallet {
    return scripts.wallet(env<string>("VFT_WALLET") ?? "deployer");
}

// VFT_MASTER, or the master owned by `owner` (its address is derived from the owner).
fun vftMaster(owner: address): VftMaster {
    val explicit = env<address>("VFT_MASTER");
    if (explicit != null) {
        return VftMaster.fromAddress(explicit);
    }
    return VftMaster.fromStorage({ owner, statementsCount: 0 });
}

fun inputText(envName: string, message: string): string {
    return env<string>(envName) ?? prompt(message);
}

// Empty input means "no url".
fun inputUrl(envName: string): string? {
    val url = env<string>(envName) ?? prompt("Url (empty for none)");
    return url.calculateLength() == 0 ? null : url;
}

fun inputAddress(envName: string, message: string): address {
    return env<address>(envName) ?? promptAddress(message);
}

fun inputStatement(): VftStatement {
    return VftStatement.fromAddress(inputAddress("VFT_STATEMENT", "Statement address"));
}

fun inputAmountString(message: string): string {
    return env<string>("VFT_AMOUNT") ?? prompt(message, "e.g. 1.5");
}

// Parses a decimal TON amount like "1", "0.25" or "1,5" into nanotons.
fun parseTon(s: string): coins {
    var sl = s.beginParse();
    var whole = 0;
    var frac = 0;
    var fracDigits = 0;
    var seenDot = false;
    var digits = 0;
    while (sl.remainingBitsCount() >= 8) {
        val ch = sl.loadUint(8);
        if (ch == 46 || ch == 44) {
            // '.' or ','
            if (seenDot) {
                Assert.fail("Invalid amount: more than one decimal separator");
            }
            seenDot = true;
        } else {
            if (ch < 48 || ch > 57) {
                Assert.fail("Invalid amount: only digits and a decimal separator are allowed");
            }
            digits += 1;
            if (seenDot) {
                if (fracDigits == 9) {
                    Assert.fail("Invalid amount: at most 9 decimal places");
                }
                frac = frac * 10 + (ch - 48);
                fracDigits += 1;
            } else {
                whole = whole * 10 + (ch - 48);
            }
        }
    }
    if (digits == 0) {
        Assert.fail("Invalid amount: empty");
    }
    repeat (9 - fracDigits) {
        frac *= 10;
    }
    return whole * 1000000000 + frac;
}

fun printStatement(statement: VftStatement) {
    val info = statement.info();
    println(
        "{} [{} #{}] {}",
        statement.address,
        info.pro ? "pro" : "con",
        info.idx,
        info.statement,
    );
    if (info.url != null) {
        println("    url: {}", info.url);
    }
    println("    author: {}", info.owner);
    println("    arguments: {} pro / {} con", info.proCount, info.conCount);
}
