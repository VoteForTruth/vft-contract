// Read-only dump of the VFT tree on testnet.
// Usage: npx ts-node utils/inspect.ts <master address> [voter address]
import { Address, fromNano } from '@ton/core'
import { TonClient } from '@ton/ton'
import { VftMaster } from '../build/Vft/tact_VftMaster'
import { VftStatement } from '../build/Vft/tact_VftStatement'
import { VftVote } from '../build/Vft/tact_VftVote'

const client = new TonClient({ endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC' })
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// toncenter without an API key allows ~1 request per second
async function call<T>(f: () => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
        await sleep(1100)
        try {
            return await f()
        } catch (e) {
            if (attempt >= 4) throw e
        }
    }
}

async function dumpStatement(address: Address, depth: number, voter?: Address) {
    const pad = '  '.repeat(depth)
    const s = client.open(VftStatement.fromAddress(address))
    const info = await call(() => s.getInfo())
    const balance = await call(() => client.getBalance(address))
    console.log(`${pad}[${info.pro ? 'PRO' : 'CON'} #${info.idx}] "${info.statement}" ${info.url ?? ''}`)
    console.log(`${pad}  ${address}  balance ${fromNano(balance)}  author ${info.owner}`)
    if (voter) {
        const voteAddress = await call(() => s.getVoteAddress(voter))
        const deployed = await call(() => client.isContractDeployed(voteAddress))
        const amount = deployed
            ? fromNano(await call(() => client.open(VftVote.fromAddress(voteAddress)).getAmount()))
            : '-'
        console.log(
            `${pad}  vote of ${voter}: ${amount}${
                deployed ? ` (balance ${fromNano(await call(() => client.getBalance(voteAddress)))})` : ' (no contract)'
            }`
        )
    }
    for (const pro of [true, false]) {
        const count = pro ? info.proCount : info.conCount
        for (let i = 0n; i < count; i++) {
            await dumpStatement(await call(() => s.getChildAddress(i, pro)), depth + 1, voter)
        }
    }
}

async function main() {
    const [masterArg, voterArg] = process.argv.slice(2)
    if (!masterArg) throw new Error('Usage: inspect.ts <master address> [voter address]')
    const master = client.open(VftMaster.fromAddress(Address.parse(masterArg)))
    const voter = voterArg ? Address.parse(voterArg) : undefined

    const count = await call(() => master.getStatementsCount())
    console.log(
        `Master ${master.address}  owner ${await call(() => master.getOwner())}  balance ${fromNano(
            await call(() => client.getBalance(master.address))
        )}  statements ${count}`
    )
    for (let i = 0n; i < count; i++) {
        await dumpStatement(await call(() => master.getStatementAddress(i)), 1, voter)
    }
}

main().catch((e) => {
    console.error(e)
    process.exit(1)
})
