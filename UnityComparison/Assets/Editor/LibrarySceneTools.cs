#if UNITY_EDITOR
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace UOT.LibraryTycoon.UnityComparison.Editor
{
    public static class LibrarySceneTools
    {
        private const string ScenePath="Assets/Scenes/LibraryUnityReadingHall.unity";

        [MenuItem("Library Tycoon/Create 3D Art Comparison Scene")]
        public static void CreateComparisonScene()
        {
            Directory.CreateDirectory("Assets/Scenes");
            var scene=EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single);
            var root=new GameObject("UOT Central Library | Unity art comparison");
            root.AddComponent<UnityHallBootstrap>();
            EditorSceneManager.SaveScene(scene,ScenePath);
            EditorBuildSettings.scenes=new[] { new EditorBuildSettingsScene(ScenePath,true) };
            Debug.Log("[LibraryTycoon] Created "+ScenePath+". Press Play to test. Actual Unity visual QA is required.");
        }

        [MenuItem("Library Tycoon/Validate Imported Models")]
        public static void ValidateModels()
        {
            string[] names={"shelf","lowshelf","table","chair_read","counter","refdesk",
                "lamp_table","plant_tall","book_stack","printer","mascot",
                "character-female-a","character-male-b","character-male-c","character-female-e"};
            int missing=0;
            foreach(var name in names)
            {
                string path="Assets/StreamingAssets/Models/"+name+".glb";
                if(!File.Exists(path)) { Debug.LogError("[LibraryTycoon] Missing: "+path); missing++; }
            }
            Debug.Log(missing==0
                ? "[LibraryTycoon] All 15 imported models exist. Rendering and identity still require visual QA."
                : "[LibraryTycoon] Asset validation failed: "+missing+" missing.");
        }
    }
}
#endif
