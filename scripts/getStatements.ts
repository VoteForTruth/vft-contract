import { openMaster } from '../utils/master'
import { NetworkProvider } from '@ton/blueprint'
import { VftStatement } from '../build/Vft/tact_VftStatement'

export async function run(provider: NetworkProvider) {
    const ui = provider.ui()

    const vftMaster = await openMaster(provider)

    const statementsCount = await vftMaster.getStatementsCount()

    ui.write(`Current statements count: ${statementsCount}`)

    let idx = 0
    while (idx < statementsCount) {
        const statementAddress = await vftMaster.getStatementAddress(BigInt(idx))

        const vftStatement = provider.open(VftStatement.fromAddress(statementAddress))

        const info = await vftStatement.getInfo()

        ui.write(
            `Statement ${idx}: "${info.statement}" ${info.url ?? ''} (pro: ${info.proCount}, con: ${info.conCount})`
        )

        ++idx
    }
}
