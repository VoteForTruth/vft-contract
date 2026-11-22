import "@stdlib/strings"

import "@acton/emulation/network"
import "@acton/emulation/testing"
import "@acton/testing/expect"
import "@contracts/types"
import "@wrappers/VftMaster.gen"
import "@wrappers/VftStatement.gen"
import "@wrappers/VftVote.gen"

const CREATE_VALUE = grams("0.15") // what a user sends to create a statement
const FEE_TOLERANCE = grams("0.02") // upper bound for network fees in a flow

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RU = 0x7275 // "ru"

fun data(statement: string, url: string? = null, lang: int = RU): VftData {
    return {
        statement,
        url,
        lang,
    };
}

// Builds `s` repeated `times` times as a standard snake string (127 bytes per cell).
// `s` must be a short single-cell literal.
fun repeatStr(s: string, times: int): string {
    val part = s.beginParse();
    val perCell = 1016 / part.remainingBitsCount();
    var count = times % perCell;
    if (count == 0) {
        count = perCell;
    }
    var left = times;
    var tail: cell? = null;
    while (left > 0) {
        var b = beginCell();
        repeat (count) {
            b.storeSlice(part);
        }
        if (tail != null) {
            b.storeRef(tail);
        }
        tail = b.endCell();
        left -= count;
        count = perCell;
    }
    return tail! as unknown as string;
}

// Treasuries in the emulator are not debited for the value they send,
// so the real cost of a flow is "sent value minus what came back".
fun netCost(sent: coins, before: coins, after: coins): int {
    return sent - (after - before);
}

fun balanceOf(addr: address): coins {
    return testing.getAccountBalance(addr);
}

fun setupMaster(): (VftMaster, Treasury) {
    val deployer = testing.treasury("deployer");
    val master = VftMaster.fromStorage({ owner: deployer.address, statementsCount: 0 });
    val res = master.deploy(deployer.address, { value: grams("0.05") });
    expect(res).toHaveSuccessfulDeploy({ to: master.address });
    return (master, deployer);
}

fun createRoot(master: VftMaster, author: address, d: VftData): (SendResultList, VftStatement) {
    val address = master.statementAddress(master.statementsCount());
    val res = master.sendNewParentStatement(author, d, { value: CREATE_VALUE });
    return (res, VftStatement.fromAddress(address));
}

fun createChild(
    parent: VftStatement,
    author: address,
    d: VftData,
    pro: bool,
): (SendResultList, VftStatement) {
    val address = parent.childAddress(parent.childCount(pro), pro);
    val res = parent.sendNewChildStatement(author, d, pro, { value: CREATE_VALUE });
    return (res, VftStatement.fromAddress(address));
}

fun castVote(
    statement: VftStatement,
    voter: address,
    amount: coins,
    value: coins,
): (SendResultList, VftVote) {
    val res = statement.sendVote(voter, amount, { value });
    return (res, VftVote.fromAddress(statement.voteAddress(voter)));
}

fun setupRoot(): (VftMaster, Treasury, VftStatement) {
    val (master, _) = setupMaster();
    val author = testing.treasury("author");
    val (_, root) = createRoot(master, author.address, data("root"));
    return (master, author, root);
}

// ---------------------------------------------------------------------------
// Statements
// ---------------------------------------------------------------------------

get fun `test creates a root statement and refunds the change to the author`() {
    val (master, _) = setupMaster();
    val author = testing.treasury("author");
    val masterBefore = balanceOf(master.address);
    val authorBefore = balanceOf(author.address);

    val (res, statement) = createRoot(
        master,
        author.address,
        data("Earth is round", "https://example.com"),
    );

    expect(
        res,
    ).toHaveSuccessfulDeploy<SetStatementData>({ from: master.address, to: statement.address });
    expect(res).toHaveSuccessfulTx<ChildCreated>({ from: statement.address, to: author.address });
    expect(master.statementsCount()).toEqual(1);

    val info = statement.info();
    expect(info.owner).toEqual(author.address);
    expect(info.parent).toEqual(master.address);
    expect(info.idx).toEqual(0);
    expect(info.statement!.equalTo("Earth is round")).toBeTrue();
    expect(info.url!.equalTo("https://example.com")).toBeTrue();

    // master doesn't pay for anything (regression: the v1 contract lost 0.1 TON per statement)
    expect(balanceOf(master.address)).toBeGreaterOrEqual(masterBefore - grams("0.001"));
    // the author pays only the reserve plus fees
    val spent = netCost(CREATE_VALUE, authorBefore, balanceOf(author.address));
    expect(spent).toBeGreaterOrEqual(STATEMENT_RESERVE);
    expect(spent).toBeLess(STATEMENT_RESERVE + FEE_TOLERANCE);
    expect(balanceOf(statement.address)).toBeLessOrEqual(STATEMENT_RESERVE);
}

get fun `test does not drain master tips`() {
    val (master, deployer) = setupMaster();
    master.sendAny(deployer.address, createEmptyCell(), { value: grams("5") });
    val before = balanceOf(master.address);

    val author = testing.treasury("author");
    createRoot(master, author.address, data("a"));
    createRoot(master, author.address, data("b"));

    expect(balanceOf(master.address)).toBeGreaterOrEqual(before - grams("0.001"));
    expect(master.statementsCount()).toEqual(2);
}

get fun `test creates pro and con arguments with separate numbering`() {
    val (_, author, root) = setupRoot();
    val parentBefore = balanceOf(root.address);
    val arguer = testing.treasury("arguer");

    val (res0, pro0) = createChild(root, arguer.address, data("pro 0"), true);
    val (res1, pro1) = createChild(root, arguer.address, data("pro 1"), true);
    val (res2, con0) = createChild(root, arguer.address, data("con 0"), false);

    expect(res0).toHaveSuccessfulDeploy({ from: root.address, to: pro0.address });
    expect(res1).toHaveSuccessfulDeploy({ from: root.address, to: pro1.address });
    expect(res2).toHaveSuccessfulDeploy({ from: root.address, to: con0.address });
    expect(root.childCount(true)).toEqual(2);
    expect(root.childCount(false)).toEqual(1);
    expect(pro1.info().statement!.equalTo("pro 1")).toBeTrue();
    expect(con0.info().pro).toBeFalse();
    expect(con0.info().owner).toEqual(arguer.address);
    expect(balanceOf(root.address)).toBeGreaterOrEqual(parentBefore - grams("0.001"));

    // arguments can be argued with too
    val (res3, deep) = createChild(con0, author.address, data("counter to con 0"), false);
    expect(res3).toHaveSuccessfulDeploy({ from: con0.address, to: deep.address });
}

get fun `test rejects creation with not enough value`() {
    val (master, _) = setupMaster();
    val author = testing.treasury("author");

    val res = master.sendNewParentStatement(author.address, data("x"), { value: grams("0.08") });

    expect(res).toHaveFailedTx({
        from: author.address,
        to: master.address,
        exitCode: Errors.NotEnoughValue,
    });
    expect(master.statementsCount()).toEqual(0);
}

get fun `test accepts text up to the limit`() {
    val (master, _) = setupMaster();
    val author = testing.treasury("author");

    val (res500, s500) = createRoot(master, author.address, data(repeatStr("a", 500)));
    expect(res500).toHaveSuccessfulDeploy({ to: s500.address });
    // multi-byte characters are counted in bytes
    val (resUtf8, sUtf8) = createRoot(master, author.address, data(repeatStr("я", 250)));
    expect(resUtf8).toHaveSuccessfulDeploy({ to: sUtf8.address });
    val (resUrl, sUrl) = createRoot(master, author.address, data("x", repeatStr("h", 256)));
    expect(resUrl).toHaveSuccessfulDeploy({ to: sUrl.address });
}

fun expectRejected(master: VftMaster, author: address, d: VftData, exitCode: int) {
    val count = master.statementsCount();
    val res = master.sendNewParentStatement(author, d, { value: CREATE_VALUE });
    expect(res).toHaveFailedTx({ from: author, to: master.address, exitCode });
    expect(master.statementsCount()).toEqual(count);
}

get fun `test rejects invalid text and url`() {
    val (master, _) = setupMaster();
    val author = testing.treasury("author").address;

    expectRejected(master, author, data(""), Errors.EmptyStatement);
    expectRejected(master, author, data(repeatStr("a", 501)), Errors.StatementTooLong);
    expectRejected(master, author, data(repeatStr("я", 251)), Errors.StatementTooLong);
    expectRejected(master, author, data(repeatStr("a", 3000)), 8); // cell overflow
    expectRejected(master, author, data("x", ""), Errors.EmptyUrl);
    expectRejected(master, author, data("x", repeatStr("h", 257)), Errors.UrlTooLong);
}

get fun `test stores the language of the text`() {
    val (master, _) = setupMaster();
    val author = testing.treasury("author");

    val (res, statement) = createRoot(master, author.address, data("English text", null, 0x656E));
    expect(res).toHaveSuccessfulDeploy({ to: statement.address });
    expect(statement.info().lang).toEqual(0x656E); // "en"

    val arguer = testing.treasury("arguer");
    val (_, arg) = createChild(statement, arguer.address, data("Аргумент"), true);
    expect(arg.info().lang).toEqual(RU);

    // the boundaries of the alphabet are valid
    val (resAz, az) = createRoot(master, author.address, data("x", null, 0x617A)); // "az"
    expect(resAz).toHaveSuccessfulDeploy({ to: az.address });
    val (resZa, za) = createRoot(master, author.address, data("x", null, 0x7A61)); // "za"
    expect(resZa).toHaveSuccessfulDeploy({ to: za.address });
}

get fun `test the language is required and is two lowercase latin letters`() {
    val (master, _) = setupMaster();
    val author = testing.treasury("author").address;

    expectRejected(master, author, data("x", null, 0), Errors.InvalidLang);      // not set
    expectRejected(master, author, data("x", null, 0x0072), Errors.InvalidLang); // one letter
    expectRejected(master, author, data("x", null, 0x5255), Errors.InvalidLang); // "RU"
    expectRejected(master, author, data("x", null, 0x7231), Errors.InvalidLang); // "r1"
    expectRejected(master, author, data("x", null, 0x607A), Errors.InvalidLang); // "`z"
    expectRejected(master, author, data("x", null, 0x7B61), Errors.InvalidLang); // "{a"

    // the same for arguments
    val (_, root) = createRoot(master, author, data("root"));
    val res = root.sendNewChildStatement(
        author,
        data("arg", null, 0x5255),
        true,
        { value: CREATE_VALUE },
    );
    expect(res).toHaveFailedTx({ to: root.address, exitCode: Errors.InvalidLang });
}

get fun `test is immutable - data cannot be set by anyone but the parent`() {
    val (_, author, root) = setupRoot();

    val res = root.sendSetStatementData(
        author.address,
        author.address,
        data("changed"),
        { value: grams("0.05") },
    );

    expect(res).toHaveFailedTx({
        from: author.address,
        to: root.address,
        exitCode: Errors.NotParent,
    });
    expect(root.info().statement!.equalTo("root")).toBeTrue();
}

get fun `test rejects plain transfers and unknown comments`() {
    val (_, author, root) = setupRoot();

    val plain = root.sendAny(author.address, createEmptyCell(), { value: grams("1") });
    expect(plain).toHaveFailedTx({ to: root.address, exitCode: Errors.InvalidMessage });

    val comment = root.sendTextComment(
        author.address,
        "hello".literalSlice(),
        { value: grams("1") },
    );
    expect(comment).toHaveFailedTx({ to: root.address, exitCode: Errors.InvalidMessage });
}

get fun `test the author deletes a statement without arguments and gets the reserve back`() {
    val (master, _) = setupMaster();
    val author = testing.treasury("author");
    val (_, root) = createRoot(master, author.address, data("hasty"));
    val voter = testing.treasury("voter");
    val (_, vote) = castVote(root, voter.address, grams("2"), grams("2.1"));
    val voter2 = testing.treasury("voter2");
    val vote2Address = root.voteAddress(voter2.address); // getters are gone after deletion
    val before = balanceOf(author.address);

    val res = root.sendDeleteStatement(author.address, { value: grams("0.05") });

    expect(res).toHaveSuccessfulTx<DeleteStatement>({ from: author.address, to: root.address });
    expect(testing.isDeployed(root.address)).toBeFalse();
    // the reserve comes back to the author
    val received = -netCost(grams("0.05"), before, balanceOf(author.address));
    expect(received).toBeGreater(STATEMENT_RESERVE - FEE_TOLERANCE);
    expect(received).toBeLessOrEqual(STATEMENT_RESERVE);

    // votes live in their own contracts: the voter still takes the money back
    val voterBefore = balanceOf(voter.address);
    vote.sendWithdrawAll(voter.address, { value: grams("0.05") });
    val returned = -netCost(grams("0.05"), voterBefore, balanceOf(voter.address));
    expect(returned).toBeGreater(grams("2") + VOTE_RESERVE - FEE_TOLERANCE);

    // a deleted statement takes no new votes
    root.sendVote(voter2.address, grams("1"), { value: grams("1.1") });
    expect(testing.isDeployed(vote2Address)).toBeFalse();
}

get fun `test a statement with arguments cannot be deleted`() {
    val (master, author, root) = setupRoot();
    val arguer = testing.treasury("arguer");

    val (_, pro) = createChild(root, arguer.address, data("pro"), true);
    val res = root.sendDeleteStatement(author.address, { value: grams("0.05") });
    expect(res).toHaveFailedTx({
        from: author.address,
        to: root.address,
        exitCode: Errors.HasArguments,
    });
    expect(testing.isDeployed(root.address)).toBeTrue();

    // a con argument blocks it too; an argument itself is deletable while unanswered
    val (_, otherRoot) = createRoot(master, author.address, data("other"));
    createChild(otherRoot, arguer.address, data("con"), false);
    val resCon = otherRoot.sendDeleteStatement(author.address, { value: grams("0.05") });
    expect(resCon).toHaveFailedTx({ to: otherRoot.address, exitCode: Errors.HasArguments });

    val resPro = pro.sendDeleteStatement(arguer.address, { value: grams("0.05") });
    expect(resPro).toHaveSuccessfulTx<DeleteStatement>({ to: pro.address });
    expect(testing.isDeployed(pro.address)).toBeFalse();
    // the parent keeps its numbering: the next argument gets a new index
    expect(root.childCount(true)).toEqual(1);
}

get fun `test only the author deletes a statement`() {
    val (_, _, root) = setupRoot();
    val stranger = testing.treasury("stranger");

    val res = root.sendDeleteStatement(stranger.address, { value: grams("0.05") });

    expect(res).toHaveFailedTx({
        from: stranger.address,
        to: root.address,
        exitCode: Errors.NotOwner,
    });
    expect(testing.isDeployed(root.address)).toBeTrue();
}

get fun `test the author replaces and removes the source link, the text stays`() {
    val (master, _) = setupMaster();
    val author = testing.treasury("author");
    val (_, root) = createRoot(master, author.address, data("thesis", "https://blocked.example"));
    val before = balanceOf(author.address);

    val res = root.sendSetUrl(author.address, "https://mirror.example", { value: grams("0.05") });

    expect(res).toHaveSuccessfulTx<SetUrl>({ from: author.address, to: root.address });
    val info = root.info();
    expect(info.url!.equalTo("https://mirror.example")).toBeTrue();
    expect(info.statement!.equalTo("thesis")).toBeTrue();
    // only fees are spent; the reserve stays
    expect(netCost(grams("0.05"), before, balanceOf(author.address))).toBeLess(FEE_TOLERANCE);
    expect(balanceOf(root.address)).toBeLessOrEqual(STATEMENT_RESERVE);

    root.sendSetUrl(author.address, null, { value: grams("0.05") });
    expect(root.info().url == null).toBeTrue();

    // works on statements with arguments too
    val arguer = testing.treasury("arguer");
    createChild(root, arguer.address, data("pro"), true);
    val again = root.sendSetUrl(
        author.address,
        "https://web.archive.org/x",
        { value: grams("0.05") },
    );
    expect(again).toHaveSuccessfulTx<SetUrl>({ to: root.address });
}

get fun `test only the author changes the link and it is validated`() {
    val (_, author, root) = setupRoot();
    val stranger = testing.treasury("stranger");

    val res = root.sendSetUrl(stranger.address, "https://evil.example", { value: grams("0.05") });
    expect(
        res,
    ).toHaveFailedTx({ from: stranger.address, to: root.address, exitCode: Errors.NotOwner });

    val empty = root.sendSetUrl(author.address, "", { value: grams("0.05") });
    expect(empty).toHaveFailedTx({ to: root.address, exitCode: Errors.EmptyUrl });
    val long = root.sendSetUrl(author.address, repeatStr("h", 257), { value: grams("0.05") });
    expect(long).toHaveFailedTx({ to: root.address, exitCode: Errors.UrlTooLong });
    expect(root.info().url == null).toBeTrue();
}

// ---------------------------------------------------------------------------
// Votes
// ---------------------------------------------------------------------------

get fun `test votes in a single transaction and returns the excess`() {
    val (_, _, root) = setupRoot();
    val voter = testing.treasury("voter");
    val before = balanceOf(voter.address);

    val (res, vote) = castVote(root, voter.address, grams("10"), grams("11"));

    expect(res).toHaveSuccessfulDeploy<AddVote>({ from: root.address, to: vote.address });
    expect(vote.amount()).toEqual(grams("10"));
    expect(vote.owner()).toEqual(voter.address);
    expect(vote.statement()).toEqual(root.address);
    expect(balanceOf(vote.address)).toBeGreaterOrEqual(grams("10"));
    expect(balanceOf(vote.address)).toBeLessOrEqual(grams("10") + VOTE_RESERVE);

    val spent = netCost(grams("11"), before, balanceOf(voter.address));
    expect(spent).toBeGreaterOrEqual(grams("10") + VOTE_RESERVE);
    expect(spent).toBeLess(grams("10") + VOTE_RESERVE + FEE_TOLERANCE);
}

get fun `test adds to the same vote contract`() {
    val (_, _, root) = setupRoot();
    val voter = testing.treasury("voter");

    val (_, first) = castVote(root, voter.address, grams("3"), grams("3.1"));
    val (res, second) = castVote(root, voter.address, grams("2"), grams("2.1"));

    expect(second.address).toEqual(first.address);
    expect(res).toHaveSuccessfulTx<AddVote>({ to: second.address, deploy: false });
    expect(second.amount()).toEqual(grams("5"));
}

get fun `test keeps votes of different users separate`() {
    val (_, _, root) = setupRoot();
    val alice = testing.treasury("alice");
    val bob = testing.treasury("bob");

    val (_, a) = castVote(root, alice.address, grams("1"), grams("1.1"));
    val (_, b) = castVote(root, bob.address, grams("2"), grams("2.1"));

    expect(a.address).toNotEqual(b.address);
    expect(a.amount()).toEqual(grams("1"));
    expect(b.amount()).toEqual(grams("2"));
}

get fun `test rejects a zero vote and a vote without gas`() {
    val (_, _, root) = setupRoot();
    val voter = testing.treasury("voter");

    val zero = root.sendVote(voter.address, 0, { value: grams("0.1") });
    expect(zero).toHaveFailedTx({ to: root.address, exitCode: Errors.ZeroAmount });

    val noGas = root.sendVote(voter.address, grams("1"), { value: grams("1.01") });
    expect(noGas).toHaveFailedTx({ to: root.address, exitCode: Errors.NotEnoughValue });

    expect(testing.isDeployed(root.voteAddress(voter.address))).toBeFalse();
}

get fun `test revokes part of the vote`() {
    val (_, _, root) = setupRoot();
    val voter = testing.treasury("voter");
    val (_, vote) = castVote(root, voter.address, grams("5"), grams("5.1"));
    val before = balanceOf(voter.address);

    val res = vote.sendWithdraw(voter.address, grams("2"), { value: grams("0.05") });

    expect(res).toHaveSuccessfulTx({ from: vote.address, to: voter.address });
    expect(vote.amount()).toEqual(grams("3"));
    val received = -netCost(grams("0.05"), before, balanceOf(voter.address));
    expect(received).toBeGreater(grams("2") - FEE_TOLERANCE);
    expect(received).toBeLessOrEqual(grams("2"));
    expect(balanceOf(vote.address)).toBeGreaterOrEqual(grams("3"));
}

get fun `test rejects revoking more than voted or by a stranger`() {
    val (_, _, root) = setupRoot();
    val voter = testing.treasury("voter");
    val stranger = testing.treasury("stranger");
    val (_, vote) = castVote(root, voter.address, grams("5"), grams("5.1"));

    val tooMuch = vote.sendWithdraw(voter.address, grams("6"), { value: grams("0.05") });
    expect(tooMuch).toHaveFailedTx({ to: vote.address, exitCode: Errors.AmountExceedsVote });

    val steal = vote.sendWithdraw(stranger.address, grams("1"), { value: grams("0.05") });
    expect(steal).toHaveFailedTx({ to: vote.address, exitCode: Errors.NotOwner });

    val stealAll = vote.sendWithdrawAll(stranger.address, { value: grams("0.05") });
    expect(stealAll).toHaveFailedTx({ to: vote.address, exitCode: Errors.NotOwner });

    // AddVote can only come from the statement
    val fake = vote.sendAddVote(stranger.address, grams("100"), { value: grams("0.05") });
    expect(fake).toHaveFailedTx({ to: vote.address, exitCode: Errors.NotStatement });

    expect(vote.amount()).toEqual(grams("5"));
}

get fun `test revokes everything, destroys the vote and allows voting again`() {
    val (_, _, root) = setupRoot();
    val voter = testing.treasury("voter");
    val (_, vote) = castVote(root, voter.address, grams("5"), grams("5.1"));
    val before = balanceOf(voter.address);

    vote.sendWithdrawAll(voter.address, { value: grams("0.05") });

    // the stake and the storage reserve come back
    val received = -netCost(grams("0.05"), before, balanceOf(voter.address));
    expect(received).toBeGreater(grams("5") + VOTE_RESERVE - FEE_TOLERANCE);
    expect(received).toBeLessOrEqual(grams("5") + VOTE_RESERVE);
    expect(testing.isDeployed(vote.address)).toBeFalse();

    val (res, again) = castVote(root, voter.address, grams("1"), grams("1.1"));
    expect(again.address).toEqual(vote.address);
    expect(res).toHaveSuccessfulDeploy({ to: vote.address });
    expect(again.amount()).toEqual(grams("1"));
}

// ---------------------------------------------------------------------------
// Donations and master
// ---------------------------------------------------------------------------

get fun `test forwards a donation to the author`() {
    val (_, author, root) = setupRoot();
    val fan = testing.treasury("fan");
    val before = balanceOf(author.address);

    val res = root.sendTextComment(fan.address, DONATE_COMMENT, { value: grams("3") });

    expect(res).toHaveSuccessfulTx({ from: root.address, to: author.address });
    expect(balanceOf(author.address) - before).toBeGreater(grams("3") - FEE_TOLERANCE);
    expect(balanceOf(root.address)).toBeLessOrEqual(STATEMENT_RESERVE);
}

get fun `test keeps the deploy value on master as a storage reserve`() {
    val (master, _) = setupMaster();
    expect(balanceOf(master.address)).toBeGreater(grams("0.04"));
}

get fun `test derives master address from the owner, so the deploy cannot be front-run`() {
    val (master, deployer) = setupMaster();
    val attacker = testing.treasury("attacker");

    val attackers = VftMaster.fromStorage({ owner: attacker.address, statementsCount: 0 });

    expect(attackers.address).toNotEqual(master.address);
    expect(master.owner()).toEqual(deployer.address);
}

get fun `test lets only the owner withdraw master tips`() {
    val (master, deployer) = setupMaster();
    master.sendAny(deployer.address, createEmptyCell(), { value: grams("5") });

    val stranger = testing.treasury("stranger");
    val steal = master.sendWithdraw(stranger.address, grams("1"), { value: grams("0.05") });
    expect(steal).toHaveFailedTx({ to: master.address, exitCode: Errors.NotOwner });

    val before = balanceOf(deployer.address);
    master.sendWithdraw(deployer.address, grams("100"), { value: grams("0.05") });

    expect(-netCost(grams("0.05"), before, balanceOf(deployer.address))).toBeGreater(grams("4.9"));
    expect(balanceOf(master.address)).toBeGreaterOrEqual(MIN_MASTER_TON);
}

// ---------------------------------------------------------------------------
// Boundaries and defensive checks
// ---------------------------------------------------------------------------

get fun `test accepts creation with exactly the minimum value`() {
    val (master, _) = setupMaster();
    val author = testing.treasury("author");
    val address = master.statementAddress(0);

    val res = master.sendNewParentStatement(
        author.address,
        data("x"),
        { value: STATEMENT_RESERVE + CREATE_GAS },
    );

    expect(res).toHaveSuccessfulDeploy({ to: address });
}

get fun `test accepts a vote with exactly amount plus gas`() {
    val (_, _, root) = setupRoot();
    val voter = testing.treasury("voter");

    val (res, vote) = castVote(root, voter.address, grams("1"), grams("1") + VOTE_GAS);

    expect(res).toHaveSuccessfulDeploy({ to: vote.address });
    expect(vote.amount()).toEqual(grams("1"));
}

get fun `test revokes exactly the whole amount and rejects a zero revoke`() {
    val (_, _, root) = setupRoot();
    val voter = testing.treasury("voter");
    val (_, vote) = castVote(root, voter.address, grams("2"), grams("2.1"));

    val zero = vote.sendWithdraw(voter.address, 0, { value: grams("0.05") });
    expect(zero).toHaveFailedTx({ to: vote.address, exitCode: Errors.ZeroAmount });

    val all = vote.sendWithdraw(voter.address, grams("2"), { value: grams("0.05") });
    expect(all).toHaveSuccessfulTx({ from: vote.address, to: voter.address });
    expect(vote.amount()).toEqual(0);
    // a partial revoke keeps the contract (and its storage reserve) alive
    expect(testing.isDeployed(vote.address)).toBeTrue();
}

get fun `test rejects unknown messages to master and vote`() {
    val (master, deployer) = setupMaster();
    val unknown = beginCell().storeUint(0x12345678, 32).endCell();

    val toMaster = master.sendAny(deployer.address, unknown, { value: grams("0.1") });
    expect(toMaster).toHaveFailedTx({ to: master.address, exitCode: Errors.InvalidMessage });

    val author = testing.treasury("author");
    val (_, root) = createRoot(master, author.address, data("root"));
    val voter = testing.treasury("voter");
    val (_, vote) = castVote(root, voter.address, grams("1"), grams("1.1"));

    val plain = vote.sendAny(voter.address, createEmptyCell(), { value: grams("0.1") });
    expect(plain).toHaveFailedTx({ to: vote.address, exitCode: Errors.InvalidMessage });
    val other = vote.sendAny(voter.address, unknown, { value: grams("0.1") });
    expect(other).toHaveFailedTx({ to: vote.address, exitCode: Errors.InvalidMessage });
}

get fun `test rejects a zero withdrawal of master tips`() {
    val (master, deployer) = setupMaster();

    val res = master.sendWithdraw(deployer.address, 0, { value: grams("0.05") });

    expect(res).toHaveFailedTx({ to: master.address, exitCode: Errors.InsufficientBalance });
}

get fun `test cannot be re-initialized even by the parent`() {
    val (master, author, root) = setupRoot();
    val attacker = testing.treasury("attacker");

    // the emulator lets us send "from" any address, including the parent itself
    val res = root.sendSetStatementData(
        master.address,
        attacker.address,
        data("hijacked"),
        { value: grams("0.1") },
    );

    expect(res).toHaveFailedTx({ to: root.address, exitCode: Errors.AlreadyInitialized });
    expect(root.info().owner).toEqual(author.address);
    expect(root.info().statement!.equalTo("root")).toBeTrue();
}

// Sends a message with the canonical "empty" StateInit of a statement,
// i.e. tries to use a statement that its parent never initialized.
fun sendToUninitialized<TBody>(
    master: VftMaster,
    from: address,
    body: TBody,
): (SendResultList, address) {
    val ghost = VftStatement.fromStorage({
        parent: master.address,
        idx: 99,
        pro: true,
        owner: null,
        data: null,
        proCount: 0,
        conCount: 0,
    });
    val outMsg = createMessage({
        bounce: false,
        value: grams("2"),
        dest: { stateInit: ghost.stateInit! },
        body,
    });
    return (net.send(from, outMsg), ghost.address);
}

get fun `test an uninitialized statement cannot be used`() {
    val (master, _) = setupMaster();
    val user = testing.treasury("user");

    val (child, ghost) = sendToUninitialized(
        master,
        user.address,
        NewChildStatement {
            data: data("x"),
            pro: true,
        },
    );
    expect(child).toHaveFailedTx({ to: ghost, exitCode: Errors.NotInitialized });

    val (vote, _) = sendToUninitialized(master, user.address, Vote { amount: grams("1") });
    expect(vote).toHaveFailedTx({ to: ghost, exitCode: Errors.NotInitialized });

    val (donate, _) = sendToUninitialized(
        master,
        user.address,
        TextComment { text: DONATE_COMMENT },
    );
    expect(donate).toHaveFailedTx({ to: ghost, exitCode: Errors.NotInitialized });
}
