import { network } from "hardhat";

async function main() {
    const { ethers } = await network.create();
    const [deployer, trader] = await ethers.getSigners();

    console.log("--- 1. Емісія токенів (студентський актив та фіат) ---");
    const Token = await ethers.getContractFactory("AssetToken");

    const tokenA = await Token.deploy("StudentToken", "STK", 1000000);
    const tokenB = await Token.deploy("MockFiat", "UAHc", 1000000);

    const addressA = await tokenA.getAddress();
    const addressB = await tokenB.getAddress();

    console.log(`Токен A (STK) створено: ${addressA}`);
    console.log(`Токен B (UAHc) створено: ${addressB}`);

    console.log("\n--- 2. Розгортання пулу ліквідності ---");
    const DexPool = await ethers.getContractFactory("DexPool");
    const pool = await DexPool.deploy(addressA, addressB);
    const poolAddress = await pool.getAddress();
    console.log(`Пул розгорнуто за адресою: ${poolAddress}`);

    console.log("\n--- 3. Схвалення (Approve) для пулу ---");
    await tokenA.approve(poolAddress, ethers.parseEther("100000"));
    await tokenB.approve(poolAddress, ethers.parseEther("100000"));
    console.log("Дозвіл на використання 100 000 токенів успішно надано пулу");

    console.log("\n--- 4. Додавання ліквідності у пропорції 1:2 ---");
    const liqA = ethers.parseEther("1000");
    const liqB = ethers.parseEther("2000");
    await pool.addLiquidity(liqA, liqB);
    console.log("Ліквідність успішно додана: 1000 STK та 2000 UAHc");

    console.log("\n--- 5. Моделювання торгівлі ---");
    await tokenA.transfer(trader.address, ethers.parseEther("100"));

    await tokenA.connect(trader).approve(poolAddress, ethers.parseEther("50"));

    console.log("Трейдер обмінює 50 STK на UAHc...");
    const swapAmount = ethers.parseEther("50");
    await pool.connect(trader).swapAforB(swapAmount);

    console.log("\n--- 6. Результат операції ---");
    const traderBalanceB = await tokenB.balanceOf(trader.address);
    console.log(`Отримано трейдером: ${ethers.formatEther(traderBalanceB)} UAHc`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});