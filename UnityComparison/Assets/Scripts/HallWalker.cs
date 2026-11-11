using System.Collections.Generic;
using UnityEngine;

namespace UOT.LibraryTycoon.UnityComparison
{
    // A bounded waypoint demonstration, not a production NavMesh/crowd-avoidance system.
    public sealed class HallWalker : MonoBehaviour
    {
        public float Speed=1.2f;
        private readonly Queue<Vector3> _route=new Queue<Vector3>();
        private Animation _animation;
        private bool _warned;

        public void SetRoute(params Vector3[] positions)
        {
            _route.Clear();
            foreach(var point in positions) _route.Enqueue(point);
        }

        private void Update()
        {
            if (_animation==null) _animation=GetComponentInChildren<Animation>();
            if(_route.Count==0)
            {
                PlayClip("idle");
                return;
            }
            Vector3 next=_route.Peek();
            Vector3 delta=next-transform.position;
            delta.y=0;
            if(delta.sqrMagnitude<.09f) { _route.Dequeue(); return; }
            Vector3 direction=delta.normalized;
            transform.position+=direction*Mathf.Min(Speed*Time.deltaTime,delta.magnitude);
            transform.rotation=Quaternion.Slerp(transform.rotation,
                Quaternion.LookRotation(direction,Vector3.up),Time.deltaTime*6f);
            PlayClip("walk");
        }

        private void PlayClip(string name)
        {
            if(_animation==null)
            {
                if(!_warned)
                {
                    Debug.LogWarning("[LibraryTycoon] Imported GLB animation component not found. Verify glTFast animation import in Unity Editor.");
                    _warned=true;
                }
                return;
            }
            if(_animation.GetClip(name)!=null && !_animation.IsPlaying(name)) _animation.CrossFade(name,.14f);
        }
    }
}
