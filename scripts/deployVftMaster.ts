import { toNano } from 'ton-core';
import { VftMaster } from '../wrappers/VftMaster';
import { NetworkProvider } from '@ton-community/blueprint';

export async function run(provider: NetworkProvider) {
    const vftMaster = provider.open(await VftMaster.fromInit(BigInt(Math.floor(Math.random() * 10000))));

    await vftMaster.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        {
            $$type: 'Deploy',
            queryId: 0n,
        }
    );

    await provider.waitForDeploy(vftMaster.address);

    console.log('ID', await vftMaster.getId());
}
