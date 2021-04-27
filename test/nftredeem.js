const truffleAssert = require('truffle-assertions');
const ERC721Creator = artifacts.require('MockTestERC721Creator');
const NFTRedeem = artifacts.require("NFTRedeem");
const MockERC721 = artifacts.require('MockTestERC721');
const MockERC1155 = artifacts.require('MockTestERC1155');

contract('NFTRedeem', function ([creator, ...accounts]) {
    const name = 'Token';
    const symbol = 'NFT';
    const minter = creator;
    const [
           owner,
           newOwner,
           another,
           anyone,
           ] = accounts;

    describe('NFTRedeem', function() {
        var creator;
        var redeem;
        var mock721;
        var mock1155;
        var redemptionRate = 3;
        var redemptionMax = 2;

        beforeEach(async function () {
            creator = await ERC721Creator.new(name, symbol, {from:owner});
            redeem = await NFTRedeem.new(creator.address, redemptionRate, redemptionMax, {from:owner});
            await creator.registerExtension(redeem.address, "https://redeem", {from:owner})
            mock721 = await MockERC721.new('721', '721', {from:owner});
            mock1155 = await MockERC1155.new('1155uri', {from:owner});
        });

        it('access test', async function () {
            await truffleAssert.reverts(redeem.setERC721Recoverable(anyone, 1, anyone, {from:anyone}), "AdminControl: Must be owner or admin");
            await truffleAssert.reverts(redeem.updateApprovedContracts([anyone], [true], {from:anyone}), "AdminControl: Must be owner or admin");
            await truffleAssert.reverts(redeem.updateApprovedTokens(anyone, [1], [true], {from:anyone}), "AdminControl: Must be owner or admin");
            await truffleAssert.reverts(redeem.updateApprovedTokenRanges(anyone, [1], [2], {from:anyone}), "AdminControl: Must be owner or admin");
        });

        it('ERC721 recovery test', async function () {
            var tokenId = 721;
            await mock721.testMint(another, tokenId);
            assert.equal(await mock721.balanceOf(another), 1);
            
            await mock721.transferFrom(another, redeem.address, tokenId, {from:another});
            assert.equal(await mock721.balanceOf(another), 0);
            assert.equal(await mock721.balanceOf(redeem.address), 1);

            await truffleAssert.reverts(redeem.recoverERC721(mock721.address, tokenId, {from:another}), "NFTRedeem: Permission denied");

            await truffleAssert.reverts(redeem.setERC721Recoverable(anyone, tokenId, anyone, {from:owner}), "NFTRedeem: Must implement IERC721");
            await redeem.setERC721Recoverable(mock721.address, tokenId, anyone, {from:owner});
            
            await truffleAssert.reverts(redeem.recoverERC721(mock721.address, tokenId, {from:another}), "NFTRedeem: Permission denied");
            await redeem.recoverERC721(mock721.address, tokenId, {from:anyone});
            assert.equal(await mock721.balanceOf(another), 0);
            assert.equal(await mock721.balanceOf(anyone), 1);
            assert.equal(await mock721.balanceOf(redeem.address), 0);
        });

        it('redeemable test', async function () {
            assert.equal(await redeem.redemptionRate(), redemptionRate);
            assert.equal(await redeem.redemptionRemaining(), redemptionMax);

            assert.equal(await redeem.redeemable(mock721.address, 1), false);

            await truffleAssert.reverts(redeem.updateApprovedTokens(mock721.address, [1,2,3], [true,false], {from:owner}), "NFTRedeem: Invalid input parameters");
            await redeem.updateApprovedTokens(mock721.address, [1,2,3], [true,false,true], {from:owner});
            assert.equal(await redeem.redeemable(mock721.address, 1), true);
            assert.equal(await redeem.redeemable(mock721.address, 2), false);
            assert.equal(await redeem.redeemable(mock721.address, 3), true);

            await truffleAssert.reverts(redeem.updateApprovedTokenRanges(mock721.address, [3], [1], {from:owner}), "NFTRedeem: min must be less than max");
            await truffleAssert.reverts(redeem.updateApprovedTokenRanges(mock721.address, [1], [], {from:owner}), "NFTRedeem: Invalid input parameters");
            await redeem.updateApprovedTokenRanges(mock721.address, [1], [3], {from:owner});
            assert.equal(await redeem.redeemable(mock721.address, 1), true);
            assert.equal(await redeem.redeemable(mock721.address, 2), true);
            assert.equal(await redeem.redeemable(mock721.address, 3), true);
            assert.equal(await redeem.redeemable(mock721.address, 4), false);

            await truffleAssert.reverts(redeem.updateApprovedContracts([mock721.address], [], {from:owner}), "NFTRedeem: Invalid input parameters");                            
            await redeem.updateApprovedContracts([mock721.address], [true], {from:owner});
            assert.equal(await redeem.redeemable(mock721.address, 1), true);
            assert.equal(await redeem.redeemable(mock721.address, 2), true);
            assert.equal(await redeem.redeemable(mock721.address, 3), true);
            assert.equal(await redeem.redeemable(mock721.address, 4), true);
            
            await redeem.updateApprovedContracts([mock721.address], [false], {from:owner});
            assert.equal(await redeem.redeemable(mock721.address, 1), true);
            assert.equal(await redeem.redeemable(mock721.address, 2), true);
            assert.equal(await redeem.redeemable(mock721.address, 3), true);
            assert.equal(await redeem.redeemable(mock721.address, 4), false);
            
            await redeem.updateApprovedTokenRanges(mock721.address, [], [], {from:owner});
            assert.equal(await redeem.redeemable(mock721.address, 1), true);
            assert.equal(await redeem.redeemable(mock721.address, 2), false);
            assert.equal(await redeem.redeemable(mock721.address, 3), true);
            assert.equal(await redeem.redeemable(mock721.address, 4), false);
        });

        it('core functionality test ERC721', async function () {
            var tokenId1 = 1;
            var tokenId2 = 2;
            var tokenId3 = 3;
            var tokenId4 = 4;
            var tokenId5 = 5;
            var tokenId6 = 6;
            var tokenId7 = 7;
            var tokenId8 = 8;
            var tokenId9 = 9;

            await mock721.testMint(another, tokenId1);
            await mock721.testMint(another, tokenId2);
            await mock721.testMint(another, tokenId3);
            await mock721.testMint(another, tokenId4);
            await mock721.testMint(another, tokenId5);
            await mock721.testMint(another, tokenId6);
            await mock721.testMint(another, tokenId7);
            await mock721.testMint(another, tokenId8);
            await mock721.testMint(another, tokenId9);

            // Test Redemption
            await redeem.updateApprovedTokens(mock721.address, [tokenId1,tokenId2,tokenId3], [true,false,true], {from:owner});


            // Check failure cases
            await truffleAssert.reverts(redeem.redeemERC721([mock721.address], [tokenId1, tokenId2]), "NFTRedeem: Invalid parameters"); 
            await truffleAssert.reverts(redeem.redeemERC721([mock721.address, mock721.address], [tokenId1, tokenId2]), "NFTRedeem: Incorrect number of NFTs being redeemed");
            await truffleAssert.reverts(redeem.redeemERC721([mock721.address, mock721.address, mock721.address], [tokenId1, tokenId2, tokenId3], {from:anyone}), "NFTRedeem: Caller must own NFTs");
            await truffleAssert.reverts(redeem.redeemERC721([mock721.address, mock721.address, mock721.address], [tokenId1, tokenId2, tokenId3], {from:another}), "NFTRedeem: Contract must be given approval to burn NFT");

            // Approve to redeem
            await mock721.approve(redeem.address, tokenId1, {from:another});
            await mock721.approve(redeem.address, tokenId2, {from:another});
            await mock721.approve(redeem.address, tokenId3, {from:another});
            await truffleAssert.reverts(redeem.redeemERC721([mock721.address, mock721.address, mock721.address], [tokenId1, tokenId2, tokenId3], {from:another}), "NFTRedeem: Invalid token");

            await redeem.updateApprovedTokens(mock721.address, [tokenId1,tokenId2,tokenId3], [true,true,true], {from:owner});
            await redeem.redeemERC721([mock721.address, mock721.address, mock721.address], [tokenId1, tokenId2, tokenId3], {from:another});

            assert.equal(await mock721.balanceOf(another), 6);
            assert.equal(await creator.balanceOf(another), 1);
            assert.equal(await redeem.redemptionRemaining(), redemptionMax-1);
            
            await redeem.updateApprovedTokens(mock721.address, [tokenId4,tokenId5,tokenId6], [true,true,true], {from:owner});
            await mock721.approve(redeem.address, tokenId4, {from:another});
            await mock721.approve(redeem.address, tokenId5, {from:another});
            await mock721.approve(redeem.address, tokenId6, {from:another});
            await redeem.redeemERC721([mock721.address, mock721.address, mock721.address], [tokenId4, tokenId5, tokenId6], {from:another});
            
            assert.equal(await mock721.balanceOf(another), 3);
            assert.equal(await creator.balanceOf(another), 2);
            assert.equal(await redeem.redemptionRemaining(), 0);
            
            await truffleAssert.reverts(redeem.redeemERC721([mock721.address, mock721.address, mock721.address], [tokenId7, tokenId8, tokenId9], {from:another}), "NFTRedeem: No redemptions remaining");

        });

    });

});