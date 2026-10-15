#!/usr/bin/env python3
"""Generate Counter Flame SWAT V5: more human shoulders and varied gear colors.

V5 starts from the original detailed V2 mesh, keeps the modeled vest, pouches,
helmet, mask, boots and empty hands, then reshapes the silhouette to remove the
rounded shoulder bulges and make the body feel more anatomical. It also assigns
separate color families to cloth, vest, gloves, boots, mask and kneepads so
that the operator no longer reads as a single flat color block.
"""
from pathlib import Path
import numpy as np
import trimesh

BASE = Path(__file__).resolve().parents[1]
SOURCE = BASE / 'public/models/counter_flame_swat_v2.glb'
TARGET = BASE / 'public/models/counter_flame_swat_v5.glb'


def recolor(colors, vertices):
    rgb = colors[:, :3].astype(np.float64)
    x, y, z = vertices[:, 0], vertices[:, 1], vertices[:, 2]
    out = rgb.copy()

    boots = y < 0.23
    shins = (y >= 0.23) & (y < 0.70)
    thighs = (y >= 0.70) & (y < 1.08)
    waist = (y >= 1.08) & (y < 1.20)
    torso = (y >= 1.20) & (y < 1.57)
    shoulders = (y >= 1.45) & (np.abs(x) > 0.22)
    head = y >= 1.62
    arms = (y >= 1.05) & (y < 1.55) & (np.abs(x) > 0.14)
    hands = (y >= 0.95) & (y < 1.42) & (np.abs(x) > 0.13) & (z < -0.20)
    front = z < -0.08

    out[boots] = np.array([66, 57, 48])
    out[shins | thighs] = np.array([88, 98, 82])
    out[waist] = np.array([68, 74, 58])
    out[torso] = np.where(front[torso, None], np.array([[96, 102, 84]]), np.array([[80, 89, 74]]))
    out[shoulders] = np.array([84, 92, 76])
    out[arms] = np.array([85, 95, 78])
    out[hands] = np.array([42, 45, 41])
    out[head] = np.where(front[head, None], np.array([[36, 38, 40]]), np.array([[58, 64, 54]]))

    chestgear = torso & front & (np.abs(x) < 0.26)
    out[chestgear] = np.array([108, 107, 82])
    sidegear = torso & (np.abs(x) > 0.22)
    out[sidegear] = np.array([74, 80, 63])
    knees = (y > 0.46) & (y < 0.67) & front
    out[knees] = np.array([95, 101, 76])

    skin = (rgb[:, 0] > 90) & (rgb[:, 1] > 65) & (rgb[:, 2] > 50)
    out[skin] = np.array([132, 104, 90])
    eyes = head & front & (np.abs(x) < 0.09) & (y > 1.76)
    out[eyes] = np.array([28, 29, 28])

    noise = (np.sin(x * 27 + y * 11) + np.cos(z * 23 - y * 13)) * 0.5
    noise += np.sin((x - z) * 41 + y * 7) * 0.25
    noise2 = np.sin(y * 35 + np.sign(x + 1e-6) * 9) * 0.2
    wear = (noise + noise2)[:, None]
    out += wear * np.array([10.0, 8.0, 6.0])
    grime = np.clip((1.4 - y) / 1.6, 0, 1)[:, None]
    out *= 1.0 - grime * np.array([0.08, 0.06, 0.04])
    out[head] *= np.array([0.95, 0.97, 0.98])
    return np.column_stack([np.clip(out, 0, 255).astype(np.uint8), np.full(len(out), 255, dtype=np.uint8)])


def reshape(vertices):
    p = vertices.copy()
    x, y, z = p[:, 0], p[:, 1], p[:, 2]
    width = np.interp(y,
        [-0.1, 0.2, 0.6, 0.95, 1.10, 1.22, 1.38, 1.52, 1.62, 1.80, 2.05],
        [0.95, 0.95, 0.94, 0.91, 0.89, 0.86, 0.84, 0.84, 0.89, 0.96, 0.98])
    depth = np.interp(y,
        [-0.1, 0.2, 0.6, 1.0, 1.22, 1.38, 1.52, 1.66, 2.05],
        [0.96, 0.96, 0.95, 0.91, 0.87, 0.84, 0.85, 0.92, 0.98])
    p[:, 0] *= width
    p[:, 2] *= depth

    shoulder = np.clip(1.0 - np.abs(y - 1.54) / 0.17, 0, 1)
    outer = np.clip((np.abs(x) - 0.19) / 0.16, 0, 1)
    p[:, 0] -= np.sign(x) * shoulder * outer * 0.055
    p[:, 1] -= shoulder * outer * 0.025
    p[:, 2] -= shoulder * outer * np.where(z > 0, 0.010, 0.018)

    vest = np.clip(1.0 - np.abs(y - 1.34) / 0.25, 0, 1)
    p[:, 2] = np.where(z < 0, p[:, 2] + vest * 0.012, p[:, 2] - vest * 0.008)
    p[:, 0] += np.sign(x) * vest * np.minimum(np.abs(x), 0.22) * 0.012

    upperarm = (y > 1.22) & (y < 1.56) & (np.abs(x) > 0.18) & (np.abs(x) < 0.42)
    p[upperarm, 0] -= np.sign(x[upperarm]) * 0.018 * np.clip(1.0 - np.abs(y[upperarm] - 1.40) / 0.18, 0, 1)

    rugged = (np.sin(y * 19 + x * 24) + np.cos(y * 15 - z * 21)) * 0.0032
    rugged *= np.clip(1.0 - np.abs(y - 1.18) / 1.0, 0, 1)
    p[:, 0] += rugged * np.sign(x + 1e-6)
    p[:, 2] += rugged * np.sign(z + 1e-6)

    knee = np.clip(1.0 - np.abs(y - 0.56) / 0.11, 0, 1)
    elbow = np.clip(1.0 - np.abs(y - 1.28) / 0.10, 0, 1)
    p[:, 2] -= knee * 0.007
    p[:, 2] -= elbow * 0.004 * (np.abs(x) > 0.18)
    return p


def main():
    if not SOURCE.is_file():
        raise FileNotFoundError(f'First generate V2: {SOURCE}')
    scene = trimesh.load(SOURCE, force='scene')
    mesh = trimesh.util.concatenate(scene.dump())
    if len(mesh.faces) < 30000:
        raise ValueError('Unexpected incomplete source mesh')
    mesh.vertices = reshape(np.asarray(mesh.vertices))
    if hasattr(mesh.visual, 'vertex_colors') and len(mesh.visual.vertex_colors) == len(mesh.vertices):
        mesh.visual.vertex_colors = recolor(mesh.visual.vertex_colors, np.asarray(mesh.vertices))
    mesh.unmerge_vertices()
    result = trimesh.Scene()
    result.add_geometry(mesh, geom_name='CF5_humanized_ct_operator_empty_hands')
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    TARGET.write_bytes(result.export(file_type='glb'))
    old_width = scene.bounds[1, 0] - scene.bounds[0, 0]
    new_width = mesh.bounds[1, 0] - mesh.bounds[0, 0]
    print(f'SWAT V5: {len(mesh.faces)} triangles, width {old_width:.3f} -> {new_width:.3f} m; {TARGET.stat().st_size:,} bytes')


if __name__ == '__main__':
    main()
