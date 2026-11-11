using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using UnityEngine;

namespace UOT.LibraryTycoon.UnityComparison
{
    // Art evaluation scene only. Does not replace the V3 Babylon/React game.
    public sealed class UnityHallBootstrap : MonoBehaviour
    {
        private UnityGlbLibrary _assets;
        private LibraryMissionCore _mission;
        private HallCameraController _camera;
        private readonly List<HallWalker> _walkers = new List<HallWalker>();
        private GameObject _mascot;
        private bool _ready;

        private async void Start()
        {
            try
            {
                _mission = new LibraryMissionCore();
                _assets = gameObject.AddComponent<UnityGlbLibrary>();
                BuildArchitecture();
                BuildLighting();
                BuildCamera();
                await BuildFurnitureAndActors();
                _ready = true;
                Debug.Log("[LibraryTycoon/UnityComparison] 3D assets loaded; visual approval still pending.");
            }
            catch (Exception error)
            {
                Debug.LogError("[LibraryTycoon/UnityComparison] Scene creation failed: " + error);
            }
        }

        private static Material Finish(string name, Color color, float smoothness = 0.4f)
        {
            Shader shader = UnityEngine.Rendering.GraphicsSettings.currentRenderPipeline != null ? Shader.Find("Universal Render Pipeline/Lit") : Shader.Find("Standard");
            if (shader == null) shader = Shader.Find("Standard");
            Material material = new Material(shader) { name = name, color = color };
            if (material.HasProperty("_Smoothness")) material.SetFloat("_Smoothness", smoothness);
            return material;
        }

        private static GameObject ArchitecturePiece(string name, Vector3 center, Vector3 scale, Material material)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
            go.name = name;
            go.transform.position = center;
            go.transform.localScale = scale;
            go.GetComponent<Renderer>().sharedMaterial = material;
            return go;
        }

        private void BuildArchitecture()
        {
            var floor = Finish("Polished pale stone", new Color(0.80f,0.77f,0.68f), .64f);
            var wall = Finish("Warm ivory plaster", new Color(0.85f,0.82f,0.73f));
            var navy = Finish("UOT deep navy", new Color(0.04f,0.12f,0.21f), .40f);
            var gold = Finish("Brushed brass", new Color(.76f,.56f,.24f), .72f);
            var walnut = Finish("Walnut trim", new Color(.33f,.20f,.12f), .36f);

            // Geometry is architecture scaffolding only. All furnishings are actual GLBs.
            ArchitecturePiece("Library floor", new Vector3(0,-.17f,0), new Vector3(17,.3f,12), floor);
            ArchitecturePiece("Rear plaster", new Vector3(0,2.3f,5.9f), new Vector3(17,4.6f,.2f), wall);
            ArchitecturePiece("Left wall cutaway", new Vector3(-8.35f,1.6f,0), new Vector3(.22f,3.2f,12), wall);
            ArchitecturePiece("Right partial wall", new Vector3(8.35f,.75f,2), new Vector3(.22f,1.5f,8), wall);
            ArchitecturePiece("Rear wainscot", new Vector3(0,.73f,5.73f), new Vector3(16.8f,1.45f,.11f), walnut);
            ArchitecturePiece("Rear brass rail", new Vector3(0,1.5f,5.66f), new Vector3(16.8f,.075f,.13f), gold);
            ArchitecturePiece("Floor border west", new Vector3(-8.1f,.02f,0), new Vector3(.08f,.035f,11.8f), gold);
            ArchitecturePiece("Floor border north", new Vector3(0,.02f,5.7f), new Vector3(16.2f,.035f,.08f), gold);
            ArchitecturePiece("Entrance navy plinth", new Vector3(0,.04f,-5.55f), new Vector3(4,.08f,.5f), navy);

            // Recesses are rendered with thin tinted glass panels until a full architectural model is approved.
            var glass = Finish("Window glass", new Color(.38f,.61f,.68f), .85f);
            for (int i = -2; i <= 2; ++i)
            {
                float x = i * 2.7f;
                ArchitecturePiece("Rear window " + i, new Vector3(x,2.95f,5.70f), new Vector3(1.8f,1.9f,.055f), glass);
                ArchitecturePiece("Window top brass " + i, new Vector3(x,3.93f,5.64f), new Vector3(1.9f,.065f,.1f), gold);
            }
        }

        private static void BuildLighting()
        {
            RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
            RenderSettings.ambientLight = new Color(.42f,.47f,.52f);
            var sun = new GameObject("Warm directional light").AddComponent<Light>();
            sun.type = LightType.Directional;
            sun.color = new Color(1f,.93f,.79f);
            sun.intensity = 1.2f;
            sun.shadows = LightShadows.Soft;
            sun.transform.rotation = Quaternion.Euler(52,-28,0);
            foreach (var z in new[] { -2.8f, 1.8f, 4.2f })
            {
                var point = new GameObject("Reading hall practical light").AddComponent<Light>();
                point.type = LightType.Point; point.range = 12; point.intensity = 3.2f;
                point.color = new Color(1f,.77f,.53f);
                point.transform.position = new Vector3(0,4.1f,z);
            }
        }

        private void BuildCamera()
        {
            var go = new GameObject("Locked-angle isometric camera");
            var camera = go.AddComponent<Camera>();
            go.tag = "MainCamera";
            camera.orthographic = true;
            camera.orthographicSize = 9.2f;
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = new Color(.055f,.078f,.106f);
            _camera = go.AddComponent<HallCameraController>();
            _camera.Focus = new Vector3(0,1.3f,0);
        }

        private async Task<GameObject> Model(string file, Vector3 position, float rotation = 0, float scale = 1)
        {
            return await _assets.SpawnAsync(file, position, Quaternion.Euler(0,rotation,0), scale, transform);
        }

        private async Task<GameObject> InteractiveShelf(int shelfId, Vector3 position, float rotation)
        {
            GameObject go = await Model("shelf.glb", position, rotation);
            if (go == null) return null;
            var click = go.AddComponent<HallClickable>();
            click.Initialize(HallClickable.Kind.Shelf, shelfId, _mission);
            click.AddHitBox(new Vector3(1.4f,2.7f,.8f),new Vector3(0,1.3f,0));
            return go;
        }

        private async Task BuildFurnitureAndActors()
        {
            // Distinct, verified original GLB meshes copied from the existing V3 source branch.
            await InteractiveShelf(0,new Vector3(-6.0f,0,3.9f),0);
            await InteractiveShelf(1,new Vector3(-3.8f,0,3.9f),0);
            await InteractiveShelf(2,new Vector3(-1.6f,0,3.9f),0);
            await InteractiveShelf(3,new Vector3(.7f,0,3.9f),0);
            await Model("lowshelf.glb",new Vector3(-6,0,.5f),90);
            await Model("lowshelf.glb",new Vector3(-6,0,-1.8f),90);
            var counter = await Model("counter.glb",new Vector3(4.8f,0,-2.5f),180);
            if(counter != null)
            {
                var click = counter.AddComponent<HallClickable>();
                click.Initialize(HallClickable.Kind.Counter,0,_mission);
                click.AddHitBox(new Vector3(2f,2f,1.1f),new Vector3(0,1f,0));
            }
            await Model("refdesk.glb",new Vector3(5.9f,0,1.3f),180);
            for (int i = 0; i < 3; i++)
            {
                float x = -3.2f + i*3.15f;
                await Model("table.glb",new Vector3(x,0,-1.1f));
                await Model("chair_read.glb",new Vector3(x-0.8f,0,-2.1f),0);
                await Model("chair_read.glb",new Vector3(x+0.8f,0,-.05f),180);
                await Model("lamp_table.glb",new Vector3(x,1.0f,-1.1f));
            }
            foreach(var p in new[]{ new Vector3(-7,0,-4.2f),new Vector3(7.1f,0,4.2f),new Vector3(7,0,-4.2f) })
                await Model("plant_tall.glb",p);
            await Model("book_stack.glb",new Vector3(-2.9f,.85f,-1.1f));
            await Model("printer.glb",new Vector3(6,1.0f,1.1f));

            // Service employee stays at the workstation. No random staff roaming.
            await Model("character-female-a.glb",new Vector3(5.1f,0,-1.35f),180,.9f);
            await Model("character-male-b.glb",new Vector3(5.9f,0,2.1f),180,.9f);

            var visitorA = await Model("character-male-c.glb",new Vector3(-6.7f,0,-4.2f),0,.9f);
            if(visitorA != null)
            {
                var w=visitorA.AddComponent<HallWalker>();
                w.SetRoute(new Vector3(-5f,0,-4.2f),new Vector3(-4f,0,-2.6f),new Vector3(-3f,0,-2.15f));
                _walkers.Add(w);
            }

            var visitorB = await Model("character-female-e.glb",new Vector3(-7.2f,0,-3.5f),0,.9f);
            if(visitorB != null)
            {
                var w=visitorB.AddComponent<HallWalker>();
                w.SetRoute(new Vector3(-6.9f,0,-2.2f),new Vector3(-6.2f,0,.4f));
                _walkers.Add(w);
            }

            _mascot = await Model("mascot.glb",new Vector3(2.2f,0,-4.0f),15,.85f);
            if(_mascot != null)
            {
                var click=_mascot.AddComponent<HallClickable>();
                click.Initialize(HallClickable.Kind.Mascot,0,_mission);
                click.AddHitBox(new Vector3(1.5f,1.8f,1.5f),new Vector3(0,.9f,0));
            }
        }

        private void OnGUI()
        {
            // Debug-only overlay. React V3 remains the production management interface.
            GUI.Box(new Rect(12,10,460,123),"LIBRARY TYCOON | UNITY 6.3 ART EVALUATION");
            GUI.Label(new Rect(23,36,435,24),_ready ? "3D models loaded. Click the shelves to find the book." : "Loading the original GLB assets...");
            GUI.Label(new Rect(23,61,435,24),"Mission: " + _mission?.Status);
            GUI.Label(new Rect(23,86,435,24),"Reward (virtual IQD): " + _mission?.Money + " | Camera: drag RMB, wheel zoom");
            GUI.Label(new Rect(23,111,435,20),"Reference design is NOT a verified game screenshot.");
        }

        private void OnDestroy()
        {
            if(_assets != null) _assets.DisposeImports();
        }
    }
}
