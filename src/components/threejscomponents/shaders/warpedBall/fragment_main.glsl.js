const fragmentMain = /*glsl*/ `normal = perturbNormalArb( - vViewPosition, normal, vec2(dFdx(vDisplacement), dFdy(vDisplacement)), faceDirection ); `
export default fragmentMain