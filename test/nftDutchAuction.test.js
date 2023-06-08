const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NFTDutchAuction", function () {
  let nftDutchAuction;
  let erc721Token;
  let nftTokenId;
  let reservePrice;
  let numBlocksAuctionOpen;
  let offerPriceDecrement;
  let auctionOwner;
  let bidder1;
  let bidder2; 
  let winningBid;

  beforeEach(async () => {
    [auctionOwner, bidder1, bidder2] = await ethers.getSigners();

    const ERC721Token = await ethers.getContractFactory("ERC721Token");
    erc721Token = await ERC721Token.deploy();
    await erc721Token.deployed();

    const NFTDutchAuction = await ethers.getContractFactory("NFTDutchAuction");
    nftDutchAuction = await NFTDutchAuction.deploy(
      erc721Token.address,
      nftTokenId,
      reservePrice,
      numBlocksAuctionOpen,
      offerPriceDecrement
    );
    await nftDutchAuction.deployed();

    // Mint an NFT to be auctioned
    await erc721Token.mint(auctionOwner.address, nftTokenId);
  });

  it("should start the auction with the correct parameters", async function () {
    expect(await nftDutchAuction.auctionOwner()).to.equal(auctionOwner.address);
    expect(await nftDutchAuction.erc721TokenAddress()).to.equal(erc721Token.address);
    expect(await nftDutchAuction.nftTokenId()).to.equal(nftTokenId);
    expect(await nftDutchAuction.reservePrice()).to.equal(reservePrice);
    expect(await nftDutchAuction.numBlocksAuctionOpen()).to.equal(numBlocksAuctionOpen);
    expect(await nftDutchAuction.offerPriceDecrement()).to.equal(offerPriceDecrement);
    expect(await nftDutchAuction.currentPrice()).to.equal(reservePrice + numBlocksAuctionOpen * offerPriceDecrement);
  });

  it("should allow bidders to place bids", async function () {
    await nftDutchAuction.connect(bidder1).placeBid({ value: reservePrice });
    await nftDutchAuction.connect(bidder2).placeBid({ value: reservePrice + offerPriceDecrement });

    expect(await nftDutchAuction.winningBidder()).to.equal(bidder2.address);
    expect(await nftDutchAuction.currentPrice()).to.equal(reservePrice);
  });

  it("should end the auction and transfer the NFT and funds to the winning bidder and owner, respectively", async function () {
    winningBid = reservePrice + offerPriceDecrement;

    await nftDutchAuction.connect(bidder1).placeBid({ value: reservePrice });
    await nftDutchAuction.connect(bidder2).placeBid({ value: winningBid });

    const ownerBalanceBefore = await ethers.provider.getBalance(auctionOwner.address);
    const bidderBalanceBefore = await ethers.provider.getBalance(bidder2.address);

    await nftDutchAuction.connect(auctionOwner).endAuction();

    const ownerBalanceAfter = await ethers.provider.getBalance(auctionOwner.address);
    const bidderBalanceAfter = await ethers.provider.getBalance(bidder2.address);

    expect(await nftDutchAuction.auctionEnded()).to.be.true;
    expect(await erc721Token.ownerOf(nftTokenId)).to.equal(bidder2.address);
    expect(ownerBalanceAfter.sub(ownerBalanceBefore)).to.equal(winningBid);
    expect(bidderBalanceAfter.sub(bidderBalanceBefore)).to.equal(reservePrice);
  });
});
