import bpy, math, sys
from mathutils import Vector, Matrix
from math import sin,cos,pi
b=bpy
b.ops.object.select_all(action='SELECT')
b.ops.object.delete()
S=b.context.scene
S.render.engine='BLENDER_WORKBENCH'
S.display.shading.light='STUDIO'
S.display.shading.studiolight_rotate_z=.6
S.display.shading.color_type='MATERIAL'
S.display.shading.background_type='WORLD'
S.world.color=(.006,.007,.008)
S.display.shading.show_cavity=True
S.display.shading.cavity_type='BOTH'
S.display.shading.cavity_ridge_factor=1.35
S.display.shading.cavity_valley_factor=1.15
S.display.shading.show_shadows=True
S.render.resolution_x=1280
S.render.resolution_y=720
S.render.resolution_percentage=100
S.render.image_settings.file_format='PNG'
S.render.film_transparent=True
S.display.render_aa='FXAA'
root=b.data.objects.new('Emirati',None)
S.collection.objects.link(root)
parts=[]
def mat(name,rgb):
 m=b.data.materials.new(name);m.diffuse_color=(*rgb,1);return m
black=mat('Brushed titanium',(.073,.079,.083))
edge=mat('Polished edge',(.25,.26,.27))
dial=mat('Graphite',(.025,.028,.032))
rubber=mat('Strap',(.034,.036,.04))
gold=mat('Champagne gold',(.63,.39,.14))
light=mat('Ivory',(.81,.72,.55))
dark=mat('Movement',(.115,.105,.09))
def part(o,name,m,g):
 o.name=name;o.parent=root;o.data.materials.append(m);parts.append((o,o.location.copy(),g));return o
def cy(n,r,d,x,y,z,m,g=0,v=64):
 b.ops.mesh.primitive_cylinder_add(vertices=v,radius=r,depth=d,location=(x,y,z))
 o=part(b.context.object,n,m,g)
 q=o.modifiers.new('Machined chamfer','BEVEL');q.width=min(.035,d*.23);q.segments=2
 o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
 return o
def tor(n,r,t,x,y,z,m,g=0):
 b.ops.mesh.primitive_torus_add(major_segments=64,minor_segments=12,major_radius=r,minor_radius=t,location=(x,y,z))
 return part(b.context.object,n,m,g)
def cube(n,x,y,z,w,h,d,m,g=0,a=0):
 b.ops.mesh.primitive_cube_add(size=1,location=(x,y,z));o=b.context.object;o.dimensions=(w,h,d)
 b.ops.object.transform_apply(location=False,rotation=False,scale=True);o.rotation_euler.z=a
 q=o.modifiers.new('Rounded corners','BEVEL');q.width=min(w,h,d)*.24;q.segments=3
 o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
 return part(o,n,m,g)
def label(s,x,y,z,size,m,g=2):
 c=b.data.curves.new(s,'FONT');c.body=s;c.align_x='CENTER';c.size=size
 o=b.data.objects.new(s,c);S.collection.objects.link(o);o.location=(x,y,z);part(o,s,m,g)
def gear(x,y,z,r,n,g):
 cy('Gear',r*.85,.055,x,y,z,gold,g,v=32)
 for i in range(n):
  a=i*2*pi/n
  cube('Tooth',x+r*cos(a),y+r*sin(a),z,.10,.073,.065,gold,g,a)
for sign in (-1,1):
 for side in (-1,1): cube('Lug',side*.72,sign*1.52,-.04,.26,.71,.27,black,0,side*sign*-.13)
 for j in range(10):
  y=sign*(1.79+j*.14)
  cube('Strap link',0,y,-.15-.035*j,1.44-.043*j,.146,.22,rubber,sign*5)
  cube('Stitch',.52-.015*j,y,-.025-.035*j,.04,.063,.016,dark,sign*5)
  cube('Stitch',-.52+.015*j,y,-.025-.035*j,.04,.063,.016,dark,sign*5)
cy('Rear cover',1.53,.16,0,0,-.28,edge,-2)
tor('Rear lip',1.43,.047,0,0,-.38,black,-2)
cy('Titanium case',1.62,.42,0,0,-.035,black,0)
cy('Movement plate',1.43,.095,0,0,.19,dark,1)
for x,y,r in [(-.48,.35,.34),(.48,.31,.28),(.12,-.34,.45),(-.64,-.35,.23)]:
 gear(x,y,.252,r,20,1)
# Dial mesh with an open tourbillon aperture.
center=(0,-.70);verts=[]
for i in range(128):
 a=2*pi*i/128
 verts.extend([(1.46*cos(a),1.46*sin(a),.33),(center[0]+.355*cos(a),center[1]+.355*sin(a),.33)])
faces=[(2*i,2*((i+1)%128),2*((i+1)%128)+1,2*i+1) for i in range(128)]
mesh=b.data.meshes.new('Open dial');mesh.from_pydata(verts,[],faces);mesh.update()
o=b.data.objects.new('Open dial',mesh);S.collection.objects.link(o);part(o,'Open dial',dial,2)
tor('Bezel',1.525,.095,0,0,.33,black,3)
tor('Polished bevel',1.543,.024,0,0,.39,edge,3)
tor('Chapter ring',1.422,.019,0,0,.367,gold,2)
for i in range(60):
 a=i*2*pi/60
 cube('Minute track',1.35*cos(a),1.35*sin(a),.355,.10 if i%5==0 else .044,.048 if i%5==0 else .014,.022,light if i%5==0 else edge,2,a)
for x in (-.65,.65):
 cy('Chronograph register',.30,.022,x,.12,.347,black,2)
 tor('Register rim',.28,.012,x,.12,.363,gold,2)
 for i in range(12):
  a=i*2*pi/12
  cube('Register index',x+.23*cos(a),.12+.23*sin(a),.369,.032,.012,.01,light,2,a)
 cube('Register hand',x,.18,.375,.021,.19,.014,gold,2,-.4)
tor('Tourbillon aperture',.351,.025,0,-.70,.367,gold,2)
tor('Tourbillon cage',.261,.024,0,-.70,.362,gold,4)
tor('Balance spring',.165,.018,0,-.70,.350,gold,4)
for i in range(3):
 a=i*2*pi/3
 cube('Cage arm',.12*cos(a),-.70+.12*sin(a),.375,.26,.021,.03,gold,4,a)
cy('Jewel',.056,.037,0,-.70,.372,mat('Ruby',(.46,.05,.08)),4)
label('A T W',0,.75,.352,.205,light)
label('E M I R A T I',0,.54,.352,.066,gold)
label('T O U R B I L L O N',0,-1.21,.355,.051,light)
for a,L in [(-.92,.83),(.84,.94),(2.66,.97)]:
 cube('Hand',-sin(a)*L*.42,cos(a)*L*.42,.43,.055 if a!=2.66 else .019,L,.022,gold,3,a)
cy('Pivot',.084,.036,0,0,.44,gold,3)
for y,r in [(0,.21),(.55,.13),(-.55,.13)]:
 o=cy('Crown and pushers',r,.27,1.69,y,.005,edge,0);o.rotation_euler.y=pi/2
b.ops.object.camera_add()
cam=b.context.object;S.camera=cam
cam.data.type='ORTHO'
folder=sys.argv[-1]
def smooth(t): return t*t*(3-2*t)
def shot(kind,t):
 for o,pos,g in parts:
  o.location=pos
  if kind=='assembly':
   spread=1-smooth(t)
   if abs(g)==5:o.location.y+=math.copysign(spread*.84,g)
   else:o.location.z+=g*spread*.58
  if kind=='macro' and g==4:
   a=t*2*pi
   o.location.x=pos.x*cos(a)-(pos.y+.70)*sin(a);o.location.y=-.70+pos.x*sin(a)+(pos.y+.70)*cos(a)
   if o.name.startswith('Cage arm'):o.rotation_euler.z=math.atan2(pos.y+.70,pos.x)+a
 root.rotation_euler=(0,0,0)
 if kind=='orbit':
  a=-.46+t*2*pi;loc=(8*sin(a),-1.05,8*cos(a));target=(0,0,0);cam.data.ortho_scale=11.8
 elif kind=='macro':
  loc=(-1.55+3*t,1.9-3.3*t,4.0);target=(-.52+1.04*t,.86-1.56*t,.27);cam.data.ortho_scale=3.45-.85*t
 else:
  a=.69-.28*t;loc=(8*sin(a),-3.1,8*cos(a));target=(0,0,.45*(1-t));cam.data.ortho_scale=14.0-2.2*t
 cam.location=loc
 back=(cam.location-Vector(target)).normalized()
 right=Vector((0,1,0)).cross(back).normalized()
 up=back.cross(right)
 cam.rotation_euler=Matrix((right,up,back)).transposed().to_euler()
 cam.data.shift_x=-.16 if kind=='orbit' else 0
 
counts={'orbit':49,'macro':37,'assembly':41}
import os
for kind,count in counts.items():
 os.makedirs(f'{folder}/{kind}',exist_ok=True)
 for i in range(count):
  shot(kind,i/(count-1))
  S.render.filepath=f'{folder}/{kind}/{i:03}.png'
  b.ops.render.render(write_still=True)
