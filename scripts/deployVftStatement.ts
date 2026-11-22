import { toNano } from '@ton/core'
import { NetworkProvider } from '@ton/blueprint'
import { openMaster } from '../utils/master'

// args: <statement text> [url]
export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui()
    const vftMaster = await openMaster(provider)

    const idx = await vftMaster.getStatementsCount()
    const address = await vftMaster.getStatementAddress(idx)

    const statement = args[0] ?? (await ui.input('Your statement'))
    const url = (args[1] ?? (await ui.input('Url (empty for none)'))) || null

    await vftMaster.send(
        provider.sender(),
        { value: toNano('0.15') },
        { $$type: 'NewParentStatement', data: { $$type: 'VftData', statement, url } }
    )
    await provider.waitForDeploy(address)

    ui.write(`Statement #${idx} created at ${address.toString({ testOnly: provider.network() !== 'mainnet' })}`)
}
