import { toNano } from 'ton-core';
import { VftMaster } from '../wrappers/Vft';
import { NetworkProvider } from '@ton-community/blueprint';

export async function run(provider: NetworkProvider) {
    const vftMaster = provider.open(await VftMaster.fromInit());

    await vftMaster.send(
        provider.sender(),
        {
            value: toNano('0.03'),
        },
        {
            $$type: 'Deploy',
            queryId: 0n,
        }
    );

    await provider.waitForDeploy(vftMaster.address);

    console.log('Master balance', await vftMaster.getBalance());
}
