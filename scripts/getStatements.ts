import { VftMaster } from '../wrappers/Vft'
import { NetworkProvider } from '@ton-community/blueprint'
import { VftStatement } from '../build/Vft/tact_VftStatement'

export async function run(provider: NetworkProvider) {
    const ui = provider.ui()

    const contract = await VftMaster.fromInit()

    ui.write(`VftMaster address: ${contract.address}`)

    const vftMaster = provider.open(contract)

    const statementsCount = await vftMaster.getStatementsCount()

    ui.write(`Current statements count: ${statementsCount}`)

    let idx = 0
    while (idx < statementsCount) {
        const statementAddress = await vftMaster.getStatementAddress(BigInt(idx))

        const vftStatement = provider.open(VftStatement.fromAddress(statementAddress))

        const data = await vftStatement.getData()

        ui.write(`Statement ${idx} data: ${JSON.stringify(data)}`)

        ++idx
    }
}
