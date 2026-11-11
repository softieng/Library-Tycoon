using System;
using System.Collections.Generic;
using UnityEngine;

namespace UOT.LibraryTycoon.UnityComparison
{
    // Separate alpha save namespace. Never touches V2/V3 browser save keys.
    public sealed class LibraryMissionCore
    {
        private const string Prefix = "UOT.LibraryTycoon.UnityComparison.v1.";
        private readonly HashSet<int> _inspected = new HashSet<int>();
        private bool _bookFound;
        private int _money;
        private int _served;
        public int Money => _money;
        public int InspectedCount => _inspected.Count;
        public bool BookFound => _bookFound;
        public string Status => _bookFound
            ? "Missing book found. Mission complete."
            : "Missing book: inspect shelves (" + _inspected.Count + "/4). Services: " + _served;

        public LibraryMissionCore()
        {
            _money = PlayerPrefs.GetInt(Prefix+"money",260000);
            _bookFound = PlayerPrefs.GetInt(Prefix+"missingBookComplete",0)==1;
            _served = PlayerPrefs.GetInt(Prefix+"served",0);
        }

        public bool SearchShelf(int shelfId)
        {
            if (_bookFound || shelfId<0 || shelfId>3 || !_inspected.Add(shelfId)) return false;
            if (shelfId != 2) return false;
            _bookFound = true;
            _money += 8000;
            Save();
            Debug.Log("[LibraryTycoon] Real shelf interaction completed. +8000 virtual IQD, once.");
            return true;
        }

        public void ServeAtCounter()
        {
            _served++;
            _money += 170;
            Save();
        }

        public bool TryMascotGift()
        {
            const long cooldownSeconds=15*60;
            long now=DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            string key=Prefix+"mascotGiftTimestamp";
            long last=0;
            long.TryParse(PlayerPrefs.GetString(key,"0"),out last);
            if(last>0 && (now<last || now-last<cooldownSeconds)) return false;
            _money += 25000;
            PlayerPrefs.SetString(key,now.ToString());
            Save();
            return true;
        }

        private void Save()
        {
            PlayerPrefs.SetInt(Prefix+"money",_money);
            PlayerPrefs.SetInt(Prefix+"missingBookComplete",_bookFound?1:0);
            PlayerPrefs.SetInt(Prefix+"served",_served);
            PlayerPrefs.Save();
        }
    }
}
