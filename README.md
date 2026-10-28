# Cortex–Medulla Threshold

A Girder/HistomicsUI plugin for interactive cortex/medulla thresholding. It adds **Analyses → cortex-medulla-threshold** to the slide viewer. Threshold calculations run in a browser Web Worker; there is no server job.

The live preview shows translucent filled regions. Saving writes separate merged cortex and medulla contour annotations with the chosen threshold and source heatmap provenance. It does not write raster masks or alter source heatmaps.

## Plugin entrypoint and architecture

This is a **Girder web-client plugin**, so its Python package entrypoint is declared in `setup.py`:

```ini
 girder.plugin = threshold_mask = girder_threshold_mask:ThresholdMaskPlugin
```

The installed DSA image loads that Girder plugin and builds its browser bundle with `girder build`. The browser worker and `polygon-clipping` asset are copied into the served static path by the Dockerfile.

The referenced Arterioral Hyalinosis repository is a **Slicer CLI job**. Its `ENTRYPOINT` launches `slicer_cli_web.cli_list_entrypoint`, which is correct for an analysis that DSA submits to a worker. Using that entrypoint here would replace the DSA Girder server process and remove the live browser panel. This plugin therefore keeps the Girder entrypoint and inherits the DSA server entrypoint from `dsarchive/dsa_common`.

## Build and publish

```sh
docker build -t uferminjamie/cortex-medulla-threshold:0.2.0 .
docker push uferminjamie/cortex-medulla-threshold:0.2.0
```

The image is the DSA Girder server image with this plugin installed and its client bundle built, not a standalone worker-job image. It targets `linux/amd64` for the UF PubApps VM.

## Deploy to an existing DSA on PubApps

PubApps uses rootless Podman. Add `deploy/docker-compose.threshold-plugin.yml` as an overlay to the existing DSA Compose stack and recreate **only** its `girder` service. Keep that instance's worker, MongoDB, assetstore mounts, provisioning file, secrets, network, and published port unchanged. Do not run Docker on PubApps.

From the existing DSA Compose directory, pull and deploy the image with the deployment's established Podman Compose provider, for example:

```sh
podman pull docker.io/uferminjamie/cortex-medulla-threshold:0.2.0
podman compose -p dsa -f docker-compose.yml -f /path/to/deploy/docker-compose.threshold-plugin.yml up -d girder
```

Use the instance's existing project name and Compose files in place of `dsa` and `docker-compose.yml`. The overlay only changes the Girder image. Before applying it, confirm the instance's URL, port mapping, SSH target, and Compose project so the correct DSA is restarted.

`rebuild-client: False` is appropriate because the browser bundle is already built into the image.

## Local checks

```sh
node --check girder_threshold_mask/web_client/ThresholdMaskPanel.js
node --check girder_threshold_mask/web_client/contour-worker.js
node --test tests/logic.test.cjs
```
