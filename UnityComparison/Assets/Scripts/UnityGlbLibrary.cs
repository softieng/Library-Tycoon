using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using GLTFast;
using UnityEngine;

namespace UOT.LibraryTycoon.UnityComparison
{
    public sealed class UnityGlbLibrary : MonoBehaviour
    {
        private readonly List<GltfImport> _loaded = new List<GltfImport>();

        public async Task<GameObject> SpawnAsync(string modelName, Vector3 position, Quaternion rotation, float scale, Transform parent)
        {
            var container = new GameObject(modelName);
            container.transform.SetParent(parent, false);
            container.transform.position = position;
            container.transform.rotation = rotation;
            container.transform.localScale = Vector3.one * scale;
            string local = Path.Combine(Application.streamingAssetsPath, "Models", modelName).Replace('\\','/');
            string uri = local.Contains("://") ? local : new Uri(Path.GetFullPath(local)).AbsoluteUri;
            var importer = new GltfImport();
            try
            {
                bool ok = await importer.Load(uri);
                if (!ok || !await importer.InstantiateMainSceneAsync(container.transform))
                    throw new IOException("glTFast failed to load " + uri);
                _loaded.Add(importer);
                return container;
            }
            catch(Exception ex)
            {
                Debug.LogError("Missing or failed GLB " + modelName + ": " + ex.Message);
                importer.Dispose();
                Destroy(container);
                return null;
            }
        }

        public void DisposeImports()
        {
            foreach (var importer in _loaded) importer.Dispose();
            _loaded.Clear();
        }
    }
}
