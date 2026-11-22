import { Address, toNano } from '@ton/core'
import { NetworkProvider } from '@ton/blueprint'
import { VftStatement } from '../build/Vft/tact_VftStatement'
import { VftVote } from '../build/Vft/tact_VftVote'

// Revoke a vote fully or partially.
// args: <statement address> <amount in TON | all>
export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui()

    const statement = provider.open(
        VftStatement.fromAddress(Address.parse(args[0] ?? (await ui.input('Statement address'))))
    )
    const vote = provider.open(VftVote.fromAddress(await statement.getVoteAddress(provider.sender().address!)))
    const amount = args[1] ?? (await ui.input('Amount, TON (or "all")'))

    if (amount === 'all') {
        await vote.send(provider.sender(), { value: toNano('0.05') }, 'withdraw all')
        ui.write(`Requested to revoke the whole vote ${vote.address}`)
    } else {
        await vote.send(provider.sender(), { value: toNano('0.05') }, { $$type: 'Withdraw', amount: toNano(amount) })
        ui.write(`Requested to revoke ${amount} TON from vote ${vote.address}`)
    }
}
