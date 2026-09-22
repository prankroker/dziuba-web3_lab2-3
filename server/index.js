import express from "express";
import cors from "cors";
import Database from "better-sqlite3";
import { ethers } from "ethers";
import fs from "fs";

const app = express();
app.use(cors());
app.use(express.json());

const db = new Database("swaps.db");
db.exec(`
  CREATE TABLE IF NOT EXISTS swap_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transactionHash TEXT,
    blockNumber INTEGER,
    trader TEXT,
    amountIn TEXT,
    amountOut TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

const RPC_URL = "http://127.0.0.1:8545";
const provider = new ethers.JsonRpcProvider(RPC_URL);

const POOL_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

const contractArtifact = JSON.parse(
    fs.readFileSync("./artifacts/contracts/DexPool.sol/DexPool.json", "utf8")
);
const poolContract = new ethers.Contract(POOL_ADDRESS, contractArtifact.abi, provider);

console.log(`[Індексатор] Слухаємо події Swap для контракту: ${POOL_ADDRESS}`);

poolContract.on("Swap", (trader, amountIn, amountOut, eventPayload) => {
    const txHash = eventPayload.log.transactionHash;
    const blockNum = eventPayload.log.blockNumber;
    const formattedIn = ethers.formatEther(amountIn);
    const formattedOut = ethers.formatEther(amountOut);

    console.log(`[Нова подія Swap] Блок: ${blockNum} | Трейдер: ${trader}`);
    console.log(`  Віддав: ${formattedIn} STK -> Отримав: ${formattedOut} UAHc`);

    const insert = db.prepare(`
    INSERT INTO swap_history (transactionHash, blockNumber, trader, amountIn, amountOut)
    VALUES (?, ?, ?, ?, ?)
  `);
    insert.run(txHash, blockNum, trader.toLowerCase(), formattedIn, formattedOut);
});

app.get("/api/swaps", (req, res) => {
    const trader = req.query.trader;
    if (!trader) {
        return res.status(400).json({ error: "Вкажіть адресу trader у параметрах" });
    }

    const query = db.prepare("SELECT * FROM swap_history WHERE trader = ? ORDER BY id DESC");
    const swaps = query.all(trader.toLowerCase());
    res.json(swaps);
});

app.listen(5000, () => {
    console.log("[Бекенд] REST API запущено на http://localhost:5000");
});