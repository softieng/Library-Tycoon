using UnityEngine;

namespace UOT.LibraryTycoon.UnityComparison
{
    [RequireComponent(typeof(Camera))]
    public sealed class HallCameraController : MonoBehaviour
    {
        public Vector3 Focus = new Vector3(0,1,0);
        public float PanSpeed = .025f;
        private const float MinZoom = 5.8f;
        private const float MaxZoom = 15f;
        private Camera _camera;
        private Vector3 _lastMouse;
        private readonly Quaternion _fixedRotation = Quaternion.Euler(42f,43f,0f);

        private void Awake()
        {
            _camera = GetComponent<Camera>();
        }

        private void LateUpdate()
        {
            var pan = Vector3.zero;
            if (Input.GetMouseButton(1) || Input.GetMouseButton(2))
            {
                Vector3 delta = Input.mousePosition - _lastMouse;
                pan -= Vector3.ProjectOnPlane(_fixedRotation * Vector3.right,Vector3.up).normalized * (delta.x * PanSpeed);
                pan -= Vector3.ProjectOnPlane(_fixedRotation * Vector3.up,Vector3.up).normalized * (delta.y * PanSpeed);
            }
            _lastMouse = Input.mousePosition;

            float dt = Time.unscaledDeltaTime;
            if (Input.GetKey(KeyCode.A) || Input.GetKey(KeyCode.LeftArrow)) pan.x -= dt*7;
            if (Input.GetKey(KeyCode.D) || Input.GetKey(KeyCode.RightArrow)) pan.x += dt*7;
            if (Input.GetKey(KeyCode.W) || Input.GetKey(KeyCode.UpArrow)) pan.z += dt*7;
            if (Input.GetKey(KeyCode.S) || Input.GetKey(KeyCode.DownArrow)) pan.z -= dt*7;
            Focus += pan;
            Focus = new Vector3(Mathf.Clamp(Focus.x,-4.7f,4.7f),1.2f,Mathf.Clamp(Focus.z,-3f,3f));

            float wheel = Input.mouseScrollDelta.y;
            _camera.orthographicSize = Mathf.Clamp(_camera.orthographicSize - wheel*.7f,MinZoom,MaxZoom);
            if (Input.GetKeyDown(KeyCode.Home)) { Focus=new Vector3(0,1.2f,0);_camera.orthographicSize=9.2f; }

            transform.rotation = _fixedRotation;
            transform.position = Focus - transform.forward * 20f;
        }
    }
}
