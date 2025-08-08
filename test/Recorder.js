const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Recorder", function () {
  let recorder;
  let owner;
  let user;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();
    const Recorder = await ethers.getContractFactory("Recorder");
    recorder = await Recorder.deploy();
    await recorder.waitForDeployment();
  });

  it("accepts bait with sufficient fee and PoW", async function () {
    await recorder.adjustDifficulty(ethers.MaxUint256);
    const baitId = ethers.encodeBytes32String("bait");
    const fee = await recorder.baseBaitFee();
    await expect(recorder.connect(user).submitBait(baitId, 0, { value: fee })).to.not.be.reverted;
    expect(await recorder.baitCount(user.address)).to.equal(1n);
  });

  it("increases fee for subsequent baits", async function () {
    await recorder.adjustDifficulty(ethers.MaxUint256);
    const baitId = ethers.encodeBytes32String("bait");
    const fee = await recorder.baseBaitFee();
    await recorder.connect(user).submitBait(baitId, 0, { value: fee });
    const nextFee = (fee * 110n) / 100n;
    await expect(recorder.connect(user).submitBait(baitId, 1, { value: nextFee })).to.not.be.reverted;
    expect(await recorder.baitCount(user.address)).to.equal(2n);
  });

  it("refunds excess fee", async function () {
    await recorder.adjustDifficulty(ethers.MaxUint256);
    const baitId = ethers.encodeBytes32String("bait");
    const fee = await recorder.baseBaitFee();
    const value = fee * 2n;
    await expect(recorder.connect(user).submitBait(baitId, 0, { value })).to.not.be.reverted;
    const contractBal = await ethers.provider.getBalance(recorder.getAddress());
    expect(contractBal).to.equal(fee);
  });
});
