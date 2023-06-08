pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract NFTDutchAuction {
    address payable public auctionOwner;
    address public erc721TokenAddress;
    uint256 public nftTokenId;
    uint256 public reservePrice;
    uint256 public numBlocksAuctionOpen;
    uint256 public offerPriceDecrement;
    uint256 public auctionEndTime;
    uint256 public currentPrice;
    address public winningBidder;
    bool public auctionEnded;

    modifier onlyAuctionOwner() {
        require(msg.sender == auctionOwner, "Only auction owner can perform this action");
        _;
    }

    modifier auctionOpen() {
        require(!auctionEnded, "Auction has ended");
        require(block.number <= auctionEndTime, "Auction has expired");
        _;
    }

    constructor(
        address _erc721TokenAddress,
        uint256 _nftTokenId,
        uint256 _reservePrice,
        uint256 _numBlocksAuctionOpen,
        uint256 _offerPriceDecrement
    ) {
        auctionOwner = payable(msg.sender);
        erc721TokenAddress = _erc721TokenAddress;
        nftTokenId = _nftTokenId;
        reservePrice = _reservePrice;
        numBlocksAuctionOpen = _numBlocksAuctionOpen;
        offerPriceDecrement = _offerPriceDecrement;
        auctionEndTime = block.number + _numBlocksAuctionOpen;
        currentPrice = _calculateInitialPrice();
    }

    function placeBid() external payable auctionOpen {
        require(msg.value >= currentPrice, "Bid amount is lower than the current price");

        if (winningBidder != address(0)) {
            // Refund the previous winning bidder
            (bool success, ) = payable(winningBidder).call{ value: currentPrice }("");
            require(success, "Failed to refund previous winning bidder");
        }

        winningBidder = msg.sender;
        currentPrice -= offerPriceDecrement;
    }

    function endAuction() external onlyAuctionOwner auctionOpen {
        auctionEnded = true;

        // Transfer the NFT to the winning bidder
        ERC721(erc721TokenAddress).transferFrom(address(this), winningBidder, nftTokenId);

        // Transfer the funds to the auction owner
        (bool success, ) = auctionOwner.call{ value: address(this).balance }("");
        require(success, "Failed to transfer funds to auction owner");
    }

    function _calculateInitialPrice() private view returns (uint256) {
        return reservePrice + numBlocksAuctionOpen * offerPriceDecrement;
    }
}
