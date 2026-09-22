import { network } from "hardhat";

async function main() {
    const { ethers } = await network.create();
    const [deployer] = await ethers.getSigners();

    console.log("Розгортання від імені:", deployer.address);

    const Token = await ethers.getContractFactory("AssetToken");
    const tokenA = await Token.deploy("StudentToken", "STK", 1000000);
    const tokenB = await Token.deploy("MockFiat", "UAHc", 1000000);

    const addressA = await tokenA.getAddress();
    const addressB = await tokenB.getAddress();

    const DexPool = await ethers.getContractFactory("DexPool");
    const pool = await DexPool.deploy(addressA, addressB);
    const poolAddress = await pool.getAddress();

    await tokenA.approve(poolAddress, ethers.parseEther("100000"));
    await tokenB.approve(poolAddress, ethers.parseEther("100000"));
    await pool.addLiquidity(ethers.parseEther("1000"), ethers.parseEther("2000"));

    console.log("\n--- Збережіть ці адреси ---");
    console.log(`TOKEN_A_ADDRESS="${addressA}"`);
    console.log(`TOKEN_B_ADDRESS="${addressB}"`);
    console.log(`POOL_ADDRESS="${poolAddress}"`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});