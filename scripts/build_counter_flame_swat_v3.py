#!/usr/bin/env python3
"""Build Counter Flame SWAT V3 from the original high-detail V2 mesh.

Anatomy-based reshaping keeps the V2's face, gear, 38k triangles and empty
weapon-grip pose, while narrowing its bulky chest, waist and limbs for a more
believable athletic operator. All dimensions are in metres; Y is up.

Run the V2 generator before this one; V2 remains available as an archived asset.
No new rifle or animation is added to this inspection-model version.
"""
from pathlib import Path
import numpy as np
import trimesh

BASE = Path(__file__).resolve().parents[1]
SOURCE = BASE / 'public/models/counter_flame_swat_v2.glb'
TARGET = BASE / 'public/models/counter_flame_swat_v3.glb'


def reshape_operator(scene):
    """Apply smooth, height-dependent body slimming in world space.

    The head keeps its natural width, shoulders/vest narrow about 10-13%,
    hips narrow 10%, legs and boots narrow 6%. The vest and pouches are also
    slightly shallower, without losing realistic details or finger poses.
    """
    if not scene.geometry:
        raise ValueError('Missing SWAT geometry')
    parts = scene.dump()  # Bake glTF scene transforms into geometry.
    for mesh in parts:
        p = np.asarray(mesh.vertices).copy()
        if p.size == 0:
            continue
        y = p[:, 1]
        # Smooth linear interpolation avoids sharp seams at waist, neck and knee.
        width = np.interp(y,
            [-0.1, 0.20, 0.60, 0.93, 1.10, 1.26, 1.48, 1.63, 1.74, 1.85, 2.05],
            [ .95,  .95,  .94,  .91,  .90,  .88,  .87,  .90,  .97,  .99,  .99])
        depth = np.interp(y,
            [-0.1, 0.20, 0.70, 1.02, 1.24, 1.47, 1.63, 1.78, 2.05],
            [ .96,  .96,  .95,  .92,  .90,  .90,  .94,  .99,  .99])
        p[:, 0] *= width
        p[:, 2] *= depth
        mesh.vertices = p
        mesh.fix_normals()
    return trimesh.util.concatenate(parts)


def main():
    if not SOURCE.is_file():
        raise FileNotFoundError(f'{SOURCE}: generate SWAT V2 before V3')
    source = trimesh.load(SOURCE, force='scene')
    model = reshape_operator(source)
    if len(model.faces) < 30000:
        raise ValueError(f'Expected detailed V2 mesh, got {len(model.faces)} triangles')
    if not np.isfinite(model.vertices).all():
        raise ValueError('Model geometry contains invalid coordinates')
    bounds = model.bounds
    if not (1.8 < bounds[1, 1] - bounds[0, 1] < 2.1):
        raise ValueError(f'Unexpected height: {bounds}')
    output = trimesh.Scene()
    output.add_geometry(model, geom_name='CF3_slim_realistic_operator_empty_hands')
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    TARGET.write_bytes(output.export(file_type='glb'))
    old_width = source.bounds[1, 0] - source.bounds[0, 0]
    new_width = bounds[1, 0] - bounds[0, 0]
    print(f'SWAT V3: {len(model.faces)} triangles; width {old_width:.3f} -> {new_width:.3f} m '
          f'({(1-new_width/old_width)*100:.1f}% narrower); '
          f'{TARGET.stat().st_size:,} bytes; hands empty.')


if __name__ == '__main__':
    main()
