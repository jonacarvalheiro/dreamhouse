"""Monta a casa no Blender a partir da cena exportada da planta e renderiza as vistas com Cycles.

Uso (normalmente via `npm run render`):
  blender -b -P scripts/render/blender_render.py -- --scene render/scene-a.json --views render/views.json \
      --out render/out [--only wc-duche] [--style terrazzo] [--samples 96] [--width 1280]

Coordenadas da planta: x para nascente, y para sul. No Blender: X = x, Y = -y, Z = altura.
"""
import argparse
import json
import math
import os
import sys

import bpy
import numpy as np
from mathutils import Vector


def hexrgb(h, a=1.0):
    h = h.lstrip('#')
    srgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb]
    return (*lin, a)


# Ambientes: cores e padrões. Os nomes seguem src/decor/data.ts.
STYLES = {
    'madeira-azul': {
        'plaster': '#ECE3D3', 'wet': ('travertine', '#D8CBB5'),
        'tile_shower': ('hydraulic', 'star', '#55697A', '#E9DFCC'), 'tile_dado': ('hydraulic', 'star', '#55697A', '#E9DFCC'),
        'oak_slab': '#8A6440', 'metal': '#B08D57', 'stone': '#E2D8C6',
    },
    'terrazzo': {
        'plaster': '#F1EBE1', 'wet': ('pebble', '#9E4A2F'),
        'tile_shower': ('terrazzo', '#E6DACB', '#B5552F'), 'tile_dado': ('terrazzo', '#E6DACB', '#B5552F'),
        'oak_slab': '#E6DACB', 'metal': '#B08D57', 'stone': '#F4F1EC',
    },
    'amarelo': {
        'plaster': '#F4EFE6', 'wet': ('hydraulic', 'diamond', '#C0623B', '#F1E6D2'),
        'tile_shower': ('zellige', '#D19A2E'), 'tile_dado': ('zellige', '#D19A2E'),
        'oak_slab': '#9A7148', 'metal': '#B08D57', 'stone': '#E9E2D6',
    },
    'hidraulico': {
        'plaster': '#EEE3D0', 'wet': ('travertine', '#B9643F'),
        'tile_shower': ('hydraulic', 'rosette', '#C0623B', '#EDE3CF', '#8E9C7A'), 'tile_dado': ('plain', '#EDE3CF', 0.075, 0.3),
        'oak_slab': '#7A5636', 'metal': '#4A3426', 'stone': '#E2D8C6',
    },
}


# ---------------------------------------------------------------- texturas desenhadas em código

def hydraulic_image(name, motif, fg, bg, accent=None, n=512):
    """Azulejo 20×20 com junta clara, desenhado com numpy para encaixar com os vizinhos."""
    if name in bpy.data.images:
        return bpy.data.images[name]
    u, v = np.meshgrid(np.linspace(-1, 1, n), np.linspace(-1, 1, n))
    f, b = np.array(hexrgb(fg)), np.array(hexrgb(bg))
    a = np.array(hexrgb(accent)) if accent else f
    img = np.tile(b, (n, n, 1))

    def star(x, y, s):
        return ((np.abs(x) + np.abs(y)) < 0.62 * s) | (np.maximum(np.abs(x), np.abs(y)) < 0.44 * s)

    if motif == 'star':
        m = star(u, v, 1.0)
        for cx in (-1, 1):
            for cy in (-1, 1):
                m |= star(u - cx, v - cy, 1.0)
        inner = star(u, v, 0.45)
        img[m] = f
        img[inner] = b
        img[star(u, v, 0.22)] = f
    elif motif == 'rosette':
        r = np.hypot(u, v)
        t = np.arctan2(v, u)
        petals = r < 0.55 * np.abs(np.cos(2 * t)) + 0.08
        ring = (r > 0.66) & (r < 0.74)
        img[ring] = a
        img[petals] = f
        img[r < 0.12] = a
        for cx in (-1, 1):
            for cy in (-1, 1):
                rc = np.hypot(u - cx, v - cy)
                tc = np.arctan2(v - cy, u - cx)
                img[rc < 0.32 * np.abs(np.cos(2 * tc + math.pi / 4)) + 0.04] = f
    elif motif == 'diamond':
        m = (np.abs(u) + np.abs(v)) < 0.7
        img[m] = f
        img[(np.abs(u) + np.abs(v)) < 0.35] = b
    grout = (np.abs(u) > 0.975) | (np.abs(v) > 0.975)
    img[grout] = np.array(hexrgb('#D9D2C3'))
    noise = (np.random.default_rng(7).random((n, n, 1)) - 0.5) * 0.03
    img[..., :3] = np.clip(img[..., :3] + noise, 0, 1)
    im = bpy.data.images.new(name, n, n, alpha=False, float_buffer=True)
    im.colorspace_settings.name = 'Linear Rec.709'
    im.pixels.foreach_set(img[::-1].astype(np.float32).ravel())
    im.pack()
    return im


# ---------------------------------------------------------------- nós

def planar(nt):
    """Coordenadas no plano da face (x,y no chão e teto; y,z ou x,z nas paredes), em metros."""
    N, L = nt.nodes, nt.links
    geo = N.new('ShaderNodeNewGeometry')
    pos = N.new('ShaderNodeSeparateXYZ'); L.new(geo.outputs['Position'], pos.inputs[0])
    nrm = N.new('ShaderNodeSeparateXYZ'); L.new(geo.outputs['Normal'], nrm.inputs[0])

    def m(op, a, b=None, v=None):
        n = N.new('ShaderNodeMath'); n.operation = op
        for i, s in enumerate((a, b)):
            if s is None:
                continue
            if isinstance(s, (int, float)):
                n.inputs[i].default_value = s
            else:
                L.new(s, n.inputs[i])
        return n.outputs[0]

    wz = m('GREATER_THAN', m('ABSOLUTE', nrm.outputs['Z']), 0.5)
    wx = m('MULTIPLY', m('SUBTRACT', 1.0, wz), m('GREATER_THAN', m('ABSOLUTE', nrm.outputs['X']), 0.5))
    wy = m('SUBTRACT', m('SUBTRACT', 1.0, wz), wx)
    X, Y, Z = pos.outputs['X'], pos.outputs['Y'], pos.outputs['Z']
    cu = m('ADD', m('MULTIPLY', X, m('ADD', wz, wy)), m('MULTIPLY', Y, wx))
    cv = m('ADD', m('MULTIPLY', Y, wz), m('MULTIPLY', Z, m('ADD', wx, wy)))
    comb = N.new('ShaderNodeCombineXYZ')
    L.new(cu, comb.inputs[0]); L.new(cv, comb.inputs[1])
    return comb.outputs[0]


def new_mat(name):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes['Principled BSDF']
    return mat, nt, bsdf


def mat_flat(name, color, rough=0.6, metal=0.0, bump=0.0):
    mat, nt, bsdf = new_mat(name)
    bsdf.inputs['Base Color'].default_value = hexrgb(color)
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    if bump:
        noise = nt.nodes.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value = 60
        b = nt.nodes.new('ShaderNodeBump'); b.inputs['Strength'].default_value = bump
        nt.links.new(noise.outputs['Fac'], b.inputs['Height'])
        nt.links.new(b.outputs['Normal'], bsdf.inputs['Normal'])
    return mat


def mat_planks(name, c1, c2, length, width, rough=0.55):
    mat, nt, bsdf = new_mat(name)
    N, L = nt.nodes, nt.links
    vec = planar(nt)
    brick = N.new('ShaderNodeTexBrick')
    brick.offset = 0.37
    brick.inputs['Scale'].default_value = 1.0
    brick.inputs['Brick Width'].default_value = length
    brick.inputs['Row Height'].default_value = width
    brick.inputs['Mortar Size'].default_value = 0.0025
    brick.inputs['Color1'].default_value = hexrgb(c1)
    brick.inputs['Color2'].default_value = hexrgb(c2)
    brick.inputs['Mortar'].default_value = hexrgb('#3a2a1c')
    brick.inputs['Bias'].default_value = 0.0
    L.new(vec, brick.inputs['Vector'])
    # veio ao comprido da tábua: ondas finas esticadas na direção do comprimento
    stretch = N.new('ShaderNodeMapping'); stretch.inputs['Scale'].default_value = (0.08, 1.0, 1.0)
    L.new(vec, stretch.inputs['Vector'])
    wave = N.new('ShaderNodeTexWave'); wave.bands_direction = 'Y'
    wave.inputs['Scale'].default_value = 1.2; wave.inputs['Distortion'].default_value = 1.5
    wave.inputs['Detail'].default_value = 4
    L.new(stretch.outputs['Vector'], wave.inputs['Vector'])
    mix = N.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'; mix.inputs['Factor'].default_value = 0.12
    L.new(brick.outputs['Color'], mix.inputs['A'])
    L.new(wave.outputs['Color'], mix.inputs['B'])
    L.new(mix.outputs['Result'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = rough
    b = N.new('ShaderNodeBump'); b.inputs['Strength'].default_value = 0.3
    L.new(brick.outputs['Fac'], b.inputs['Height']); L.new(b.outputs['Normal'], bsdf.inputs['Normal'])
    return mat


def mat_tiles(name, spec):
    kind = spec[0]
    mat, nt, bsdf = new_mat(name)
    N, L = nt.nodes, nt.links
    vec = planar(nt)
    if kind == 'hydraulic':
        motif, fg, bg = spec[1], spec[2], spec[3]
        accent = spec[4] if len(spec) > 4 else None
        size = 0.2
        img = hydraulic_image(f'hyd-{motif}-{fg}-{bg}', motif, fg, bg, accent)
        sc = N.new('ShaderNodeVectorMath'); sc.operation = 'SCALE'; sc.inputs['Scale'].default_value = 1 / size
        L.new(vec, sc.inputs[0])
        tex = N.new('ShaderNodeTexImage'); tex.image = img; tex.extension = 'REPEAT'
        L.new(sc.outputs[0], tex.inputs['Vector'])
        L.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
        bsdf.inputs['Roughness'].default_value = 0.35
        return mat
    if kind in ('zellige', 'plain', 'travertine'):
        color = spec[1]
        w = spec[2] if len(spec) > 2 else (0.1 if kind == 'zellige' else 0.6)
        h = spec[3] if len(spec) > 3 else w
        brick = N.new('ShaderNodeTexBrick'); brick.offset = 0.5 if kind == 'plain' else 0.0
        brick.inputs['Scale'].default_value = 1.0
        brick.inputs['Brick Width'].default_value = w
        brick.inputs['Row Height'].default_value = h
        brick.inputs['Mortar Size'].default_value = 0.0015 if kind == 'zellige' else 0.002
        brick.inputs['Color1'].default_value = hexrgb(color)
        c2 = Vector(hexrgb(color)[:3]) * (0.86 if kind == 'zellige' else 0.95)
        brick.inputs['Color2'].default_value = (*c2, 1)
        brick.inputs['Mortar'].default_value = hexrgb('#E8E1D3')
        L.new(vec, brick.inputs['Vector'])
        L.new(brick.outputs['Color'], bsdf.inputs['Base Color'])
        bsdf.inputs['Roughness'].default_value = 0.12 if kind == 'zellige' else 0.45
        if kind == 'zellige':
            noise = N.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value = 25
            L.new(vec, noise.inputs['Vector'])
            b = N.new('ShaderNodeBump'); b.inputs['Strength'].default_value = 0.25
            L.new(noise.outputs['Fac'], b.inputs['Height']); L.new(b.outputs['Normal'], bsdf.inputs['Normal'])
        return mat
    if kind == 'terrazzo':
        base, chip = spec[1], spec[2]
        noise = N.new('ShaderNodeTexVoronoi'); noise.inputs['Scale'].default_value = 45
        L.new(vec, noise.inputs['Vector'])
        ramp = N.new('ShaderNodeValToRGB'); ramp.color_ramp.interpolation = 'CONSTANT'
        ramp.color_ramp.elements[0].color = hexrgb(chip)
        ramp.color_ramp.elements[1].position = 0.28
        ramp.color_ramp.elements[1].color = hexrgb(base)
        L.new(noise.outputs['Distance'], ramp.inputs['Fac'])
        L.new(ramp.outputs['Color'], bsdf.inputs['Base Color'])
        bsdf.inputs['Roughness'].default_value = 0.3
        return mat
    if kind == 'pebble':
        vor = N.new('ShaderNodeTexVoronoi'); vor.feature = 'DISTANCE_TO_EDGE'; vor.inputs['Scale'].default_value = 22
        L.new(vec, vor.inputs['Vector'])
        ramp = N.new('ShaderNodeValToRGB')
        ramp.color_ramp.elements[0].color = hexrgb('#E8DCCB')
        ramp.color_ramp.elements[1].position = 0.06
        ramp.color_ramp.elements[1].color = hexrgb(spec[1])
        L.new(vor.outputs['Distance'], ramp.inputs['Fac'])
        L.new(ramp.outputs['Color'], bsdf.inputs['Base Color'])
        bsdf.inputs['Roughness'].default_value = 0.35
        return mat
    raise ValueError(kind)


def build_materials(style):
    s = STYLES[style]
    mats = {
        'wall': mat_flat('wall', s['plaster'], 0.85, bump=0.05),
        'wall_ext': mat_flat('wall_ext', s['plaster'], 0.85, bump=0.05),
        'pine': mat_planks('pine', '#C68A4E', '#B5773E', 2.4, 0.12, 0.5),
        'floor_wood': mat_planks('floor_wood', '#B08A62', '#9C7752', 1.2, 0.16, 0.45),
        'floor_wet': mat_tiles('floor_wet', s['wet']),
        'tile_shower': mat_tiles('tile_shower', s['tile_shower']),
        'tile_dado': mat_tiles('tile_dado', s['tile_dado']),
        'oak': mat_planks('oak', '#A27A52', '#956E48', 0.9, 0.2, 0.5),
        'oak_doors': mat_planks('oak_doors', '#B89270', '#AD8865', 0.5, 2.2, 0.5),
        'oak_slab': mat_planks('oak_slab', s['oak_slab'], s['oak_slab'], 3.0, 0.5, 0.45),
        'door': mat_planks('door', '#B08A62', '#A9845C', 0.7, 2.1, 0.5),
        'stair': mat_planks('stair', '#B98A5E', '#AE8055', 3.0, 0.26, 0.45),
        'linen': mat_flat('linen', '#F3EFE8', 0.95, bump=0.1),
        'pillow': mat_flat('pillow', '#FFFFFF', 0.95),
        'throw': mat_flat('throw', '#8A9A7B', 0.95, bump=0.15),
        'ceramic': mat_flat('ceramic', '#FAFAF7', 0.08),
        'stone': mat_flat('stone', s['stone'], 0.6, bump=0.1),
        'brass': mat_flat('brass', s['metal'], 0.3, metal=1.0),
        'steel': mat_flat('steel', '#9CA3AF', 0.25, metal=1.0),
        'mirror': mat_flat('mirror', '#F2F2F2', 0.02, metal=1.0),
    }
    mats['tile_shower'].name = 'tile_shower'
    g, nt, bsdf = new_mat('window_glass')
    nt.nodes.remove(bsdf)
    glass = nt.nodes.new('ShaderNodeBsdfGlass'); glass.inputs['Roughness'].default_value = 0.0
    nt.links.new(glass.outputs[0], nt.nodes['Material Output'].inputs['Surface'])
    mats['window_glass'] = g
    gb, nt, bsdf = new_mat('glass_block')
    bsdf.inputs['Base Color'].default_value = hexrgb('#F4FAF8')
    bsdf.inputs['Transmission Weight'].default_value = 1.0
    bsdf.inputs['Roughness'].default_value = 0.12
    bsdf.inputs['IOR'].default_value = 1.5
    wave = nt.nodes.new('ShaderNodeTexWave'); wave.inputs['Scale'].default_value = 18; wave.inputs['Distortion'].default_value = 3
    b = nt.nodes.new('ShaderNodeBump'); b.inputs['Strength'].default_value = 0.6
    nt.links.new(wave.outputs['Fac'], b.inputs['Height']); nt.links.new(b.outputs['Normal'], bsdf.inputs['Normal'])
    mats['glass_block'] = gb
    mats['mortar'] = mat_flat('mortar', '#ECE8E0', 0.9)
    return mats


# ---------------------------------------------------------------- geometria

def box(name, x, y, w, h, z0, z1, mat, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x + w / 2, -(y + h / 2), (z0 + z1) / 2))
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = (w, h, z1 - z0)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    ob.data.materials.append(mat)
    if bevel and min(w, h, z1 - z0) > 2.5 * bevel:
        mod = ob.modifiers.new('bevel', 'BEVEL'); mod.width = bevel; mod.segments = 3
    return ob


def vessel(name, c):
    """Lavatório de pousar: perfil de revolução com parede de 1,5 cm e fundo côncavo."""
    r, h = c['r'], c['z1'] - c['z0']
    profile = [(r * 0.55, 0.0), (r * 0.85, 0.02), (r * 0.98, h * 0.55), (r, h), (r - 0.015, h),
               (r * 0.9, h * 0.5), (r * 0.6, 0.03), (0.0, 0.025)]
    n = 64
    verts, faces = [], []
    for k in range(n):
        a = 2 * math.pi * k / n
        for (pr, pz) in profile:
            verts.append((c['cx'] + pr * math.cos(a), -c['cy'] + pr * math.sin(a), c['z0'] + pz))
    m = len(profile)
    for k in range(n):
        k2 = (k + 1) % n
        for j in range(m - 1):
            faces.append((k * m + j, k2 * m + j, k2 * m + j + 1, k * m + j + 1))
    verts.append((c['cx'], -c['cy'], c['z0']))
    bottom = len(verts) - 1
    for k in range(n):
        faces.append((bottom, ((k + 1) % n) * m, k * m))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.validate()
    for p in mesh.polygons:
        p.use_smooth = True
    ob = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def build(scene, mats):
    for i, b in enumerate(scene['boxes']):
        box(f"{b['mat']}.{i}", b['x'], b['y'], b['w'], b['h'], b['z0'], b['z1'], mats[b['mat']], b.get('bevel', 0))
    for i, c in enumerate(scene['cylinders']):
        ob = vessel(f"cyl.{i}", c) if c.get('bowl') else None
        if ob is None:
            bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=c['r'], depth=c['z1'] - c['z0'],
                                                location=(c['cx'], -c['cy'], (c['z0'] + c['z1']) / 2))
            ob = bpy.context.active_object
            ob.name = f"cyl.{i}"
            bpy.ops.object.shade_smooth()
        ob.data.materials.append(mats[c['mat']])
    for i, p in enumerate(scene['panes']):
        box(f"pane.{i}", p['x'], p['y'], p['w'], p['h'], p['z0'], p['z1'], mats['window_glass'])
    module, t = 0.2, 0.08
    for i, g in enumerate(scene['glass']):
        horizontal = g['w'] >= g['h']
        length = g['w'] if horizontal else g['h']
        curb = g.get('curb', 0.12)
        pad = 0.03
        box(f"curb.{i}", g['x'] - pad, g['y'] - pad, g['w'] + 2 * pad, g['h'] + 2 * pad, 0, curb, mats['tile_shower'], 0.006)
        cols = max(1, round(length / module))
        rows = max(1, round((g['z1'] - curb) / module))
        d = t - 0.02
        for r in range(rows + 1):
            z = curb + r * module - 0.005
            if horizontal:
                box(f"joint.{i}.r{r}", g['x'], g['y'] + 0.01, g['w'], d, z, z + 0.01, mats['mortar'])
            else:
                box(f"joint.{i}.r{r}", g['x'] + 0.01, g['y'], d, g['h'], z, z + 0.01, mats['mortar'])
        for c in range(cols + 1):
            a = c * module - 0.005
            if horizontal:
                box(f"joint.{i}.c{c}", g['x'] + max(0, a), g['y'] + 0.01, 0.01, d, curb, g['z1'], mats['mortar'])
            else:
                box(f"joint.{i}.c{c}", g['x'] + 0.01, g['y'] + max(0, a), d, 0.01, curb, g['z1'], mats['mortar'])
        for c in range(cols):
            for r in range(rows):
                a = c * module + 0.005
                z0 = curb + r * module + 0.005
                if horizontal:
                    box(f"gb.{i}.{c}.{r}", g['x'] + a, g['y'], module - 0.01, t, z0, z0 + module - 0.01, mats['glass_block'], 0.006)
                else:
                    box(f"gb.{i}.{c}.{r}", g['x'], g['y'] + a, t, module - 0.01, z0, z0 + module - 0.01, mats['glass_block'], 0.006)
    for i, l in enumerate(scene['lights']):
        bpy.ops.object.light_add(type='AREA', location=(l['x'], -l['y'], l['z']))
        ob = bpy.context.active_object
        ob.data.shape = 'RECTANGLE'
        ob.data.size, ob.data.size_y = l['w'], l['h']
        ob.data.energy = l['power']
        ob.data.color = (1.0, 0.82, 0.62)


def setup_render(samples, width):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = samples
    sc.cycles.use_adaptive_sampling = True
    sc.cycles.use_denoising = True
    sc.cycles.max_bounces = 8
    sc.render.resolution_x = width
    sc.render.resolution_y = round(width * 9 / 16)
    sc.view_settings.view_transform = 'AgX'
    sc.view_settings.look = 'AgX - Medium High Contrast'
    sc.view_settings.exposure = 0.0
    world = bpy.data.worlds.new('sky'); sc.world = world; world.use_nodes = True
    nt = world.node_tree
    sky = nt.nodes.new('ShaderNodeTexSky'); sky.sky_type = 'NISHITA'; sky.sun_elevation = math.radians(35)
    nt.links.new(sky.outputs['Color'], nt.nodes['Background'].inputs['Color'])
    nt.nodes['Background'].inputs['Strength'].default_value = 0.35


def camera(view):
    ex, ey, ez = view['eye']; tx, ty, tz = view['target']
    cam_data = bpy.data.cameras.new(view['id']); cam_data.lens = view['lens']; cam_data.clip_start = 0.03
    cam = bpy.data.objects.new(view['id'], cam_data)
    bpy.context.scene.collection.objects.link(cam)
    cam.location = (ex, -ey, ez)
    # câmara de nível (verticais direitas, como em fotografia de arquitetura); a inclinação passa para o deslocamento da lente
    flat = Vector((tx - ex, -(ty - ey), 0))
    cam.rotation_euler = flat.to_track_quat('-Z', 'Y').to_euler()
    pitch = math.atan2(tz - ez, flat.length)
    cam_data.shift_y = max(-0.3, min(0.3, math.tan(pitch) * cam_data.lens / 36))
    return cam


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument('--scene', required=True)
    ap.add_argument('--views', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--only', default=None)
    ap.add_argument('--style', default=None)
    ap.add_argument('--samples', type=int, default=96)
    ap.add_argument('--width', type=int, default=1280)
    ap.add_argument('--save-blend', action='store_true')
    a = ap.parse_args(argv)
    scene = json.load(open(a.scene))
    views = [v for v in json.load(open(a.views)) if v['variant'] == scene['variant'] and (not a.only or v['id'] in a.only.split(','))]
    if not views:
        print('Nenhuma vista para esta cena.'); return
    os.makedirs(a.out, exist_ok=True)
    styles = [a.style] if a.style else sorted({v['style'] for v in views})
    for style in styles:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        setup_render(a.samples, a.width)
        build(scene, build_materials(style))
        if a.save_blend:
            bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(os.path.join(a.out, f"{scene['variant']}-{style}.blend")))
        for v in views:
            if not a.style and v['style'] != style:
                continue
            bpy.context.scene.camera = camera(v)
            path = os.path.abspath(os.path.join(a.out, f"{scene['variant']}-{v['id']}-{style}.png"))
            bpy.context.scene.render.filepath = path
            bpy.ops.render.render(write_still=True)
            print('render:', path)


main()
