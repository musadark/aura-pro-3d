import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

/** Original procedural concept geometry. Replace these groups with a GLB later. */
export function createProduct() {
  const shell = new THREE.MeshPhysicalMaterial({ color: 0x090f13, metalness: .35, roughness: .24, clearcoat: 1, clearcoatRoughness: .16 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0x8c9fa2, metalness: 1, roughness: .24 });
  const silicone = new THREE.MeshStandardMaterial({ color: 0x0b1114, roughness: .78, metalness: .05 });
  const black = new THREE.MeshStandardMaterial({ color: 0x030607, roughness: .67 });
  const led = new THREE.MeshBasicMaterial({ color: 0xbff7da });
  const materials = { shell, chrome, silicone, black, led };

  function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, position: number[] = [0,0,0]) {
    const item = new THREE.Mesh(geometry, material);
    item.position.set(position[0], position[1], position[2]);
    item.castShadow = true; item.receiveShadow = true;
    return item;
  }
  function ellipsoid(scale: number[], position: number[], material: THREE.Material) {
    const item = mesh(new THREE.SphereGeometry(1, 28, 18), material, position);
    item.scale.set(scale[0], scale[1], scale[2]); return item;
  }
  function earbud(side: number) {
    const bud = new THREE.Group();
    bud.add(ellipsoid([.36,.33,.3], [0,.17,0], shell));
    const stem = mesh(new THREE.CapsuleGeometry(.125,.7,8,24), shell, [.18,-.4,.02]);
    stem.rotation.z = -.05; bud.add(stem);
    const cap = mesh(new THREE.CylinderGeometry(.126,.126,.025,32), chrome, [.198,-.761,.02]); bud.add(cap);
    const nozzle = mesh(new THREE.CylinderGeometry(.14,.18,.18,28), shell, [-.29,.16,.08]);
    nozzle.rotation.z = Math.PI/2; bud.add(nozzle);
    const tip = ellipsoid([.22,.205,.205],[-.44,.16,.08],silicone); bud.add(tip);
    const grill = mesh(new THREE.CircleGeometry(.126,28), black,[-.627,.16,.08]); grill.rotation.y = -Math.PI/2; bud.add(grill);
    const rim = mesh(new THREE.TorusGeometry(.126,.009,8,32), chrome,[-.63,.16,.08]); rim.rotation.y = -Math.PI/2; bud.add(rim);
    // Small microphone ports and faceplate catch the light as the model turns.
    bud.add(ellipsoid([.067,.023,.016],[.10,.315,.257],black));
    bud.add(ellipsoid([.022,.069,.014],[.185,-.40,.145],black));
    const face = ellipsoid([.235,.24,.018],[.035,.18,.277],shell); bud.add(face);
    // All grille dots share one GPU draw call instead of 29 separate meshes.
    const dots = new THREE.InstancedMesh(new THREE.CircleGeometry(.006,6),chrome,29);
    const dotTransform = new THREE.Object3D();
    dotTransform.rotation.y = -Math.PI / 2;
    let dotIndex = 0;
    for (let row=-3;row<=3;row++) for(let col=-3;col<=3;col++) {
      if(row*row+col*col>9) continue;
      dotTransform.position.set(-.631,.16+row*.029,.08+col*.029);
      dotTransform.updateMatrix();
      dots.setMatrixAt(dotIndex++,dotTransform.matrix);
    }
    dots.instanceMatrix.needsUpdate = true; bud.add(dots);
    if (side < 0) bud.rotation.y = Math.PI;
    return bud;
  }
  const left = earbud(1), right = earbud(1);
  const pair = new THREE.Group(); pair.add(left,right);
  const chargingCase = new THREE.Group();
  const base = mesh(new RoundedBoxGeometry(1.65,.78,.94,5,.28),shell,[0,-.15,0]); chargingCase.add(base);
  const inset = mesh(new RoundedBoxGeometry(1.47,.09,.79,4,.20),silicone,[0,.23,0]); chargingCase.add(inset);
  const seam = mesh(new RoundedBoxGeometry(1.57,.014,.87,4,.006),black,[0,.245,0]); chargingCase.add(seam);
  for(const x of [-.43,.43]) {
    const socket=ellipsoid([.28,.048,.29],[x,.292,.04],black); chargingCase.add(socket);
  }
  const hinge = new THREE.Group(); hinge.position.set(0,.25,-.36); chargingCase.add(hinge);
  const lid = mesh(new RoundedBoxGeometry(1.65,.37,.94,5,.25),shell,[0,.17,.36]); hinge.add(lid);
  const lidInside=mesh(new RoundedBoxGeometry(1.44,.035,.73,4,.20),silicone,[0,-.005,.36]); hinge.add(lidInside);
  const light=mesh(new THREE.CapsuleGeometry(.012,.06,4,8),led,[0,-.12,.475]); light.rotation.z=Math.PI/2; chargingCase.add(light);
  const port = mesh(new RoundedBoxGeometry(.18,.05,.025,2,.02),black,[0,-.49,.37]); chargingCase.add(port);
  return { pair, left, right, chargingCase, hinge, materials };
}
