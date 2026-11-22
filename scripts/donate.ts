import { Address, toNano } from '@ton/core'
import { NetworkProvider } from '@ton/blueprint'
import { VftStatement } from '../build/Vft/tact_VftStatement'

// args: <statement address> <amount in TON>
export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui()

    const statement = provider.open(
        VftStatement.fromAddress(Address.parse(args[0] ?? (await ui.input('Statement address'))))
    )
    const amount = toNano(args[1] ?? (await ui.input('Amount, TON')))

    await statement.send(provider.sender(), { value: amount }, 'donate')
    ui.write(`Donated to the author of ${statement.address}`)
}
