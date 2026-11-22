import { toNano } from '@ton/core'
import { VftMaster } from '../wrappers/Vft'
import { NetworkProvider } from '@ton/blueprint'

export async function run(provider: NetworkProvider) {
    const owner = provider.sender().address!
    const vftMaster = provider.open(await VftMaster.fromInit(owner))

    await vftMaster.send(provider.sender(), { value: toNano('0.05') }, null)
    await provider.waitForDeploy(vftMaster.address)

    provider.ui().write(
        `VftMaster deployed at ${vftMaster.address.toString({
            testOnly: provider.network() !== 'mainnet'
        })}, owner ${owner.toString({ testOnly: provider.network() !== 'mainnet' })}`
    )
}
