#!/usr/bin/env python3
"""Generate Counter Flame SWAT V4: a grittier old-school tactical operator.

Uses our detailed V2 geometry as the source: preserves helmet, face mask,
vest, pouches, boots and the empty hands posed around an imaginary rifle.
Narrows the silhouette, hardens the vest, roughens the geometry and darkens
the colors. Intentionally uses flat normals rather than toy-like smoothing.
"""
from pathlib import Path
import numpy as np
import trimesh

BASE = Path(__file__).resolve().parents[1]
SOURCE = BASE / "public/models/counter_flame_swat_v2.glb"
TARGET = BASE / "public/models/counter_flame_swat_v4.glb"


def recolor(colors, vertices):
    rgb = colors[:, :3].astype(np.float64)
    y = vertices[:, 1]
    x = vertices[:, 0]
    z = vertices[:, 2]
    rgb = rgb * np.array([0.80, 0.82, 0.78]) + np.array([5.0, 4.0, 2.0])
    torso = np.clip(1.0 - np.abs(y - 1.30) / 0.65, 0, 1)
    rgb *= (1.0 - torso[:, None] * np.array([0.06, 0.05, 0.03]))
    grime = (np.sin(x * 19.0 + y * 7.0) + np.cos(z * 17.0 - y * 5.0)) * 0.5
    grime2 = np.sin((x + z) * 31.0 + y * 11.0)
    wear = 0.5 * grime + 0.5 * grime2
    rgb += wear[:, None] * np.array([7.0, 8.0, 5.0])
    leg = np.clip((0.82 - y) / 0.82, 0, 1)
    rgb *= (1.0 - leg[:, None] * np.array([0.12, 0.10, 0.07]))
    dark = rgb.mean(axis=1) < 58
    rgb[dark] *= np.array([0.88, 0.92, 0.92])
    skin = (rgb[:, 0] > 95) & (rgb[:, 1] > 70) & (rgb[:, 2] > 60)
    rgb[skin] = rgb[skin] * np.array([0.90, 0.84, 0.82]) + np.array([6.0, 3.0, 1.0])
    rgb = np.clip(rgb, 0, 255).astype(np.uint8)
    return np.column_stack([rgb, np.full(len(rgb), 255, dtype=np.uint8)])


def reshape(vertices):
    p = vertices.copy()
    y, x, z = p[:, 1], p[:, 0], p[:, 2]
    width = np.interp(y,
        [-0.1, 0.20, 0.60, 0.95, 1.10, 1.22, 1.38, 1.55, 1.68, 1.80, 2.05],
        [ .94,  .94,  .93,  .90,  .88,  .86,  .84,  .86,  .89,  .95,  .98])
    depth = np.interp(y,
        [-0.1, 0.20, 0.60, 1.00, 1.22, 1.38, 1.55, 1.70, 2.05],
        [ .95,  .95,  .94,  .90,  .86,  .84,  .86,  .93,  .98])
    p[:, 0] *= width
    p[:, 2] *= depth
    shoulder = np.clip(1.0 - np.abs(y - 1.56) / 0.18, 0, 1)
    p[:, 0] += np.sign(x) * shoulder * 0.010
    p[:, 2] -= shoulder * 0.012 * np.sign(z + 1e-6)
    vest = np.clip(1.0 - np.abs(y - 1.33) / 0.28, 0, 1)
    p[:, 2] = np.where(z < 0, p[:, 2] + vest * 0.010, p[:, 2] - vest * 0.004)
    p[:, 0] += np.sign(x) * vest * np.minimum(np.abs(x), 0.22) * 0.015
    rugged = (np.sin(y * 18.0 + x * 22.0) + np.cos(y * 14.0 - z * 19.0)) * 0.0035
    rugged *= np.clip(1.0 - np.abs(y - 1.20) / 0.95, 0, 1)
    p[:, 0] += rugged * np.sign(x + 1e-6)
    p[:, 2] += rugged * np.sign(z + 1e-6)
    knee = np.clip(1.0 - np.abs(y - 0.55) / 0.10, 0, 1)
    p[:, 2] -= knee * 0.007
    return p


def main():
    if not SOURCE.is_file():
        raise FileNotFoundError(f"First generate V2: {SOURCE}")
    scene = trimesh.load(SOURCE, force="scene")
    mesh = trimesh.util.concatenate(scene.dump())
    if len(mesh.faces) < 30000:
        raise ValueError("Unexpected incomplete source mesh")
    mesh.vertices = reshape(np.asarray(mesh.vertices))
    if hasattr(mesh.visual, "vertex_colors") and len(mesh.visual.vertex_colors) == len(mesh.vertices):
        mesh.visual.vertex_colors = recolor(mesh.visual.vertex_colors, np.asarray(mesh.vertices))
    mesh.unmerge_vertices()  # Face-specific normals: rugged CS 1.6-style shading.
    mesh.fix_normals()
    if not np.isfinite(mesh.vertices).all():
        raise ValueError("SWAT V4 produced nonfinite vertices")
    result = trimesh.Scene()
    result.add_geometry(mesh, geom_name="CF4_gritty_ct_operator_empty_hands")
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    TARGET.write_bytes(result.export(file_type="glb"))
    old_width = scene.bounds[1, 0] - scene.bounds[0, 0]
    new_width = mesh.bounds[1, 0] - mesh.bounds[0, 0]
    print(f"SWAT V4: {len(mesh.faces)} triangles, "
          f"width {old_width:.3f} -> {new_width:.3f} m; "
          f"{TARGET.stat().st_size:,} bytes. No held weapon.")


if __name__ == "__main__":
    main()
