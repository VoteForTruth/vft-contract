import { Blockchain, SandboxContract } from '@ton-community/sandbox';
import { toNano } from 'ton-core';
import { VftData, VftMaster } from '../wrappers/Vft';
import '@ton-community/test-utils';
import { VftStatement } from '../build/Vft/tact_VftStatement';

const statementDeployTons = toNano('0.2');
const voteDeployTons = toNano('0.03');

async function deployStatement(blockchain: Blockchain, vftMaster: SandboxContract<VftMaster>, data: VftData) {
    expect(await vftMaster.getStatementsCount()).toEqual(0n);

    const statementAddress = await vftMaster.getStatementAddress(0n);
    const statementOwner = await blockchain.treasury('statementOwner');

    const deployResult = await vftMaster.send(
        statementOwner.getSender(),
        { value: statementDeployTons },
        {
            $$type: 'NewParentStatement' as const,
            data
        }
    );

    expect(deployResult.transactions).toHaveTransaction({
        from: vftMaster.address,
        to: statementAddress,
        deploy: true,
        success: true
    });

    const statementContract = VftStatement.fromAddress(statementAddress);
    return blockchain.openContract(statementContract);
}

describe('Vft', () => {
    let blockchain: Blockchain;
    let vftMaster: SandboxContract<VftMaster>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        vftMaster = blockchain.openContract(await VftMaster.fromInit());

        const deployer = await blockchain.treasury('deployer');

        const deployResult = await vftMaster.send(
            deployer.getSender(),
            { value: toNano('0.02') },
            {
                $$type: 'Deploy',
                queryId: 0n
            }
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: vftMaster.address,
            deploy: true,
            success: true
        });
    });

    it('should deploy master', async () => {
        // the check is done inside beforeEach
        // blockchain and vftMaster are ready to use
    });

    it('should deploy statement', async () => {
        const data = { $$type: 'VftData' as const, statement: 'test statement', url: null };

        const vftStatement = await deployStatement(blockchain, vftMaster, data);

        expect(await vftStatement.getData()).toEqual(data);
    });

    it('should deploy arguments', async () => {
        const data = { $$type: 'VftData' as const, statement: 'parent statement', url: null };
        const vftStatement = await deployStatement(blockchain, vftMaster, data);

        expect(await vftStatement.getProStatementsCount()).toEqual(0n);

        const proArgumentAddress = await vftStatement.getProStatementAddress(0n);

        const proArgumentOwner = await blockchain.treasury('proArgumentOwner');
        const proArgumentData = { $$type: 'VftData' as const, statement: 'true argument', url: null };
        let deployResult = await vftStatement.send(
            proArgumentOwner.getSender(),
            { value: statementDeployTons },
            {
                $$type: 'NewChildStatement' as const,
                data: proArgumentData,
                pro: true
            }
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: vftStatement.address,
            to: proArgumentAddress,
            deploy: true,
            success: true
        });

        const proArgumentContract = VftStatement.fromAddress(proArgumentAddress);
        const proVftArgument = blockchain.openContract(proArgumentContract);

        expect(await proVftArgument.getData()).toEqual(proArgumentData);

        expect(await vftStatement.getConStatementsCount()).toEqual(0n);

        const conArgumentAddress = await vftStatement.getConStatementAddress(0n);

        const conArgumentOwner = await blockchain.treasury('conArgumentOwner');
        const conArgumentData = { $$type: 'VftData' as const, statement: 'false argument', url: null };
        deployResult = await vftStatement.send(
            conArgumentOwner.getSender(),
            { value: statementDeployTons },
            {
                $$type: 'NewChildStatement' as const,
                data: conArgumentData,
                pro: false
            }
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: vftStatement.address,
            to: conArgumentAddress,
            deploy: true,
            success: true
        });

        const conArgumentContract = VftStatement.fromAddress(conArgumentAddress);
        const conVftArgument = blockchain.openContract(conArgumentContract);

        expect(await conVftArgument.getData()).toEqual(conArgumentData);
    });

    it('should deploy vote', async () => {
        const data = { $$type: 'VftData' as const, statement: 'test statement', url: null };
        const vftStatement = await deployStatement(blockchain, vftMaster, data);

        expect(await vftStatement.getVotesCount()).toEqual(0n);

        const voteAddress = await vftStatement.getVoteAddress(0n);

        const voteOwner = await blockchain.treasury('voteOwner');
        let deployResult = await vftStatement.send(
            voteOwner.getSender(),
            { value: voteDeployTons },
            'vote'
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: vftStatement.address,
            to: voteAddress,
            deploy: true,
            success: true
        });
    });
});
