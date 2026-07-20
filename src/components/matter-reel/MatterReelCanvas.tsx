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

          // State 02 — a deep woven field of flowing ribbons.
          const machineLaneIndex = seedA.mul(17).floor()
          const machineLane = machineLaneIndex.sub(8)
          const machineX = seedB
            .sub(0.5)
            .mul(7.2)
            .add(sin(machineLane.mul(0.8)).mul(0.1))
          const machinePrimaryWave = sin(
            machineX
              .mul(machineLaneIndex.mod(4).mul(0.16).add(0.78))
              .add(machineLane.mul(0.58))
              .add(timeUniform.mul(0.46)),
          ).mul(machineLaneIndex.mod(3).mul(0.045).add(0.16))
          const machineSecondaryWave = sin(
            machineX
              .mul(2.15)
              .sub(timeUniform.mul(0.3))
              .add(machineLane.mul(0.91)),
          ).mul(0.055)
          const machinePosition = vec3(
            machineX,
            machineLane
              .mul(0.225)
              .add(machinePrimaryWave)
              .add(machineSecondaryWave)
              .add(seedE.sub(0.5).mul(0.025)),
            sin(
              machineX
                .mul(0.72)
                .sub(timeUniform.mul(0.22))
                .add(machineLane.mul(0.48)),
            )
              .mul(0.34)
              .add(seedC.sub(0.5).mul(0.08)),
          )

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

          // State 05 — one slowly rotating faceted diamond.
          const diamondFace = seedA.mul(8).floor()
          const diamondTopFace = diamondFace.lessThan(4)
          const diamondSide = diamondFace.mod(4)
          const diamondAngle = diamondSide.mul(PI.div(2)).add(PI.div(4))
          const diamondNextAngle = diamondAngle.add(PI.div(2))
          const diamondApex = vec3(
            0,
            diamondTopFace.select(float(2.72), float(-2.72)),
            0,
          )
          const diamondEdgeA = vec3(
            cos(diamondAngle).mul(2.08),
            0,
            sin(diamondAngle).mul(2.08),
          )
          const diamondEdgeB = vec3(
            cos(diamondNextAngle).mul(2.08),
            0,
            sin(diamondNextAngle).mul(2.08),
          )
          const diamondSurfaceRadius = sqrt(seedB)
          const diamondSurfacePosition = diamondApex
            .mul(diamondSurfaceRadius.oneMinus())
            .add(
              diamondEdgeA
                .mul(diamondSurfaceRadius.mul(seedC.oneMinus()))
                .add(diamondEdgeB.mul(diamondSurfaceRadius.mul(seedC))),
            )

          const diamondLine = seedA.mul(12).floor()
          const diamondLineSide = diamondLine.mod(4)
          const diamondLineAngle = diamondLineSide.mul(PI.div(2)).add(PI.div(4))
          const diamondLineNextAngle = diamondLineAngle.add(PI.div(2))
          const diamondLineVertex = vec3(
            cos(diamondLineAngle).mul(2.08),
            0,
            sin(diamondLineAngle).mul(2.08),
          )
          const diamondLineNextVertex = vec3(
            cos(diamondLineNextAngle).mul(2.08),
            0,
            sin(diamondLineNextAngle).mul(2.08),
          )
          const diamondLineStart = diamondLine.lessThan(4).select(
            vec3(0, 2.72, 0),
            diamondLine.lessThan(8).select(vec3(0, -2.72, 0), diamondLineVertex),
          )
          const diamondLineEnd = diamondLine
            .lessThan(8)
            .select(diamondLineVertex, diamondLineNextVertex)
          const diamondEdgePosition = mix(diamondLineStart, diamondLineEnd, seedB)
          const diamondPosition = seedD
            .lessThan(0.78)
            .select(diamondSurfacePosition, diamondEdgePosition)

          const diamondSpin = timeUniform.mul(0.16)
          const diamondTilt = float(0.28).add(sin(timeUniform.mul(0.11)).mul(0.06))
          const diamondRotatedX = diamondPosition.x
            .mul(cos(diamondSpin))
            .sub(diamondPosition.z.mul(sin(diamondSpin)))
          const diamondRotatedZ = diamondPosition.x
            .mul(sin(diamondSpin))
            .add(diamondPosition.z.mul(cos(diamondSpin)))
          const editorPosition = vec3(
            diamondRotatedX,
            diamondPosition.y
              .mul(cos(diamondTilt))
              .sub(diamondRotatedZ.mul(sin(diamondTilt))),
            diamondPosition.y
              .mul(sin(diamondTilt))
              .add(diamondRotatedZ.mul(cos(diamondTilt))),
          ).add(vec3(seedE.sub(0.5), seedF.sub(0.5), seedC.sub(0.5)).mul(0.025))

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
                  phase.lessThan(4.5).select(machinePosition, editorPosition),
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
                phase.lessThan(3.5).select(machinePosition, editorPosition),
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
          const editorWeight = progressUniform.sub(5).abs().min(1).oneMinus()
          velocity.addAssign(
            vec3(position.y.negate(), position.x, 0)
              .add(vec3(0.0001))
              .normalize()
              .mul(machineWeight.mul(0.025).add(editorWeight.mul(0.008)))
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
        const renderEditorWeight = progressUniform.sub(5).abs().min(1).oneMinus()

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
        const editorBaseColor = mix(
          vec3(0.075, 0.435, 0.98),
          vec3(0.94, 0.18, 0.66),
          renderSeedA.pow(0.72),
        )
        const editorColor = renderSeedC
          .greaterThan(0.985)
          .select(vec3(0.82, 1, 0.96), editorBaseColor)

        const fromColor = renderPhase.lessThan(0.5).select(
          originColor,
          renderPhase.lessThan(1.5).select(
            signalColor,
            renderPhase.lessThan(2.5).select(
              portalColor,
              renderPhase.lessThan(3.5).select(
                nexusColor,
                renderPhase.lessThan(4.5).select(machineColor, editorColor),
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
              renderPhase.lessThan(3.5).select(machineColor, editorColor),
            ),
          ),
        )
        material.positionNode = positions.toAttribute()
        material.scaleNode = particleSizeUniform.mul(
          renderSeedB.pow(8).mul(1.8).add(0.52),
        ).mul(float(1).sub(renderEditorWeight.mul(0.24)))
        material.colorNode = mix(fromColor, toColor, renderTransition)
        const particleShape = shapeCircle() as unknown as ReturnType<typeof float>
        material.opacityNode = particleShape
          .mul(renderSeedC.mul(0.32).add(0.18))
          .mul(float(1).sub(renderEditorWeight.mul(0.62)))
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
