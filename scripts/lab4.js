import { network } from "hardhat";
import { readFileSync, writeFileSync } from "node:fs";

const { ethers } = await network.create();

function loadArtifact(path) {
    return JSON.parse(readFileSync(path, "utf8"));
}

async function deployFromArtifact(
    artifactPath,
    signer,
    constructorArguments = []
) {
    const artifact = loadArtifact(artifactPath);

    const contractFactory = new ethers.ContractFactory(
        artifact.abi,
        artifact.bytecode,
        signer
    );

    const contract = await contractFactory.deploy(
        ...constructorArguments
    );

    await contract.waitForDeployment();

    return contract;
}

async function main() {
    const [owner] = await ethers.getSigners();

    console.log("Користувач:", owner.address);

    const factoryArtifactPath =
        "node_modules/@uniswap/v2-core/build/UniswapV2Factory.json";

    const wethArtifactPath =
        "node_modules/@uniswap/v2-periphery/build/WETH9.json";

    const routerArtifactPath =
        "node_modules/@uniswap/v2-periphery/build/UniswapV2Router02.json";

    const factory = await deployFromArtifact(
        factoryArtifactPath,
        owner,
        [owner.address]
    );

    const factoryAddress = await factory.getAddress();

    console.log("\nUniswap V2 Factory:", factoryAddress);

    const weth = await deployFromArtifact(
        wethArtifactPath,
        owner
    );

    const wethAddress = await weth.getAddress();

    console.log("WETH:", wethAddress);

    const router = await deployFromArtifact(
        routerArtifactPath,
        owner,
        [factoryAddress, wethAddress]
    );

    const routerAddress = await router.getAddress();

    console.log("Uniswap V2 Router:", routerAddress);

    // 5. Розгортання двох власних ERC-20 токенів
    const tokenA = await ethers.deployContract("AssetToken", [
        "DziubaCoin",
        "DZIK",
        ethers.parseEther("100000"),
    ]);

    await tokenA.waitForDeployment();

    const tokenB = await ethers.deployContract("AssetToken", [
        "MockFiat",
        "MFT",
        ethers.parseEther("100000"),
    ]);

    await tokenB.waitForDeployment();

    const tokenAAddress = await tokenA.getAddress();
    const tokenBAddress = await tokenB.getAddress();

    console.log("\nToken A:", tokenAAddress);
    console.log("Token B:", tokenBAddress);

    const integrator = await ethers.deployContract(
        "DefiIntegrator",
        [routerAddress]
    );

    await integrator.waitForDeployment();

    const integratorAddress =
        await integrator.getAddress();

    console.log("DefiIntegrator:", integratorAddress);

    // 7. Початкова ліквідність
    const amountA = ethers.parseEther("1000");
    const amountB = ethers.parseEther("2000");

    await (
        await tokenA.approve(integratorAddress, amountA)
    ).wait();

    console.log("\nApprove Token A виконано");

    await (
        await tokenB.approve(integratorAddress, amountB)
    ).wait();

    console.log("Approve Token B виконано");

    const liquidityTransaction =
        await integrator.provideLiquidity(
            tokenAAddress,
            tokenBAddress,
            amountA,
            amountB
        );

    const liquidityReceipt =
        await liquidityTransaction.wait();

    console.log("\nЛіквідність додано: 1000 DZIK / 2000 MFT");
    console.log(
        "Хеш транзакції:",
        liquidityReceipt.hash
    );

    const pairAddress = await factory.getPair(
        tokenAAddress,
        tokenBAddress
    );

    console.log("Створений пул:", pairAddress);

    const balanceABefore =
        await tokenA.balanceOf(owner.address);

    const balanceBBefore =
        await tokenB.balanceOf(owner.address);

    console.log("\nБаланс до обміну:");
    console.log(
        "DZIK:",
        ethers.formatEther(balanceABefore)
    );
    console.log(
        "MFT:",
        ethers.formatEther(balanceBBefore)
    );

    const swapAmount = ethers.parseEther("10");

    await (
        await tokenA.approve(
            integratorAddress,
            swapAmount
        )
    ).wait();

    console.log("\nApprove Token A для swap виконано");

    const swapTransaction =
        await integrator.swapTokens(
            tokenAAddress,
            tokenBAddress,
            swapAmount,
            1n
        );

    const swapReceipt =
        await swapTransaction.wait();

    console.log("Обмін 10 DZIk на MFT виконано");
    console.log(
        "Хеш транзакції:",
        swapReceipt.hash
    );

    const balanceAAfter =
        await tokenA.balanceOf(owner.address);

    const balanceBAfter =
        await tokenB.balanceOf(owner.address);

    console.log("\nБаланс після обміну:");
    console.log(
        "DZIK:",
        ethers.formatEther(balanceAAfter)
    );
    console.log(
        "MFT:",
        ethers.formatEther(balanceBAfter)
    );

    console.log(
        "Отримано MFT:",
        ethers.formatEther(
            balanceBAfter - balanceBBefore
        )
    );

    const deployment = {
        owner: owner.address,
        uniswapFactory: factoryAddress,
        weth: wethAddress,
        uniswapRouter: routerAddress,
        tokenA: tokenAAddress,
        tokenB: tokenBAddress,
        defiIntegrator: integratorAddress,
        liquidityPool: pairAddress,
        liquidityTransaction: liquidityReceipt.hash,
        swapTransaction: swapReceipt.hash,
    };

    writeFileSync(
        "deployment-lab4.json",
        JSON.stringify(deployment, null, 2)
    );

    console.log(
        "\nРезультати записано у deployment-lab4.json"
    );
    console.log("Лабораторну операцію завершено");
}

main().catch((error) => {
    console.error("\nПомилка:", error);
    process.exitCode = 1;
});