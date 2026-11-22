import { Address } from '@ton/core'
import { NetworkProvider } from '@ton/blueprint'
import { VftStatement } from '../build/Vft/tact_VftStatement'

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui()

    const address = Address.parse(args.length > 0 ? args[0] : await ui.input('VftStatement address'))

    if (!(await provider.isContractDeployed(address))) {
        ui.write(`Error: Contract at address ${address} is not deployed!`)
        return
    }

    const vftStatement = provider.open(VftStatement.fromAddress(address))

    const info = await vftStatement.getInfo()

    ui.write(`Statement: "${info.statement}" ${info.url ?? ''} (pro: ${info.proCount}, con: ${info.conCount})`)
}
