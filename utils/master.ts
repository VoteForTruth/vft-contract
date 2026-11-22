import { Address } from '@ton/core'
import { NetworkProvider } from '@ton/blueprint'
import { VftMaster } from '../wrappers/Vft'

// Master address: MASTER_ADDRESS env var, or the master owned by the current sender.
export async function openMaster(provider: NetworkProvider) {
    const fromEnv = process.env.MASTER_ADDRESS
    const contract = fromEnv
        ? VftMaster.fromAddress(Address.parse(fromEnv))
        : await VftMaster.fromInit(provider.sender().address!)
    provider.ui().write(`VftMaster address: ${contract.address}`)
    return provider.open(contract)
}
