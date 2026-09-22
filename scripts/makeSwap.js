import { network } from "hardhat";

async function main() {
    const { ethers } = await network.create();
    const signers = await ethers.getSigners();
    const trader = signers[1];

    const poolAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
    const pool = await ethers.getContractAt("DexPool", poolAddress);
    const tokenAddressA = await pool.tokenA();
    const tokenA = await ethers.getContractAt("AssetToken", tokenAddressA);

    console.log(`Трейдер: ${trader.address}`);

    const deployer = signers[0];
    await tokenA.connect(deployer).transfer(trader.address, ethers.parseEther("100"));

    await tokenA.connect(trader).approve(poolAddress, ethers.parseEther("50"));
    console.log("Виконуємо обмін 50 STK...");
    const tx = await pool.connect(trader).swapAforB(ethers.parseEther("50"));
    await tx.wait();
    console.log("Обмін виконано!");
}

main().catch(console.error);