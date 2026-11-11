using UnityEngine;

namespace UOT.LibraryTycoon.UnityComparison
{
    // Screen-space clicks hit the GLB model's explicit interaction collider.
    public sealed class HallClickable : MonoBehaviour
    {
        public enum Kind { Shelf, Mascot, Counter }
        private Kind _kind;
        private int _index;
        private LibraryMissionCore _mission;

        public void Initialize(Kind kind, int index, LibraryMissionCore mission)
        {
            _kind=kind;
            _index=index;
            _mission=mission;
        }

        public void AddHitBox(Vector3 size, Vector3 center)
        {
            var hit=gameObject.AddComponent<BoxCollider>();
            hit.size=size;
            hit.center=center;
            hit.isTrigger=false;
        }

        private void OnMouseDown()
        {
            if (_mission == null) return;
            switch(_kind)
            {
                case Kind.Shelf:
                    bool found = _mission.SearchShelf(_index);
                    Debug.Log(found
                        ? "[LibraryTycoon] Missing book found!"
                        : "[LibraryTycoon] Shelf inspected or already searched.");
                    var mascot=GameObject.Find("mascot.glb");
                    if(mascot != null)
                    {
                        var mover=mascot.GetComponent<HallWalker>();
                        if(mover==null) mover=mascot.AddComponent<HallWalker>();
                        // Corridor route deliberately avoids central reading tables.
                        mover.SetRoute(new Vector3(2.7f,0,-3.8f),
                            new Vector3(2.7f,0,2.8f),
                            new Vector3(transform.position.x,0,2.8f));
                    }
                    break;
                case Kind.Mascot:
                    Debug.Log(_mission.TryMascotGift()
                        ? "[LibraryTycoon] Mascot gift: +25000 virtual IQD."
                        : "[LibraryTycoon] Mascot gift cooldown still active.");
                    break;
                case Kind.Counter:
                    _mission.ServeAtCounter();
                    Debug.Log("[LibraryTycoon] Borrowing service processed.");
                    break;
            }
        }
    }
}
