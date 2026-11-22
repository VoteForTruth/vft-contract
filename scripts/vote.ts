import { Address, toNano } from '@ton/core'
import { NetworkProvider } from '@ton/blueprint'
import { VftStatement } from '../build/Vft/tact_VftStatement'
import { VftVote } from '../build/Vft/tact_VftVote'

// Vote for a statement with money (or add to an existing vote).
// args: <statement address> <amount in TON>
export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui()

    const statement = provider.open(
        VftStatement.fromAddress(Address.parse(args[0] ?? (await ui.input('Statement address'))))
    )
    const amount = toNano(args[1] ?? (await ui.input('Amount, TON')))

    await statement.send(provider.sender(), { value: amount + toNano('0.1') }, { $$type: 'Vote', amount })

    const vote = provider.open(VftVote.fromAddress(await statement.getVoteAddress(provider.sender().address!)))
    await provider.waitForDeploy(vote.address)
    ui.write(
        `Vote ${vote.address.toString({
            testOnly: provider.network() !== 'mainnet'
        })}, amount now: ${await vote.getAmount()} nanoTON`
    )
}
