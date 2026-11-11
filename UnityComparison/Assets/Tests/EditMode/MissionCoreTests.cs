#if UNITY_INCLUDE_TESTS
using NUnit.Framework;
using UOT.LibraryTycoon.UnityComparison;
using UnityEngine;

public class MissionCoreTests
{
    [SetUp]
    public void ResetComparisonSave()
    {
        PlayerPrefs.DeleteKey("UOT.LibraryTycoon.UnityComparison.v1.money");
        PlayerPrefs.DeleteKey("UOT.LibraryTycoon.UnityComparison.v1.missingBookComplete");
        PlayerPrefs.DeleteKey("UOT.LibraryTycoon.UnityComparison.v1.served");
        PlayerPrefs.DeleteKey("UOT.LibraryTycoon.UnityComparison.v1.mascotGiftTimestamp");
    }

    [Test]
    public void BookRewardCannotBeClaimedTwice()
    {
        var game=new LibraryMissionCore();
        Assert.IsFalse(game.SearchShelf(0));
        Assert.IsTrue(game.SearchShelf(2));
        int reward=game.Money;
        Assert.IsFalse(game.SearchShelf(2));
        Assert.AreEqual(reward,game.Money);
        var reloaded=new LibraryMissionCore();
        Assert.IsTrue(reloaded.BookFound);
        Assert.IsFalse(reloaded.SearchShelf(2));
        Assert.AreEqual(reward,reloaded.Money);
    }

    [Test]
    public void MascotGiftRespectsCooldown()
    {
        var game=new LibraryMissionCore();
        Assert.IsTrue(game.TryMascotGift());
        int reward=game.Money;
        Assert.IsFalse(game.TryMascotGift());
        Assert.AreEqual(reward,game.Money);
        Assert.IsFalse(new LibraryMissionCore().TryMascotGift());
    }

    [Test]
    public void CounterServiceChangesOnlyComparisonBalance()
    {
        var game=new LibraryMissionCore();
        int before=game.Money;
        game.ServeAtCounter();
        Assert.AreEqual(before+170,game.Money);
    }
}
#endif
