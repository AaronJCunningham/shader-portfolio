import {useEffect, useRef} from 'react'
import * as THREE from 'three/webgpu'
import {
  Fn,
  PI,
  TWO_PI,
  acos,
  cos,
  float,
  hash,
  instanceIndex,
  instancedArray,
  mix,
  pass,
  shapeCircle,
  sin,
  smoothstep,
  sqrt,
  uniform,
  vec2,
  vec3,
} from 'three/tsl'
import {bloom} from 'three/addons/tsl/display/BloomNode.js'
import type {MatterMotionRefs, MatterRendererStatus} from './types'

type MatterReelCanvasProps = {
  motion: MatterMotionRefs
  disabled: boolean
  onStatus: (status: MatterRendererStatus) => void
}

type NavigatorWithMemory = Navigator & {
  deviceMemory?: number
  connection?: {
    saveData?: boolean
  }
}

const getParticleTier = (nativeWebGPU: boolean) => {
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches
  const isMobile =
    window.matchMedia('(max-width: 767px)').matches ||
    (coarsePointer && window.matchMedia('(max-width: 1100px)').matches)
  const memory = (window.navigator as NavigatorWithMemory).deviceMemory || 8
  const requestedQuality = new URLSearchParams(window.location.search).get('matterQuality')

  let side = nativeWebGPU ? 640 : 400

  if (nativeWebGPU && (isMobile || memory <= 4)) side = 480
  if (nativeWebGPU && !isMobile && memory <= 6) side = 560
  if (!nativeWebGPU && isMobile) side = 300
  if (requestedQuality === 'low') side = nativeWebGPU ? 400 : 260
  if (requestedQuality === 'full' && nativeWebGPU && !isMobile) side = 640

  return {
    side,
    count: side * side,
    isMobile,
    detail:
      side === 640
        ? 'FULL / 640²'
        : side >= 480
          ? 'BALANCED'
          : 'COMPATIBILITY',
  }
}

export default function MatterReelCanvas({
  motion,
  disabled,
  onStatus,
}: MatterReelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const navigatorWithHints = window.navigator as NavigatorWithMemory
    const shouldStayStatic =
      disabled ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      navigatorWithHints.connection?.saveData === true

    if (shouldStayStatic) {
      onStatus({
        phase: 'ready',
        backend: 'STATIC',
        particleCount: 0,
        detail: 'REDUCED MOTION',
      })
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    let disposed = false
    let renderer: THREE.WebGPURenderer | null = null
    let renderPipeline: THREE.RenderPipeline | null = null
    let resizeObserver: ResizeObserver | null = null

    onStatus({
      phase: 'initializing',
      backend: 'WEBGPU',
      particleCount: 0,
      detail: 'COMPILING TSL',
    })

    const initialize = async () => {
      try {
        renderer = new THREE.WebGPURenderer({
          canvas,
          alpha: false,
          antialias: false,
          powerPreference: 'high-performance',
        })
        renderer.toneMapping = THREE.ACESFilmicToneMapping
        renderer.toneMappingExposure = 1.2

        await renderer.init()
        if (disposed) {
          renderer.dispose()
          renderer = null
          return
        }

        const reportRuntimeFailure = () => {
          if (disposed || !renderer) return
          renderer.setAnimationLoop(null)
          onStatus({
            phase: 'error',
            backend: 'STATIC',
            particleCount: 0,
            detail: 'RENDERER UNAVAILABLE',
          })
        }
        const defaultDeviceLost = renderer.onDeviceLost.bind(renderer)
        const defaultOnError = renderer.onError.bind(renderer)
        renderer.onDeviceLost = (info) => {
          defaultDeviceLost(info)
          reportRuntimeFailure()
        }
        renderer.onError = (message) => {
          defaultOnError(message)
          reportRuntimeFailure()
        }

        const backend = (renderer as unknown as {
          backend?: {isWebGPUBackend?: boolean}
        }).backend
        const nativeWebGPU = backend?.isWebGPUBackend === true
        const tier = getParticleTier(nativeWebGPU)
        const particleCount = tier.count

        const scene = new THREE.Scene()
        scene.background = new THREE.Color('#020207')
        scene.fog = new THREE.FogExp2('#020207', tier.isMobile ? 0.032 : 0.052)

        const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 60)
        camera.position.set(0, 0, 9.4)

        const positions = instancedArray(particleCount, 'vec3')
        const velocities = instancedArray(particleCount, 'vec3')

        const progressUniform = uniform(0)
        const scrollVelocityUniform = uniform(0)
        const pointerUniform = uniform(new THREE.Vector3(100, 100, 0))
        const pointerActiveUniform = uniform(0)
        const timeUniform = uniform(0)
        const deltaUniform = uniform(1 / 60)
        const particleSizeUniform = uniform(tier.isMobile ? 0.058 : 0.044)

        const computeInit = Fn(() => {
          const position = positions.element(instanceIndex)
          const velocity = velocities.element(instanceIndex)
          const seedA = hash(instanceIndex)
          const seedB = hash(instanceIndex.add(11))
          const seedC = hash(instanceIndex.add(23))
          const phi = acos(seedB.mul(2).sub(1))
          const theta = seedA.mul(TWO_PI)
          const radius = seedC.pow(0.55).mul(3.35)

          position.assign(
            vec3(
              sin(phi).mul(cos(theta)),
              cos(phi),
              sin(phi).mul(sin(theta)),
            )
              .mul(radius)
              .add(
                vec3(
                  hash(instanceIndex.add(37)).sub(0.5),
                  hash(instanceIndex.add(41)).sub(0.5),
                  hash(instanceIndex.add(43)).sub(0.5),
                ).mul(0.35),
              ),
          )
          velocity.assign(vec3(0))
        })().compute(particleCount)

        const computeUpdate = Fn(() => {
          const position = positions.element(instanceIndex)
          const velocity = velocities.element(instanceIndex)
          const id = float(instanceIndex)
          const seedA = hash(instanceIndex)
          const seedB = hash(instanceIndex.add(11))
          const seedC = hash(instanceIndex.add(23))
          const seedD = hash(instanceIndex.add(37))
          const seedE = hash(instanceIndex.add(53))
          const seedF = hash(instanceIndex.add(71))

          // State 00 — a breathing cloud that establishes the persistent body.
          const originPhi = acos(seedB.mul(2).sub(1))
          const originTheta = seedA.mul(TWO_PI).add(timeUniform.mul(0.045))
          const originRadius = seedC.pow(0.55).mul(3.25)
          const originPosition = vec3(
            sin(originPhi).mul(cos(originTheta)),
            cos(originPhi),
            sin(originPhi).mul(sin(originTheta)),
          )
            .mul(originRadius)
            .add(
              vec3(
                sin(timeUniform.mul(0.31).add(seedD.mul(TWO_PI))),
                sin(timeUniform.mul(0.27).add(seedE.mul(TWO_PI))),
                cos(timeUniform.mul(0.23).add(seedF.mul(TWO_PI))),
              ).mul(0.11),
            )

          // State 01 — 987 Fibonacci nodes with particles flowing along live edges.
          const nodeIndex = seedA.mul(987).floor()
          const nodeU = nodeIndex.add(0.5).div(987)
          const nodeRadius = sqrt(nodeU).mul(3.15)
          const nodeTheta = nodeIndex.mul(3.883222)
          const nodeCenter = vec3(
            cos(nodeTheta).mul(nodeRadius),
            sin(nodeTheta).mul(nodeRadius).mul(0.68),
            nodeU.oneMinus().mul(0.9).sub(0.2),
          )
          const nodePhi = acos(seedD.mul(2).sub(1))
          const nodeScatterTheta = seedE.mul(TWO_PI)
          const nodeOffset = vec3(
            sin(nodePhi).mul(cos(nodeScatterTheta)),
            cos(nodePhi),
            sin(nodePhi).mul(sin(nodeScatterTheta)),
          ).mul(seedF.mul(0.05).add(0.012))
          const nexusNodePosition = nodeCenter.add(nodeOffset)

          const edgeNodeIndex = nodeIndex.add(seedD.mul(13).floor().add(1)).mod(987)
          const edgeU = edgeNodeIndex.add(0.5).div(987)
          const edgeRadius = sqrt(edgeU).mul(3.15)
          const edgeTheta = edgeNodeIndex.mul(3.883222)
          const edgeCenter = vec3(
            cos(edgeTheta).mul(edgeRadius),
            sin(edgeTheta).mul(edgeRadius).mul(0.68),
            edgeU.oneMinus().mul(0.9).sub(0.2),
          )
          const edgeTravel = seedE
            .add(timeUniform.mul(seedF.mul(0.035).add(0.012)))
            .fract()
          const edgeBow = sin(edgeTravel.mul(PI)).mul(seedC.sub(0.5)).mul(0.25)
          const nexusEdgePosition = mix(nodeCenter, edgeCenter, edgeTravel).add(
            vec3(0, 0, edgeBow),
          )
          const nexusPosition = seedB
            .greaterThan(0.7)
            .select(nexusEdgePosition, nexusNodePosition)

          // State 02 — a central orchestrator and five mechanically-linked gears.
          const gear = float(instanceIndex.mod(6))
          const centralGear = gear.lessThan(0.5)
          const satelliteAngle = gear.sub(1).mul(TWO_PI.div(5)).add(PI.div(2))
          const gearCenter = vec3(
            centralGear.select(float(0), cos(satelliteAngle).mul(2.05)),
            centralGear.select(float(0), sin(satelliteAngle).mul(1.48)),
            0,
          )
          const gearRadius = centralGear.select(float(1.02), gear.mul(0.025).add(0.58))
          const gearTeeth = centralGear.select(float(24), gear.mul(2).add(10))
          const gearDirection = centralGear.select(float(1), float(-1))
          const gearAngle = id
            .mul(0.021)
            .add(seedA.mul(TWO_PI))
            .add(timeUniform.mul(0.22).mul(gearDirection))
          const tooth = cos(gearAngle.mul(gearTeeth)).max(0).pow(16).mul(0.13)
          const ringRadius = gearRadius.add(seedB.sub(0.5).mul(0.2)).add(tooth)
          const gearRingPosition = gearCenter.add(
            vec3(
              cos(gearAngle).mul(ringRadius),
              sin(gearAngle).mul(ringRadius),
              seedC.sub(0.5).mul(0.46),
            ),
          )
          const spokeCount = gearTeeth.mul(0.5)
          const spokeAngle = seedA
            .mul(spokeCount)
            .floor()
            .mul(TWO_PI)
            .div(spokeCount)
            .add(timeUniform.mul(0.22).mul(gearDirection))
          const spokeRadius = seedB.mul(gearRadius)
          const gearSpokePosition = gearCenter.add(
            vec3(
              cos(spokeAngle).mul(spokeRadius),
              sin(spokeAngle).mul(spokeRadius),
              seedC.sub(0.5).mul(0.18),
            ),
          )
          const machinePosition = seedD
            .greaterThan(0.78)
            .select(gearSpokePosition, gearRingPosition)

          // State 03 — stacked market signals, each with a distinct frequency.
          const signalLaneIndex = seedA.mul(13).floor()
          const signalLane = signalLaneIndex.sub(6)
          const signalX = seedB.sub(0.5).mul(7.2)
          const signalFrequency = signalLaneIndex.mod(5).mul(0.34).add(1.05)
          const signalAmplitude = signalLaneIndex.mod(3).mul(0.07).add(0.13)
          const signalWave = sin(
            signalX
              .mul(signalFrequency)
              .add(timeUniform.mul(signalLaneIndex.mod(4).mul(0.16).add(0.48)))
              .add(signalLane.mul(0.61)),
          ).mul(signalAmplitude)
          const signalPosition = vec3(
            signalX,
            signalLane.mul(0.32).add(signalWave),
            seedE
              .sub(0.5)
              .mul(0.32)
              .add(sin(signalX.mul(0.4).add(signalLane)).mul(0.12)),
          )

          // State 04 — all particles become a 2D portal membrane and its rim.
          const gridU = float(instanceIndex.mod(tier.side)).div(tier.side - 1)
          const gridV = id.div(tier.side).floor().div(tier.side - 1)
          const portalAngle = gridU.mul(TWO_PI)
          const portalRadius = sqrt(gridV).mul(2.78)
          const portalX = cos(portalAngle).mul(portalRadius)
          const portalY = sin(portalAngle).mul(portalRadius)
          const portalFalloff = gridV.oneMinus()
          const pointerDistance = vec2(portalX, portalY).sub(pointerUniform.xy).length()
          const pointerRipple = sin(
            pointerDistance.mul(8).sub(timeUniform.mul(4)),
          )
            .mul(smoothstep(0, 2.2, pointerDistance).oneMinus())
            .mul(pointerActiveUniform)
            .mul(0.34)
          const membraneZ = gridV
            .oneMinus()
            .mul(-0.72)
            .add(
              sin(
                portalRadius
                  .mul(6)
                  .sub(timeUniform.mul(1.9))
                  .add(portalAngle.mul(3)),
              )
                .mul(0.18)
                .mul(portalFalloff),
            )
            .add(pointerRipple.mul(portalFalloff))
          const portalMembranePosition = vec3(portalX, portalY, membraneZ)
          const tubeAngle = gridV
            .sub(0.82)
            .div(0.18)
            .mul(TWO_PI)
            .add(seedA.mul(0.3))
          const portalRingRadius = cos(tubeAngle).mul(0.19).add(2.67)
          const portalRingPosition = vec3(
            cos(portalAngle).mul(portalRingRadius),
            sin(portalAngle).mul(portalRingRadius),
            sin(tubeAngle).mul(0.24),
          )
          const portalPosition = gridV
            .greaterThan(0.82)
            .select(portalRingPosition, portalMembranePosition)

          // State 05 — a pentagram, three card frames and an orbital star field.
          const starSegment = seedA.mul(5).floor()
          const starStartAngle = starSegment.mul(TWO_PI.div(5)).add(PI.div(2))
          const starEndAngle = starSegment
            .add(2)
            .mul(TWO_PI.div(5))
            .add(PI.div(2))
          const starStart = vec3(
            cos(starStartAngle).mul(2.2),
            sin(starStartAngle).mul(2.2),
            seedC.sub(0.5).mul(0.18),
          )
          const starEnd = vec3(
            cos(starEndAngle).mul(2.2),
            sin(starEndAngle).mul(2.2),
            seedC.sub(0.5).mul(0.18),
          )
          const tarotStarPosition = mix(starStart, starEnd, seedB)

          const cardIndex = seedA.mul(3).floor().sub(1)
          const cardEdge = seedB.mul(4).floor()
          const cardEdgeT = seedC
          const cardX = cardEdge.lessThan(0.5).select(
            cardEdgeT.mul(1.4).sub(0.7),
            cardEdge.lessThan(1.5).select(
              float(0.7),
              cardEdge.lessThan(2.5).select(
                float(0.7).sub(cardEdgeT.mul(1.4)),
                float(-0.7),
              ),
            ),
          )
          const cardY = cardEdge.lessThan(0.5).select(
            float(1.15),
            cardEdge.lessThan(1.5).select(
              float(1.15).sub(cardEdgeT.mul(2.3)),
              cardEdge.lessThan(2.5).select(
                float(-1.15),
                cardEdgeT.mul(2.3).sub(1.15),
              ),
            ),
          )
          const cardRotation = cardIndex.mul(0.11)
          const cardRotatedX = cardX
            .mul(cos(cardRotation))
            .sub(cardY.mul(sin(cardRotation)))
          const cardRotatedY = cardX
            .mul(sin(cardRotation))
            .add(cardY.mul(cos(cardRotation)))
          const tarotCardPosition = vec3(
            cardRotatedX.add(cardIndex.mul(1.72)),
            cardRotatedY,
            seedE.sub(0.5).mul(0.15),
          )

          const orbitAngle = seedA.mul(TWO_PI).add(timeUniform.mul(0.1))
          const orbitRadius = seedB.mul(2.4).add(1.35)
          const tarotOrbitPosition = vec3(
            cos(orbitAngle).mul(orbitRadius),
            sin(orbitAngle).mul(orbitRadius).mul(0.66),
            sin(orbitAngle.mul(3)).mul(0.34).add(seedC.sub(0.5).mul(0.3)),
          )
          const tarotPosition = seedD.lessThan(0.48).select(
            tarotStarPosition,
            seedD.lessThan(0.84).select(tarotCardPosition, tarotOrbitPosition),
          )

          const phase = progressUniform.floor()
          const localProgress = progressUniform.fract()
          const staggeredProgress = smoothstep(
            0,
            1,
            localProgress.mul(1.18).sub(seedF.mul(0.18)),
          )

          const fromTarget = phase.lessThan(0.5).select(
            originPosition,
            phase.lessThan(1.5).select(
              signalPosition,
              phase.lessThan(2.5).select(
                portalPosition,
                phase.lessThan(3.5).select(
                  nexusPosition,
                  phase.lessThan(4.5).select(machinePosition, tarotPosition),
                ),
              ),
            ),
          )
          const toTarget = phase.lessThan(0.5).select(
            signalPosition,
            phase.lessThan(1.5).select(
              portalPosition,
              phase.lessThan(2.5).select(
                nexusPosition,
                phase.lessThan(3.5).select(machinePosition, tarotPosition),
              ),
            ),
          )
          const target = mix(fromTarget, toTarget, staggeredProgress)
          const energy = scrollVelocityUniform.abs().min(5)
          const springStrength = energy.mul(0.65).add(7.4)

          velocity.addAssign(
            target.sub(position).mul(springStrength).mul(deltaUniform),
          )

          const curl = vec3(
            sin(position.y.mul(1.7).add(timeUniform).add(seedA.mul(TWO_PI))),
            sin(
              position.z
                .mul(1.4)
                .sub(timeUniform.mul(0.7))
                .add(seedB.mul(TWO_PI)),
            ),
            sin(
              position.x
                .mul(1.55)
                .add(timeUniform.mul(0.83))
                .add(seedC.mul(TWO_PI)),
            ),
          )
          velocity.addAssign(
            curl.mul(deltaUniform).mul(energy.mul(0.12).add(0.08)),
          )

          const scrollSwirl = vec3(position.y.negate(), position.x, position.z.mul(0.1))
            .add(vec3(0.0001))
            .normalize()
            .mul(scrollVelocityUniform)
            .mul(deltaUniform)
            .mul(0.15)
          velocity.addAssign(scrollSwirl)

          const pointerDelta = position.sub(pointerUniform)
          const pointerDistance3d = pointerDelta.length()
          const pointerInfluence = smoothstep(0, 2, pointerDistance3d).oneMinus()
          velocity.addAssign(
            pointerDelta
              .add(vec3(0.001))
              .normalize()
              .mul(pointerInfluence)
              .mul(pointerActiveUniform)
              .mul(deltaUniform)
              .mul(3.2),
          )

          const machineWeight = progressUniform.sub(4).abs().min(1).oneMinus()
          const tarotWeight = progressUniform.sub(5).abs().min(1).oneMinus()
          velocity.addAssign(
            vec3(position.y.negate(), position.x, 0)
              .add(vec3(0.0001))
              .normalize()
              .mul(machineWeight.mul(0.025).add(tarotWeight.mul(0.018)))
              .mul(deltaUniform),
          )

          const damping = float(1)
            .sub(deltaUniform.mul(float(4.7).sub(energy.min(1).mul(1.8))))
            .max(0.78)
          velocity.mulAssign(damping)

          const speed = velocity.length()
          velocity.assign(
            speed
              .greaterThan(5)
              .select(velocity.add(vec3(0.0001)).normalize().mul(5), velocity),
          )
          position.addAssign(velocity.mul(deltaUniform))
        })().compute(particleCount)

        const material = new THREE.SpriteNodeMaterial()
        const renderSeedA = hash(instanceIndex)
        const renderSeedB = hash(instanceIndex.add(11))
        const renderSeedC = hash(instanceIndex.add(37))
        const renderPhase = progressUniform.floor()
        const renderTransition = smoothstep(0, 1, progressUniform.fract())

        const originColor = mix(
          vec3(0.333, 0.259, 0.651),
          vec3(0.624, 0.992, 0.957),
          renderSeedA,
        )
        const nexusColor = mix(
          vec3(0.031, 0.169, 0.192),
          vec3(0.306, 1, 0.937),
          renderSeedA.pow(0.42),
        )
        const machineBaseColor = mix(
          vec3(0.145, 0.165, 0.192),
          vec3(0.957, 0.722, 0.353),
          renderSeedB.pow(2.8),
        )
        const machineColor = renderSeedC
          .greaterThan(0.94)
          .select(vec3(0.188, 0.933, 0.569), machineBaseColor)
        const signalColor = mix(
          vec3(0.075, 0.843, 0.918),
          vec3(0.937, 0.329, 1),
          renderSeedC,
        )
        const portalBaseColor = mix(
          vec3(0.086, 0.49, 1),
          vec3(0.847, 0.953, 0.29),
          renderSeedB.pow(2),
        )
        const portalColor = renderSeedC
          .greaterThan(0.965)
          .select(vec3(1), portalBaseColor)
        const tarotColor = mix(
          vec3(0.506, 0.455, 0.718),
          vec3(0.804, 0.667, 0.408),
          renderSeedA.pow(0.72),
        )

        const fromColor = renderPhase.lessThan(0.5).select(
          originColor,
          renderPhase.lessThan(1.5).select(
            signalColor,
            renderPhase.lessThan(2.5).select(
              portalColor,
              renderPhase.lessThan(3.5).select(
                nexusColor,
                renderPhase.lessThan(4.5).select(machineColor, tarotColor),
              ),
            ),
          ),
        )
        const toColor = renderPhase.lessThan(0.5).select(
          signalColor,
          renderPhase.lessThan(1.5).select(
            portalColor,
            renderPhase.lessThan(2.5).select(
              nexusColor,
              renderPhase.lessThan(3.5).select(machineColor, tarotColor),
            ),
          ),
        )
        material.positionNode = positions.toAttribute()
        material.scaleNode = particleSizeUniform.mul(
          renderSeedB.pow(8).mul(1.8).add(0.52),
        )
        material.colorNode = mix(fromColor, toColor, renderTransition)
        const particleShape = shapeCircle() as unknown as ReturnType<typeof float>
        material.opacityNode = particleShape.mul(renderSeedC.mul(0.32).add(0.18))
        material.transparent = true
        material.alphaToCoverage = true
        material.depthWrite = false
        material.blending = THREE.AdditiveBlending

        const particles = new THREE.Sprite(material)
        particles.count = particleCount
        particles.frustumCulled = false
        scene.add(particles)

        renderer.compute(computeInit)

        if (nativeWebGPU && !tier.isMobile && tier.side >= 560) {
          renderPipeline = new THREE.RenderPipeline(renderer)
          const scenePass = pass(scene, camera)
          const sceneColor = scenePass.getTextureNode('output')
          const bloomPass = bloom(sceneColor, 0.42, 0.25, 0.42)
          bloomPass.setResolutionScale(0.35)
          renderPipeline.outputNode = sceneColor.add(bloomPass)
        }

        const resize = () => {
          if (!renderer || disposed) return
          const parent = canvas.parentElement
          const width = Math.max(1, parent?.clientWidth || window.innerWidth)
          const height = Math.max(1, parent?.clientHeight || window.innerHeight)
          const pixelRatio = Math.min(window.devicePixelRatio, tier.isMobile ? 1 : 1.4)

          camera.aspect = width / height
          camera.position.z = Math.max(9.4, 8.7 / camera.aspect)
          camera.updateProjectionMatrix()
          renderer.setPixelRatio(pixelRatio)
          renderer.setSize(width, height, false)
        }

        resizeObserver = new ResizeObserver(resize)
        if (canvas.parentElement) resizeObserver.observe(canvas.parentElement)
        resize()

        let elapsed = 0
        let previous = performance.now()
        let renderedProgress = motion.progress.current
        let renderedVelocity = 0
        const pointerWorld = new THREE.Vector3(100, 100, 0)

        renderer.setAnimationLoop(() => {
          if (!renderer || disposed) return

          const now = performance.now()
          const delta = Math.min(Math.max((now - previous) / 1000, 1 / 240), 1 / 30)
          previous = now
          elapsed += delta

          renderedProgress = THREE.MathUtils.damp(
            renderedProgress,
            motion.progress.current,
            7.5,
            delta,
          )
          renderedVelocity = THREE.MathUtils.damp(
            renderedVelocity,
            motion.velocity.current,
            5,
            delta,
          )

          const pointerState = motion.pointer.current
          const viewHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * camera.position.z
          const viewWidth = viewHeight * camera.aspect
          pointerWorld.set(
            pointerState.x * viewWidth * 0.5,
            pointerState.y * viewHeight * 0.5,
            0,
          )

          progressUniform.value = renderedProgress
          scrollVelocityUniform.value = renderedVelocity
          pointerUniform.value.copy(pointerWorld)
          pointerActiveUniform.value = pointerState.active
          timeUniform.value = elapsed
          deltaUniform.value = delta

          camera.position.x = THREE.MathUtils.damp(
            camera.position.x,
            pointerState.x * 0.16,
            3,
            delta,
          )
          camera.position.y = THREE.MathUtils.damp(
            camera.position.y,
            pointerState.y * 0.1,
            3,
            delta,
          )
          camera.lookAt(0, 0, 0)

          renderer.compute(computeUpdate)
          if (renderPipeline) renderPipeline.render()
          else renderer.render(scene, camera)
        })

        onStatus({
          phase: 'ready',
          backend: nativeWebGPU ? 'WEBGPU' : 'WEBGL2',
          particleCount,
          detail: tier.detail,
        })
      } catch (error) {
        console.error('Matter Reel renderer failed to initialize', error)
        renderPipeline?.dispose()
        renderPipeline = null
        if (renderer) {
          renderer.setAnimationLoop(null)
          renderer.dispose()
          renderer = null
        }
        if (!disposed) {
          onStatus({
            phase: 'error',
            backend: 'STATIC',
            particleCount: 0,
            detail: 'RENDERER UNAVAILABLE',
          })
        }
      }
    }

    initialize()

    return () => {
      disposed = true
      resizeObserver?.disconnect()
      renderPipeline?.dispose()
      if (renderer) {
        renderer.setAnimationLoop(null)
        renderer.dispose()
      }
    }
  }, [disabled, motion, onStatus])

  if (disabled) return null

  return <canvas ref={canvasRef} className="matter-reel__canvas" aria-hidden="true" />
}
