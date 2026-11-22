import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox'
import { Address, toNano } from '@ton/core'
import '@ton/test-utils'
import { VftMaster } from '../build/Vft/tact_VftMaster'
import { VftData, VftStatement } from '../build/Vft/tact_VftStatement'
import { VftVote } from '../build/Vft/tact_VftVote'

const CREATE_VALUE = toNano('0.15') // what a user sends to create a statement
const STATEMENT_RESERVE = toNano('0.05')
const VOTE_RESERVE = toNano('0.01')
const FEE_TOLERANCE = toNano('0.02') // upper bound for network fees in a flow

const data = (statement: string, url: string | null = null): VftData => ({ $$type: 'VftData', statement, url })

describe('Vft', () => {
    let blockchain: Blockchain
    let deployer: SandboxContract<TreasuryContract>
    let master: SandboxContract<VftMaster>

    const balanceOf = async (address: Address) => (await blockchain.getContract(address)).balance

    async function createRoot(author: SandboxContract<TreasuryContract>, d: VftData) {
        const idx = await master.getStatementsCount()
        const address = await master.getStatementAddress(idx)
        const result = await master.send(
            author.getSender(),
            { value: CREATE_VALUE },
            { $$type: 'NewParentStatement', data: d }
        )
        return { result, statement: blockchain.openContract(VftStatement.fromAddress(address)) }
    }

    async function createChild(
        parent: SandboxContract<VftStatement>,
        author: SandboxContract<TreasuryContract>,
        d: VftData,
        pro: boolean
    ) {
        const idx = await parent.getChildCount(pro)
        const address = await parent.getChildAddress(idx, pro)
        const result = await parent.send(
            author.getSender(),
            { value: CREATE_VALUE },
            { $$type: 'NewChildStatement', data: d, pro }
        )
        return { result, statement: blockchain.openContract(VftStatement.fromAddress(address)) }
    }

    async function castVote(
        statement: SandboxContract<VftStatement>,
        voter: SandboxContract<TreasuryContract>,
        amount: bigint,
        value = amount + toNano('0.1')
    ) {
        const result = await statement.send(voter.getSender(), { value }, { $$type: 'Vote', amount })
        const vote = blockchain.openContract(VftVote.fromAddress(await statement.getVoteAddress(voter.address)))
        return { result, vote }
    }

    beforeEach(async () => {
        blockchain = await Blockchain.create()
        deployer = await blockchain.treasury('deployer')
        master = blockchain.openContract(await VftMaster.fromInit(deployer.address))
        const result = await master.send(deployer.getSender(), { value: toNano('0.05') }, null)
        expect(result.transactions).toHaveTransaction({
            from: deployer.address,
            to: master.address,
            deploy: true,
            success: true
        })
    })

    describe('statements', () => {
        it('creates a root statement and refunds the change to the author', async () => {
            const author = await blockchain.treasury('author')
            const masterBefore = await balanceOf(master.address)
            const authorBefore = await author.getBalance()

            const { result, statement } = await createRoot(author, data('Earth is round', 'https://example.com'))

            expect(result.transactions).toHaveTransaction({
                from: master.address,
                to: statement.address,
                deploy: true,
                success: true
            })
            expect(result.transactions).toHaveTransaction({
                from: statement.address,
                to: author.address,
                success: true
            })
            expect(await master.getStatementsCount()).toEqual(1n)

            const info = await statement.getInfo()
            expect(info.owner?.equals(author.address)).toBe(true)
            expect(info.parent.equals(master.address)).toBe(true)
            expect(info.idx).toEqual(0n)
            expect(info.statement).toEqual('Earth is round')
            expect(info.url).toEqual('https://example.com')

            // master doesn't pay for anything (regression: it used to lose 0.1 TON per statement)
            expect(await balanceOf(master.address)).toBeGreaterThanOrEqual(masterBefore - toNano('0.001'))
            // author pays only the reserve plus fees
            const spent = authorBefore - (await author.getBalance())
            expect(spent).toBeGreaterThanOrEqual(STATEMENT_RESERVE)
            expect(spent).toBeLessThan(STATEMENT_RESERVE + FEE_TOLERANCE)
            expect(await balanceOf(statement.address)).toBeLessThanOrEqual(STATEMENT_RESERVE)
        })

        it('does not drain master tips', async () => {
            await master.send(deployer.getSender(), { value: toNano('5') }, null)
            const before = await balanceOf(master.address)
            const author = await blockchain.treasury('author')
            await createRoot(author, data('a'))
            await createRoot(author, data('b'))
            expect(await balanceOf(master.address)).toBeGreaterThanOrEqual(before - toNano('0.001'))
            expect(await master.getStatementsCount()).toEqual(2n)
        })

        it('creates pro and con arguments with separate numbering', async () => {
            const author = await blockchain.treasury('author')
            const { statement: root } = await createRoot(author, data('root'))
            const parentBefore = await balanceOf(root.address)

            const arguer = await blockchain.treasury('arguer')
            const pro0 = await createChild(root, arguer, data('pro 0'), true)
            const pro1 = await createChild(root, arguer, data('pro 1'), true)
            const con0 = await createChild(root, arguer, data('con 0'), false)

            for (const c of [pro0, pro1, con0]) {
                expect(c.result.transactions).toHaveTransaction({
                    from: root.address,
                    to: c.statement.address,
                    deploy: true,
                    success: true
                })
            }
            expect(await root.getChildCount(true)).toEqual(2n)
            expect(await root.getChildCount(false)).toEqual(1n)
            expect((await pro1.statement.getInfo()).statement).toEqual('pro 1')
            expect((await con0.statement.getInfo()).pro).toBe(false)
            expect((await con0.statement.getInfo()).owner?.equals(arguer.address)).toBe(true)
            expect(await balanceOf(root.address)).toBeGreaterThanOrEqual(parentBefore - toNano('0.001'))

            // arguments can be argued with too
            const deep = await createChild(con0.statement, author, data('counter to con 0'), false)
            expect(deep.result.transactions).toHaveTransaction({
                to: deep.statement.address,
                deploy: true,
                success: true
            })
        })

        it('rejects creation with not enough value', async () => {
            const author = await blockchain.treasury('author')
            const result = await master.send(
                author.getSender(),
                { value: toNano('0.08') },
                { $$type: 'NewParentStatement', data: data('x') }
            )
            expect(result.transactions).toHaveTransaction({ from: author.address, to: master.address, success: false })
            expect(await master.getStatementsCount()).toEqual(0n)
        })

        it('validates text and url size', async () => {
            const author = await blockchain.treasury('author')
            const ok500 = await createRoot(author, data('a'.repeat(500)))
            expect(ok500.result.transactions).toHaveTransaction({
                to: ok500.statement.address,
                deploy: true,
                success: true
            })
            // multi-byte characters are counted in bytes
            const okUtf8 = await createRoot(author, data('я'.repeat(250)))
            expect(okUtf8.result.transactions).toHaveTransaction({
                to: okUtf8.statement.address,
                deploy: true,
                success: true
            })

            const bad: VftData[] = [
                data(''),
                data('a'.repeat(501)),
                data('я'.repeat(251)),
                data('a'.repeat(3000)),
                data('x', ''),
                data('x', 'h'.repeat(257))
            ]
            for (const d of bad) {
                const count = await master.getStatementsCount()
                const result = await master.send(
                    author.getSender(),
                    { value: CREATE_VALUE },
                    { $$type: 'NewParentStatement', data: d }
                )
                expect(result.transactions).toHaveTransaction({
                    from: author.address,
                    to: master.address,
                    success: false
                })
                expect(await master.getStatementsCount()).toEqual(count)
            }
        })

        it('is immutable: data cannot be set by anyone but the parent', async () => {
            const author = await blockchain.treasury('author')
            const { statement } = await createRoot(author, data('original'))
            const result = await statement.send(
                author.getSender(),
                { value: toNano('0.05') },
                { $$type: 'SetStatementData', owner: author.address, data: data('changed') }
            )
            expect(result.transactions).toHaveTransaction({
                from: author.address,
                to: statement.address,
                success: false
            })
            expect((await statement.getInfo()).statement).toEqual('original')
        })
    })

    describe('votes', () => {
        let statement: SandboxContract<VftStatement>
        let voter: SandboxContract<TreasuryContract>

        beforeEach(async () => {
            const author = await blockchain.treasury('author')
            statement = (await createRoot(author, data('root'))).statement
            voter = await blockchain.treasury('voter')
        })

        it('votes in a single transaction and returns the excess', async () => {
            const before = await voter.getBalance()
            const { result, vote } = await castVote(statement, voter, toNano('10'), toNano('11'))

            expect(result.transactions).toHaveTransaction({
                from: statement.address,
                to: vote.address,
                deploy: true,
                success: true
            })
            expect(await vote.getAmount()).toEqual(toNano('10'))
            expect((await vote.getOwner()).equals(voter.address)).toBe(true)
            expect(await balanceOf(vote.address)).toBeGreaterThanOrEqual(toNano('10'))
            expect(await balanceOf(vote.address)).toBeLessThanOrEqual(toNano('10') + VOTE_RESERVE)

            const spent = before - (await voter.getBalance())
            expect(spent).toBeLessThan(toNano('10') + VOTE_RESERVE + FEE_TOLERANCE)
        })

        it('adds to the same vote contract', async () => {
            const first = await castVote(statement, voter, toNano('3'))
            const second = await castVote(statement, voter, toNano('2'))
            expect(second.vote.address.equals(first.vote.address)).toBe(true)
            expect(second.result.transactions).toHaveTransaction({
                to: second.vote.address,
                deploy: false,
                success: true
            })
            expect(await second.vote.getAmount()).toEqual(toNano('5'))
        })

        it('keeps votes of different users separate', async () => {
            const other = await blockchain.treasury('other')
            const a = await castVote(statement, voter, toNano('1'))
            const b = await castVote(statement, other, toNano('2'))
            expect(a.vote.address.equals(b.vote.address)).toBe(false)
            expect(await a.vote.getAmount()).toEqual(toNano('1'))
            expect(await b.vote.getAmount()).toEqual(toNano('2'))
        })

        it('rejects a zero vote and a vote without gas', async () => {
            const zero = await statement.send(
                voter.getSender(),
                { value: toNano('0.1') },
                { $$type: 'Vote', amount: 0n }
            )
            expect(zero.transactions).toHaveTransaction({ to: statement.address, success: false })

            const noGas = await statement.send(
                voter.getSender(),
                { value: toNano('1.01') },
                { $$type: 'Vote', amount: toNano('1') }
            )
            expect(noGas.transactions).toHaveTransaction({ to: statement.address, success: false })
            expect(
                (await blockchain.getContract(await statement.getVoteAddress(voter.address))).accountState?.type
            ).not.toEqual('active')
        })

        it('revokes part of the vote', async () => {
            const { vote } = await castVote(statement, voter, toNano('5'))
            const before = await voter.getBalance()

            const result = await vote.send(
                voter.getSender(),
                { value: toNano('0.05') },
                { $$type: 'Withdraw', amount: toNano('2') }
            )

            expect(result.transactions).toHaveTransaction({ from: vote.address, to: voter.address, success: true })
            expect(await vote.getAmount()).toEqual(toNano('3'))
            const received = (await voter.getBalance()) - before
            expect(received).toBeGreaterThan(toNano('2') - FEE_TOLERANCE)
            expect(received).toBeLessThanOrEqual(toNano('2'))
            expect(await balanceOf(vote.address)).toBeGreaterThanOrEqual(toNano('3'))
        })

        it('rejects revoking more than voted or by a stranger', async () => {
            const { vote } = await castVote(statement, voter, toNano('5'))
            const tooMuch = await vote.send(
                voter.getSender(),
                { value: toNano('0.05') },
                { $$type: 'Withdraw', amount: toNano('6') }
            )
            expect(tooMuch.transactions).toHaveTransaction({ to: vote.address, success: false })

            const stranger = await blockchain.treasury('stranger')
            const steal = await vote.send(
                stranger.getSender(),
                { value: toNano('0.05') },
                { $$type: 'Withdraw', amount: toNano('1') }
            )
            expect(steal.transactions).toHaveTransaction({ to: vote.address, success: false })
            const stealAll = await vote.send(stranger.getSender(), { value: toNano('0.05') }, 'withdraw all')
            expect(stealAll.transactions).toHaveTransaction({ to: vote.address, success: false })

            expect(await vote.getAmount()).toEqual(toNano('5'))
        })

        it('revokes everything, destroys the vote and allows voting again', async () => {
            const { vote } = await castVote(statement, voter, toNano('5'))
            const before = await voter.getBalance()

            await vote.send(voter.getSender(), { value: toNano('0.05') }, 'withdraw all')

            const received = (await voter.getBalance()) - before
            expect(received).toBeGreaterThan(toNano('5') - FEE_TOLERANCE)
            expect((await blockchain.getContract(vote.address)).accountState?.type).not.toEqual('active')

            const again = await castVote(statement, voter, toNano('1'))
            expect(again.result.transactions).toHaveTransaction({ to: vote.address, deploy: true, success: true })
            expect(await again.vote.getAmount()).toEqual(toNano('1'))
        })
    })

    describe('donations and tips', () => {
        it('forwards a donation to the author', async () => {
            const author = await blockchain.treasury('author')
            const { statement } = await createRoot(author, data('root'))
            const fan = await blockchain.treasury('fan')
            const before = await author.getBalance()

            const result = await statement.send(fan.getSender(), { value: toNano('3') }, 'donate')

            expect(result.transactions).toHaveTransaction({
                from: statement.address,
                to: author.address,
                success: true
            })
            expect((await author.getBalance()) - before).toBeGreaterThan(toNano('3') - FEE_TOLERANCE)
            expect(await balanceOf(statement.address)).toBeLessThanOrEqual(STATEMENT_RESERVE)
        })

        it('keeps the deploy value on master as a storage reserve', async () => {
            expect(await balanceOf(master.address)).toBeGreaterThan(toNano('0.04'))
        })

        it('derives master address from the owner, so the deploy cannot be front-run', async () => {
            const attacker = await blockchain.treasury('attacker')
            const attackersMaster = await VftMaster.fromInit(attacker.address)
            expect(attackersMaster.address.equals(master.address)).toBe(false)
            expect((await master.getOwner()).equals(deployer.address)).toBe(true)
        })

        it('lets only the owner withdraw master tips', async () => {
            await master.send(deployer.getSender(), { value: toNano('5') }, null)

            const stranger = await blockchain.treasury('stranger')
            const steal = await master.send(
                stranger.getSender(),
                { value: toNano('0.05') },
                { $$type: 'Withdraw', amount: toNano('1') }
            )
            expect(steal.transactions).toHaveTransaction({ to: master.address, success: false })

            const before = await deployer.getBalance()
            await master.send(
                deployer.getSender(),
                { value: toNano('0.05') },
                { $$type: 'Withdraw', amount: toNano('100') }
            )
            expect((await deployer.getBalance()) - before).toBeGreaterThan(toNano('4.9'))
            expect(await balanceOf(master.address)).toBeGreaterThanOrEqual(toNano('0.02'))
        })
    })
})
