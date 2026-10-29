# Integrate Cortex–Medulla Threshold into DSA

This guide installs the plugin from this GitHub repository into an existing Digital Slide Archive (DSA) deployment. It uses DSA's `provision.yaml` to install the Python package and rebuild the Girder client. The Compose service keeps using the existing `dsarchive/dsa_common` image.

The plugin adds **Analyses → cortex-medulla-threshold** to HistomicsUI. Threshold processing runs in a browser Web Worker; it is not a Slicer CLI job and does not need a DSA worker task image.

## 1. Prepare the plugin repository

The repository must be public or otherwise accessible to the DSA container. Its Python package must declare a Girder entry point, include the web client source in the pip package, and make the worker assets available in DSA's static directory.

The needed repository pieces are:

```text
setup.py
MANIFEST.in
girder_threshold_mask/
  __init__.py
  web_client/
    package.json
    main.js
    ThresholdMaskPanel.js
    contour-worker.js
    polygon-clipping.umd.min.js
    polygon-clipping.LICENSE
    ...
```

`setup.py` should declare the Girder plugin entry point and install the two worker assets into DSA's static output directory:

```python
entry_points={
    "girder.plugin": [
        "threshold_mask = girder_threshold_mask:ThresholdMaskPlugin",
    ],
},
data_files=[
    (
        "share/girder/static/built/plugins/threshold_mask",
        [
            "girder_threshold_mask/web_client/contour-worker.js",
            "girder_threshold_mask/web_client/polygon-clipping.umd.min.js",
            "girder_threshold_mask/web_client/polygon-clipping.LICENSE",
        ],
    ),
],
```

The existing `MANIFEST.in` includes `girder_threshold_mask/web_client/*`, so these files are included when pip builds the package from GitHub. The worker uses `importScripts('polygon-clipping.umd.min.js')`, so the two JavaScript files must be installed in the same directory.

If you need to restore the vendored polygon-clipping files from npm, run:

```bash
cd /tmp
npm pack polygon-clipping@0.15.7
mkdir -p /tmp/polygon-clipping-package
tar -xzf /tmp/polygon-clipping-0.15.7.tgz -C /tmp/polygon-clipping-package

cd ~/projects/cortex-medulla-threshold
cp /tmp/polygon-clipping-package/package/dist/polygon-clipping.umd.min.js \
  girder_threshold_mask/web_client/
cp /tmp/polygon-clipping-package/package/LICENSE.md \
  girder_threshold_mask/web_client/polygon-clipping.LICENSE
```

Confirm the package files are present:

```bash
ls -l girder_threshold_mask/web_client/contour-worker.js \
  girder_threshold_mask/web_client/polygon-clipping.umd.min.js \
  girder_threshold_mask/web_client/polygon-clipping.LICENSE
```

## 2. Commit and push the plugin package

From the plugin repository, commit the setup, manifest, and browser files, then push the branch that DSA will install:

```bash
cd ~/projects/cortex-medulla-threshold
git status
git add setup.py MANIFEST.in girder_threshold_mask
git commit -m "Package threshold worker assets for DSA"
git push origin main
```

Use a commit SHA for production deployments so that a future change to `main` does not silently change the installed plugin. Get the current commit with:

```bash
git rev-parse HEAD
```

## 3. Configure DSA provisioning

Open the `provision.yaml` used by the DSA instance. In the local Compose example, this is:

```text
~/projects/digital_slide_archive/devops/dsa/provision.yaml
```

Add or update these **top-level** settings. Merge them into the existing file; do not replace the rest of its provisioning configuration.

```yaml
pip:
  - "--upgrade git+https://github.com/UFerminJamie/cortex-medulla-threshold.git@COMMIT_SHA"
rebuild-client: True
```

Replace `COMMIT_SHA` with the value from `git rev-parse HEAD`. For a quick trial, `@main` can be used instead. Do not add a `shell:` section for this package layout.

The `pip` setting installs the Girder plugin from GitHub. `rebuild-client: True` runs `girder build` so the installed HistomicsUI code is compiled into DSA's web client.

## 4. Check the Compose configuration

Keep the existing `girder` image and build configuration in `docker-compose.yml`; do not change them to the plugin Dockerfile. Confirm the Compose file still resolves:

```bash
cd ~/projects/digital_slide_archive/devops/dsa
docker compose config --services
```

The commands below assume the base DSA stack has already built and started successfully. If it has not, complete that first.

## 5. Recreate Girder to install the plugin

On the Mac, run from `devops/dsa`:

```bash
DSA_USER="$(id -u):$(id -g)" docker compose up -d --force-recreate girder
```

If the host port is supplied inline instead of in `.env`, include the same port setting. For example, for port 8090:

```bash
DSA_USER="$(id -u):$(id -g)" DSA_PORT=8090 \
  docker compose up -d --force-recreate girder
```

On a server, run the equivalent command in that DSA deployment's Compose directory, using that host's `DSA_USER`, project name, and port configuration. Do not run `docker compose down -v`; it can remove Docker-managed volumes.

Watch startup and provisioning:

```bash
docker compose logs -f girder
```

Provisioning installs packages and rebuilds the client during Girder startup. This can make startup take longer, and the GitHub repo must be reachable from the container.

## 6. Verify the installed worker assets

After Girder has started, check that the package placed both worker files where the browser expects them:

```bash
docker compose exec girder ls -l \
  /opt/venv/share/girder/static/built/plugins/threshold_mask
```

The output should contain:

```text
contour-worker.js
polygon-clipping.umd.min.js
```

This check matters because `pip` installs these files before `girder build` runs. If they are missing afterward, stop and adjust the plugin packaging/build approach; the browser worker will not load correctly without them.

## 7. Verify in the browser

Check the container status:

```bash
docker compose ps girder
```

Open the DSA site at `http://localhost:8080/histomics`, or use the configured host port (for example, `http://localhost:8090/histomics`). Open a slide and look under **Analyses** for **cortex-medulla-threshold**. If it does not appear, hard-refresh the page and inspect the Girder logs and browser developer console for build errors or missing static files.

## Troubleshooting

- **pip cannot reach GitHub:** verify the URL, commit SHA, repository visibility, and network access from the Girder container.
- **Plugin import or entry-point error:** confirm the package has `setup.py`, the `girder.plugin` entry point, and the Python module named in that entry point.
- **Plugin panel is missing:** check the `girder build` output and confirm `rebuild-client: True` is a top-level YAML setting.
- **Worker returns 404:** confirm the two files appear in `/opt/venv/share/girder/static/built/plugins/threshold_mask` after provisioning.
- **Push rejected as non-fast-forward:** fetch and review the remote changes, rebase or merge the local commit, then push. Do not force-push over the remote branch.

