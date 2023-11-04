import { toNano } from 'ton-core';
import { VftMaster } from '../wrappers/Vft';
import { NetworkProvider } from '@ton-community/blueprint';

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    const vftMaster = provider.open(await VftMaster.fromInit());

    const counterBefore = await vftMaster.getStatementsCount();

    ui.write(`Current statements count: ${counterBefore}`);

    const newStatementAddress = await vftMaster.getStatementAddress(counterBefore);

    const statement = args.length > 0 ? args[0] : await ui.input('Your statement');

    const data = { $$type: 'VftData' as const, statement, url: null };
    await vftMaster.send(
        provider.sender(),
        { value: toNano('0.2') },
        {
            $$type: 'NewParentStatement' as const,
            data
        }
    );

    await provider.waitForDeploy(newStatementAddress);

    let counterAfter = await vftMaster.getStatementsCount();

    ui.write(`Current statements count: ${counterAfter}`);
}
