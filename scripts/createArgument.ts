import { Address, toNano } from '@ton/core'
import { NetworkProvider } from '@ton/blueprint'
import { VftStatement } from '../build/Vft/tact_VftStatement'

// args: <parent statement address> <pro|con> <text> [url]
export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui()

    const parent = provider.open(
        VftStatement.fromAddress(Address.parse(args[0] ?? (await ui.input('Parent statement address'))))
    )
    const pro = (args[1] ?? (await ui.choose('Side', ['pro', 'con'], (s) => s))) === 'pro'
    const statement = args[2] ?? (await ui.input('Argument text'))
    const url = (args[3] ?? (await ui.input('Url (empty for none)'))) || null

    const idx = await parent.getChildCount(pro)
    const address = await parent.getChildAddress(idx, pro)

    await parent.send(
        provider.sender(),
        { value: toNano('0.15') },
        { $$type: 'NewChildStatement', data: { $$type: 'VftData', statement, url }, pro }
    )
    await provider.waitForDeploy(address)

    ui.write(
        `${pro ? 'Pro' : 'Con'} argument #${idx} created at ${address.toString({
            testOnly: provider.network() !== 'mainnet'
        })}`
    )
}
